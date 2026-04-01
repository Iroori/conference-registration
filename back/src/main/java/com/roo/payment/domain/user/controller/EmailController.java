package com.roo.payment.domain.user.controller;

import com.roo.payment.common.response.ApiResponse;
import com.roo.payment.domain.user.dto.EmailVerifyRequest;
import com.roo.payment.domain.user.dto.SendCodeRequest;
import com.roo.payment.domain.user.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 이메일 인증 전용 컨트롤러.
 *
 * POST /api/email/send-code   — 인증 코드 발송 (회원가입 후 재발송용)
 * POST /api/email/verify      — 인증 코드 확인
 *
 * 회원가입 직후 자동 발송은 AuthService.signup() → EmailService.sendAndStoreCode() 에서 처리됨.
 * 이 컨트롤러는 재발송 및 독립적 인증 확인 엔드포인트를 제공.
 */
@RestController
@RequestMapping("/api/email")
public class EmailController {

    private final AuthService authService;

    public EmailController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * 인증 코드 발송 / 재발송.
     * POST /api/email/send-code
     * Body: { "email": "user@example.com" }
     */
    @PostMapping("/send-code")
    public ResponseEntity<ApiResponse<Void>> sendCode(
            @Valid @RequestBody SendCodeRequest request) {
        authService.sendVerificationCode(request.email());
        return ResponseEntity.ok(
                ApiResponse.ok("Verification code sent. Please check your inbox.", null));
    }

    /**
     * 인증 코드 확인.
     * POST /api/email/verify
     * Body: { "email": "user@example.com", "code": "123456" }
     */
    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<Void>> verify(
            @Valid @RequestBody EmailVerifyRequest request) {
        authService.verifyEmail(request);
        return ResponseEntity.ok(
                ApiResponse.ok("Email verified successfully.", null));
    }
}
