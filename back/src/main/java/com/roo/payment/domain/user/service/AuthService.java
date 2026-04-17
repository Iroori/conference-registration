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
            memberType = age <= 35 ? MemberType.YOUNG_ENGINEER : MemberType.NON_MEMBER;
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
                memberType,
                Boolean.TRUE.equals(req.isPresenter())
        );
        userRepository.save(user);
        emailService.sendAndStoreCode(req.email());  // 인증 코드 발송 (인메모리 저장)
        auditService.log("SIGNUP", req.email(), memberType.name());
    }

    // ─── Email Verification ──────────────────────────────────────────────────

    /**
     * 인증 코드 재발송 (EmailService의 인메모리 저장소에 덮어쓰기)
     */
    @Transactional
    public void sendVerificationCode(String email) {
        emailService.sendAndStoreCode(email);
    }

    /**
     * 인증 코드 확인 → 유효 시 User.emailVerified = true 처리
     */
    @Transactional
    public void verifyEmail(EmailVerifyRequest req) {
        User user = userRepository.findByEmailAndActiveTrue(req.email())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (user.isEmailVerified()) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_VERIFIED);
        }

        // 코드 검증 (만료/불일치 시 BusinessException 발생)
        emailService.verifyCode(req.email(), req.code());

        user.verifyEmail();
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
