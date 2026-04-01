package com.roo.payment.domain.dev;

import com.roo.payment.common.response.ApiResponse;
import com.roo.payment.config.AppProperties;
import com.roo.payment.domain.user.entity.User;
import com.roo.payment.domain.user.repository.UserRepository;
import com.roo.payment.domain.user.service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 개발 전용 컨트롤러 — app.dev-mode=true 일 때만 유효한 응답 반환.
 * 운영(prod)에서는 app.dev-mode=false 로 설정하면 403을 반환합니다.
 *
 * 사용 예:
 *   GET  /api/dev/code?email=test@test.com   → 인메모리에 저장된 인증 코드 확인
 *   POST /api/dev/verify?email=test@test.com → 이메일 인증 강제 완료
 */
@RestController
@RequestMapping("/api/dev")
public class DevController {

    private final AppProperties appProperties;
    private final EmailService  emailService;
    private final UserRepository userRepository;

    public DevController(AppProperties appProperties,
                         EmailService emailService,
                         UserRepository userRepository) {
        this.appProperties  = appProperties;
        this.emailService   = emailService;
        this.userRepository = userRepository;
    }

    /** 현재 인메모리에 저장된 인증 코드 조회 (콘솔 로그를 놓쳤을 때 사용) */
    @GetMapping("/code")
    public ResponseEntity<ApiResponse<Map<String, String>>> getCode(@RequestParam String email) {
        if (!appProperties.isDevMode()) {
            return ResponseEntity.status(403).body(ApiResponse.fail("dev 모드에서만 사용 가능합니다."));
        }

        String code = emailService.getStoredCode(email);
        if (code == null) {
            return ResponseEntity.ok(ApiResponse.fail("발급된 인증 코드가 없거나 만료되었습니다."));
        }
        return ResponseEntity.ok(ApiResponse.ok(Map.of("email", email.toLowerCase(), "code", code)));
    }

    /** 이메일 인증 강제 완료 (회원가입 후 인증 없이 바로 로그인 테스트 시) */
    @PostMapping("/verify")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, String>>> forceVerify(@RequestParam String email) {
        if (!appProperties.isDevMode()) {
            return ResponseEntity.status(403).body(ApiResponse.fail("dev 모드에서만 사용 가능합니다."));
        }

        User user = userRepository.findByEmailAndActiveTrue(email.toLowerCase()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("해당 이메일의 사용자가 없습니다."));
        }
        if (user.isEmailVerified()) {
            return ResponseEntity.ok(ApiResponse.ok(Map.of(
                    "email", email,
                    "status", "Already verified."
            )));
        }

        user.verifyEmail();
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "email", email,
                "status", "Email verified. You can now log in."
        )));
    }
}
