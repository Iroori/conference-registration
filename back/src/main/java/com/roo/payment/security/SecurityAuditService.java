package com.roo.payment.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * 보안 관련 이벤트(로그인 성공/실패, 토큰 갱신, 로그아웃 등)를 구조화된 형태로 기록합니다.
 * 민감한 필드(비밀번호, 토큰)는 절대 기록하지 않습니다.
 */
@Service
public class SecurityAuditService {

    private static final Logger audit = LoggerFactory.getLogger("SECURITY_AUDIT");

    public void log(String event, String email) {
        // email 마스킹: abc@test.com → a**@test.com
        String masked = maskEmail(email);
        audit.info("[AUDIT] event={} email={} ts={}", event, masked, Instant.now());
    }

    public void log(String event, String email, String detail) {
        String masked = maskEmail(email);
        audit.info("[AUDIT] event={} email={} detail={} ts={}", event, masked, detail, Instant.now());
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        String[] parts = email.split("@", 2);
        String local = parts[0];
        String domain = parts[1];
        if (local.length() <= 1) return local + "@" + domain;
        return local.charAt(0) + "*".repeat(local.length() - 1) + "@" + domain;
    }
}
