package com.roo.payment.domain.user.controller;

import com.roo.payment.common.response.ApiResponse;
import com.roo.payment.domain.user.dto.*;
import com.roo.payment.domain.user.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * 회원가입 (이메일 인증 완료 후에만 허용)
     * POST /api/auth/signup
     *
     * 선행 조건: 클라이언트는 먼저 /auth/send-code, /auth/verify-code 를 통해
     *            이메일 소유권을 증명해야 한다. 미인증 상태로 호출 시 403 반환.
     */
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<Void>> signup(@Valid @RequestBody SignupRequest request) {
        authService.signup(request);
        return ResponseEntity.ok(ApiResponse.ok("회원가입이 완료되었습니다.", null));
    }

    /**
     * 이메일 인증 코드 발송 / 재발송 (가입 전 단계)
     * POST /api/auth/send-code
     *
     * 동일 엔드포인트로 최초 발송과 재발송을 모두 처리한다.
     * 30초 이내 재호출 시 VERIFICATION_CODE_COOLDOWN (429) 반환.
     */
    @PostMapping("/send-code")
    public ResponseEntity<ApiResponse<Void>> sendCode(@Valid @RequestBody SendCodeRequest request) {
        authService.sendVerificationCode(request.email());
        return ResponseEntity.ok(ApiResponse.ok("인증 코드가 발송되었습니다.", null));
    }

    /**
     * 이메일 인증 코드 확인 (가입 전 단계)
     * POST /api/auth/verify-code
     *
     * 성공 시 서버는 인증 이력을 20분간 보관한다.
     * 이후 /auth/signup 요청 시 이 이력이 있어야만 가입이 허용된다.
     */
    @PostMapping("/verify-code")
    public ResponseEntity<ApiResponse<Void>> verifyCode(@Valid @RequestBody VerifyCodeRequest request) {
        authService.verifyCode(request);
        return ResponseEntity.ok(ApiResponse.ok("이메일 인증이 완료되었습니다.", null));
    }

    /**
     * 로그인
     * POST /api/auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * 액세스 토큰 갱신
     * POST /api/auth/refresh
     */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshRequest request) {
        AuthResponse response = authService.refresh(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * 로그아웃 (리프레시 토큰 폐기)
     * POST /api/auth/logout
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@Valid @RequestBody LogoutRequest request) {
        authService.logout(request);
        return ResponseEntity.ok(ApiResponse.ok("로그아웃되었습니다.", null));
    }
}
