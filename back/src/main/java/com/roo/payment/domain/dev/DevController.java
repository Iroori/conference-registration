package com.roo.payment.domain.dev;

import com.roo.payment.common.response.ApiResponse;
import com.roo.payment.config.AppProperties;
import com.roo.payment.domain.user.entity.EmailVerification;
import com.roo.payment.domain.user.entity.User;
import com.roo.payment.domain.user.repository.EmailVerificationRepository;
import com.roo.payment.domain.user.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 개발 전용 컨트롤러 — app.dev-mode=true 일 때만 유효한 응답 반환
 * 운영(prod)에서는 app.dev-mode=false 로 설정하면 403을 반환합니다.
 *
 * 사용 예:
 *   GET  /api/dev/code?email=test@test.com   → 최신 인증 코드 확인
 *   POST /api/dev/verify?email=test@test.com → 이메일 인증 강제 완료
 */
@RestController
@RequestMapping("/api/dev")
public class DevController {

    private final AppProperties appProperties;
    private final EmailVerificationRepository verificationRepository;
    private final UserRepository userRepository;

    public DevController(AppProperties appProperties,
                         EmailVerificationRepository verificationRepository,
                         UserRepository userRepository) {
        this.appProperties = appProperties;
        this.verificationRepository = verificationRepository;
        this.userRepository = userRepository;
    }

    /** 최신 인증 코드 조회 (콘솔 출력을 못 봤을 때 사용) */
    @GetMapping("/code")
    public ResponseEntity<ApiResponse<Map<String, String>>> getCode(@RequestParam String email) {
        if (!appProperties.isDevMode()) {
            return ResponseEntity.status(403).body(ApiResponse.fail("dev 모드에서만 사용 가능합니다."));
        }

        return verificationRepository
                .findTopByEmailAndUsedFalseOrderByIdDesc(email.toLowerCase())
                .map(v -> ResponseEntity.ok(ApiResponse.ok(Map.of(
                        "email", v.getEmail(),
                        "code", v.getCode(),
                        "expired", String.valueOf(v.isExpired())
                ))))
                .orElse(ResponseEntity.ok(ApiResponse.fail("발급된 인증 코드가 없습니다.")));
    }

    /** 이메일 인증 강제 완료 (회원가입 후 이메일 없이 바로 로그인하고 싶을 때) */
    @PostMapping("/verify")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, String>>> forceVerify(@RequestParam String email) {
        if (!appProperties.isDevMode()) {
            return ResponseEntity.status(403).body(ApiResponse.fail("dev 모드에서만 사용 가능합니다."));
        }

        User user = userRepository.findByEmailAndActiveTrue(email.toLowerCase())
                .orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("해당 이메일의 사용자가 없습니다."));
        }
        if (user.isEmailVerified()) {
            return ResponseEntity.ok(ApiResponse.ok(Map.of(
                    "email", email,
                    "status", "이미 인증된 계정입니다."
            )));
        }

        // 미사용 코드 소진 처리
        verificationRepository
                .findTopByEmailAndUsedFalseOrderByIdDesc(email.toLowerCase())
                .ifPresent(EmailVerification::markUsed);

        user.verifyEmail();

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "email", email,
                "status", "이메일 인증이 완료되었습니다. 이제 로그인할 수 있습니다."
        )));
    }
}
