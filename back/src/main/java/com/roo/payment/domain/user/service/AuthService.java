package com.roo.payment.domain.user.service;

import com.roo.payment.common.exception.BusinessException;
import com.roo.payment.common.exception.ErrorCode;
import com.roo.payment.config.AppProperties;
import com.roo.payment.domain.iasbse.service.IasbseMemberService;
import com.roo.payment.domain.user.dto.*;
import com.roo.payment.domain.user.entity.EmailVerification;
import com.roo.payment.domain.user.entity.MemberType;
import com.roo.payment.domain.user.entity.User;
import com.roo.payment.domain.user.repository.EmailVerificationRepository;
import com.roo.payment.domain.user.repository.UserRepository;
import com.roo.payment.security.JwtTokenProvider;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;

@Service
@Transactional(readOnly = true)
public class AuthService {

    private final UserRepository userRepository;
    private final EmailVerificationRepository verificationRepository;
    private final IasbseMemberService iasbseMemberService;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;
    private final AppProperties appProperties;
    private final SecureRandom random = new SecureRandom();

    public AuthService(UserRepository userRepository,
                       EmailVerificationRepository verificationRepository,
                       IasbseMemberService iasbseMemberService,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider jwtTokenProvider,
                       AuthenticationManager authenticationManager,
                       EmailService emailService,
                       AppProperties appProperties) {
        this.userRepository = userRepository;
        this.verificationRepository = verificationRepository;
        this.iasbseMemberService = iasbseMemberService;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.authenticationManager = authenticationManager;
        this.emailService = emailService;
        this.appProperties = appProperties;
    }

    /**
     * 회원가입
     * 1. 이메일 중복 확인
     * 2. IASBSE 회원 여부 → MemberType 결정
     * 3. User 저장
     * 4. 이메일 인증 코드 발송
     */
    @Transactional
    public void signup(SignupRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        // IASBSE 회원 여부 → MemberType 결정
        MemberType memberType;
        if (iasbseMemberService.isIasbseMember(req.email())) {
            memberType = MemberType.MEMBER;
        } else {
            // 만 나이 계산: 생년월일 기준
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

        // 이메일 인증 코드 발송
        sendVerificationCode(req.email());
    }

    /**
     * 이메일 인증 코드 발송
     */
    @Transactional
    public void sendVerificationCode(String email) {
        // 기존 미사용 코드 무효화 → 새 코드 생성
        String code = generateCode();
        int expirationMinutes = appProperties.getEmailVerification().getExpirationMinutes();
        verificationRepository.save(new EmailVerification(email, code, expirationMinutes));
        emailService.sendVerificationCode(email, code, expirationMinutes);
    }

    /**
     * 이메일 인증 코드 확인
     */
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
    }

    /**
     * 로그인
     */
    public AuthResponse login(LoginRequest req) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.email(), req.password())
            );
        } catch (BadCredentialsException e) {
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }

        User user = userRepository.findByEmailAndActiveTrue(req.email())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        String token = jwtTokenProvider.generateToken(user.getEmail(), user.getMemberType().name());
        return AuthResponse.of(token, user);
    }

    private String generateCode() {
        return String.format("%06d", random.nextInt(1_000_000));
    }
}
