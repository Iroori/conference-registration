package com.roo.payment.domain.user.service;

import com.roo.payment.common.exception.BusinessException;
import com.roo.payment.common.exception.ErrorCode;
import com.roo.payment.config.AppProperties;
import com.roo.payment.domain.iasbse.service.IasbseMemberService;
import com.roo.payment.domain.user.dto.*;
import com.roo.payment.domain.user.entity.MemberType;
import com.roo.payment.domain.user.entity.RefreshToken;
import com.roo.payment.domain.user.entity.User;
import com.roo.payment.domain.user.repository.RefreshTokenRepository;
import com.roo.payment.domain.user.repository.UserRepository;
import com.roo.payment.security.JwtTokenProvider;
import com.roo.payment.security.SecurityAuditService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class AuthService {

    private final UserRepository         userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final IasbseMemberService    iasbseMemberService;
    private final PasswordEncoder        passwordEncoder;
    private final JwtTokenProvider       jwtTokenProvider;
    private final AuthenticationManager  authenticationManager;
    private final EmailService           emailService;
    private final AppProperties          appProperties;
    private final SecurityAuditService   auditService;

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       IasbseMemberService iasbseMemberService,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider jwtTokenProvider,
                       AuthenticationManager authenticationManager,
                       EmailService emailService,
                       AppProperties appProperties,
                       SecurityAuditService auditService) {
        this.userRepository        = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.iasbseMemberService   = iasbseMemberService;
        this.passwordEncoder       = passwordEncoder;
        this.jwtTokenProvider      = jwtTokenProvider;
        this.authenticationManager = authenticationManager;
        this.emailService          = emailService;
        this.appProperties         = appProperties;
        this.auditService          = auditService;
    }

    // ─── Signup ──────────────────────────────────────────────────────────────

    /**
     * 회원가입. 이메일 인증이 선행되어야만 User 레코드가 생성된다.
     *
     * 선행 조건:
     *   1) /auth/send-code 로 인증 코드 수신
     *   2) /auth/verify-code 로 소유권 확인 (EmailService.verifiedEmails 에 기록됨)
     *   3) 20분 이내 /auth/signup 호출
     *
     * @throws BusinessException EMAIL_ALREADY_EXISTS  — 중복 이메일
     * @throws BusinessException EMAIL_NOT_VERIFIED    — 인증 이력 없음/만료
     */
    @Transactional
    public void signup(SignupRequest req) {
        if (!emailService.isRecentlyVerified(req.email())) {
            throw new BusinessException(ErrorCode.EMAIL_NOT_VERIFIED);
        }
        if (userRepository.existsByEmail(req.email())) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        // IABSE 회원 여부를 최우선으로 검증. 엑셀에 있으면 만 나이에 상관없이 MEMBER
        int age = java.time.Period.between(req.birthDate(), java.time.LocalDate.now()).getYears();
        MemberType memberType;
        if (iasbseMemberService.isIasbseMember(req.firstName(), req.lastName(), req.affiliation())) {
            memberType = MemberType.MEMBER;
        } else if (age <= 35) {
            memberType = MemberType.YOUNG_ENGINEER;
        } else {
            memberType = MemberType.NON_MEMBER;
        }

        if (req.dietaryRequirement() == com.roo.payment.domain.user.entity.DietaryRequirement.OTHER
                && (req.dietaryNote() == null || req.dietaryNote().isBlank())) {
            throw new BusinessException(ErrorCode.INVALID_INPUT,
                    "식단 요구사항으로 Other 를 선택한 경우 상세 내용을 입력해 주세요.");
        }

        User user = new User(
                req.email(),
                passwordEncoder.encode(req.password()),
                req.lastName(),
                req.firstName(),
                req.affiliation(),
                req.position(),
                req.country(),
                req.phone(),
                req.birthDate(),
                memberType,
                Boolean.TRUE.equals(req.isPresenter())
        );
        user.assignDietaryRequirement(req.dietaryRequirement(), req.dietaryNote());
        user.verifyEmail();                               // 인증 선행 완료이므로 emailVerified=true
        userRepository.save(user);
        emailService.consumeVerified(req.email());        // 인증 이력 1회용 소비
        auditService.log("SIGNUP", req.email(), memberType.name());
    }

    // ─── Email Verification (가입 전 단계) ────────────────────────────────────

    /**
     * 인증 코드 발송 또는 재발송.
     * - 이미 가입된 이메일은 `EMAIL_ALREADY_EXISTS` 반환 (BUG-B 보안)
     * - 동일 이메일 30초 이내 재요청은 `VERIFICATION_CODE_COOLDOWN` (BUG-D)
     */
    @Transactional
    public void sendVerificationCode(String email) {
        if (userRepository.existsByEmail(email)) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }
        emailService.sendAndStoreCode(email);
    }

    /**
     * 가입 전 이메일 소유권 확인.
     * 성공 시 EmailService.verifiedEmails 에 20분 TTL로 기록된다.
     */
    @Transactional
    public void verifyCode(VerifyCodeRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }
        emailService.verifyCode(req.email(), req.code());
        auditService.log("EMAIL_VERIFIED", req.email());
    }

    // ─── Login ───────────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse login(LoginRequest req) {
        String email = req.email().toLowerCase();

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, req.password())
            );
        } catch (DisabledException e) {
            auditService.log("LOGIN_FAILED_UNVERIFIED", email);
            throw new BusinessException(ErrorCode.EMAIL_NOT_VERIFIED);
        } catch (AuthenticationException e) {
            auditService.log("LOGIN_FAILED", email);
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }

        User user = userRepository.findByEmailAndActiveTrue(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        String accessToken  = jwtTokenProvider.generateToken(user.getEmail(), user.getMemberType().name(), user.isAdmin());
        String refreshToken = issueRefreshToken(user.getEmail());

        auditService.log("LOGIN_SUCCESS", email);
        return AuthResponse.of(accessToken, refreshToken, user);
    }

    // ─── Token Refresh ───────────────────────────────────────────────────────

    @Transactional
    public AuthResponse refresh(RefreshRequest req) {
        RefreshToken stored = refreshTokenRepository.findByToken(req.refreshToken())
                .orElseThrow(() -> new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID));

        if (stored.isExpired()) {
            refreshTokenRepository.delete(stored);
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_EXPIRED);
        }

        User user = userRepository.findByEmailAndActiveTrue(stored.getUserEmail())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        refreshTokenRepository.delete(stored);
        String newAccessToken  = jwtTokenProvider.generateToken(user.getEmail(), user.getMemberType().name(), user.isAdmin());
        String newRefreshToken = issueRefreshToken(user.getEmail());

        auditService.log("TOKEN_REFRESH", user.getEmail());
        return AuthResponse.of(newAccessToken, newRefreshToken, user);
    }

    // ─── Logout ──────────────────────────────────────────────────────────────

    @Transactional
    public void logout(LogoutRequest req) {
        refreshTokenRepository.findByToken(req.refreshToken())
                .ifPresent(rt -> {
                    auditService.log("LOGOUT", rt.getUserEmail());
                    refreshTokenRepository.delete(rt);
                });
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    private String issueRefreshToken(String email) {
        String tokenValue = UUID.randomUUID().toString().replace("-", "");
        long refreshExpirationMs = appProperties.getJwt().getRefreshExpirationMs();
        RefreshToken rt = new RefreshToken(email, tokenValue,
                Instant.now().plusMillis(refreshExpirationMs));
        refreshTokenRepository.save(rt);
        return tokenValue;
    }
}
