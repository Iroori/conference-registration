package com.roo.payment.domain.user.service;

import com.roo.payment.common.exception.BusinessException;
import com.roo.payment.common.exception.ErrorCode;
import com.roo.payment.config.AppProperties;
import com.roo.payment.domain.iasbse.service.IasbseMemberService;
import com.roo.payment.domain.user.dto.*;
import com.roo.payment.domain.user.entity.EmailVerification;
import com.roo.payment.domain.user.entity.MemberType;
import com.roo.payment.domain.user.entity.RefreshToken;
import com.roo.payment.domain.user.entity.User;
import com.roo.payment.domain.user.repository.EmailVerificationRepository;
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

import java.security.SecureRandom;
import java.time.Instant;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class AuthService {

    private final UserRepository              userRepository;
    private final EmailVerificationRepository verificationRepository;
    private final RefreshTokenRepository      refreshTokenRepository;
    private final IasbseMemberService         iasbseMemberService;
    private final PasswordEncoder             passwordEncoder;
    private final JwtTokenProvider            jwtTokenProvider;
    private final AuthenticationManager       authenticationManager;
    private final EmailService                emailService;
    private final AppProperties               appProperties;
    private final SecurityAuditService        auditService;
    private final SecureRandom                random = new SecureRandom();

    public AuthService(UserRepository userRepository,
                       EmailVerificationRepository verificationRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       IasbseMemberService iasbseMemberService,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider jwtTokenProvider,
                       AuthenticationManager authenticationManager,
                       EmailService emailService,
                       AppProperties appProperties,
                       SecurityAuditService auditService) {
        this.userRepository       = userRepository;
        this.verificationRepository = verificationRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.iasbseMemberService  = iasbseMemberService;
        this.passwordEncoder      = passwordEncoder;
        this.jwtTokenProvider     = jwtTokenProvider;
        this.authenticationManager = authenticationManager;
        this.emailService         = emailService;
        this.appProperties        = appProperties;
        this.auditService         = auditService;
    }

    // ─── Signup ──────────────────────────────────────────────────────────────

    @Transactional
    public void signup(SignupRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        MemberType memberType;
        if (iasbseMemberService.isIasbseMember(req.email())) {
            memberType = MemberType.MEMBER;
        } else {
            int age = java.time.Period.between(req.birthDate(), java.time.LocalDate.now()).getYears();
            memberType = age <= 35 ? MemberType.NON_MEMBER : MemberType.NON_MEMBER_PLUS;
        }

        User user = new User(
                req.email(),
                passwordEncoder.encode(req.password()),
                req.nameKr(),
                req.nameEn(),
                req.affiliation(),
                req.position(),
                req.country(),
                req.phone(),
                req.birthDate(),
                memberType
        );
        userRepository.save(user);
        sendVerificationCode(req.email());
        auditService.log("SIGNUP", req.email(), memberType.name());
    }

    // ─── Email Verification ──────────────────────────────────────────────────

    @Transactional
    public void sendVerificationCode(String email) {
        String code = generateCode();
        int expirationMinutes = appProperties.getEmailVerification().getExpirationMinutes();
        verificationRepository.save(new EmailVerification(email, code, expirationMinutes));
        emailService.sendVerificationCode(email, code, expirationMinutes);
    }

    @Transactional
    public void verifyEmail(EmailVerifyRequest req) {
        User user = userRepository.findByEmailAndActiveTrue(req.email())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (user.isEmailVerified()) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_VERIFIED);
        }

        EmailVerification verification = verificationRepository
                .findTopByEmailAndUsedFalseOrderByIdDesc(req.email())
                .orElseThrow(() -> new BusinessException(ErrorCode.VERIFICATION_CODE_INVALID));

        if (verification.isExpired()) {
            throw new BusinessException(ErrorCode.VERIFICATION_CODE_EXPIRED);
        }
        if (!verification.isValid(req.code())) {
            throw new BusinessException(ErrorCode.VERIFICATION_CODE_INVALID);
        }

        verification.markUsed();
        user.verifyEmail();
        auditService.log("EMAIL_VERIFIED", req.email());
    }

    // ─── Login ───────────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse login(LoginRequest req) {
        String email = req.email().toLowerCase();

        // Spring Security 인증 (password 검증 + enabled 확인)
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, req.password())
            );
        } catch (DisabledException e) {
            // emailVerified=false → 이메일 미인증
            auditService.log("LOGIN_FAILED_UNVERIFIED", email);
            throw new BusinessException(ErrorCode.EMAIL_NOT_VERIFIED);
        } catch (AuthenticationException e) {
            // 비밀번호 불일치, 계정 없음 등 → 동일한 오류 메시지로 통일 (사용자 열거 방지)
            auditService.log("LOGIN_FAILED", email);
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }

        User user = userRepository.findByEmailAndActiveTrue(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        String accessToken  = jwtTokenProvider.generateToken(user.getEmail(), user.getMemberType().name());
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

        // Refresh Token Rotation — 기존 토큰 삭제 후 새 토큰 발급
        refreshTokenRepository.delete(stored);
        String newAccessToken  = jwtTokenProvider.generateToken(user.getEmail(), user.getMemberType().name());
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

    private String generateCode() {
        return String.format("%06d", random.nextInt(1_000_000));
    }
}
