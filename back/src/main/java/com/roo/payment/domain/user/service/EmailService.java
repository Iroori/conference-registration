package com.roo.payment.domain.user.service;

import com.roo.payment.common.exception.BusinessException;
import com.roo.payment.common.exception.ErrorCode;
import com.roo.payment.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 이메일 전송 및 인증 코드 관리 서비스.
 *
 * [저장 전략]
 * 현재: ConcurrentHashMap (인메모리) — 단일 인스턴스 환경에 적합
 *
 * ── Redis 전환 방법 ──────────────────────────────────────────────────────
 * 1. pom.xml에 spring-boot-starter-data-redis 추가
 * 2. application.yaml에 spring.data.redis.host / port / password 설정
 * 3. codeStore.put / get / remove 호출을 아래 RedisTemplate 방식으로 교체:
 *
 *    @Autowired
 *    private RedisTemplate<String, String> redisTemplate;
 *
 *    // 저장:
 *    redisTemplate.opsForValue()
 *        .set("email:verify:" + email, code, Duration.ofMinutes(expirationMinutes));
 *    // 조회:
 *    String code = redisTemplate.opsForValue().get("email:verify:" + email);
 *    // 삭제:
 *    redisTemplate.delete("email:verify:" + email);
 * ────────────────────────────────────────────────────────────────────────
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String FROM_ADDRESS = "noreply@kssc2026.org";

    private final JavaMailSender mailSender;
    private final AppProperties  appProperties;

    // ── In-memory 인증 코드 저장소 ──────────────────────────────────────
    // key: email(소문자), value: CodeEntry { code, expiresAt }
    // 멀티 인스턴스 환경 전환 시 Redis로 교체 (위 주석 참조)
    private final Map<String, CodeEntry> codeStore = new ConcurrentHashMap<>();

    public EmailService(JavaMailSender mailSender, AppProperties appProperties) {
        this.mailSender   = mailSender;
        this.appProperties = appProperties;
    }

    // ─── 코드 생성 & 발송 ────────────────────────────────────────────────

    /**
     * 6자리 인증 코드를 생성하여 인메모리에 저장하고 이메일로 발송.
     * dev 모드: SMTP 미사용, 콘솔 로그에 코드 출력.
     */
    @Async
    public void sendAndStoreCode(String email) {
        String key  = email.toLowerCase().trim();
        int expMin  = appProperties.getEmailVerification().getExpirationMinutes();
        String code = String.format("%06d", (int)(Math.random() * 1_000_000));

        codeStore.put(key, new CodeEntry(code, expMin));  // 기존 코드 덮어쓰기

        if (appProperties.isDevMode()) {
            log.info("""

                    ╔══════════════════════════════════════════════╗
                    ║  [DEV] Email Verification Code
                    ║  To: {}
                    ║  Code: {}  (expires in {} min)
                    ╚══════════════════════════════════════════════╝""",
                    key, code, expMin);
            return;
        }
        sendHtmlMail(key,
                "[KSSC 2026] Email Verification Code",
                buildVerificationHtml(code, expMin));
    }

    /**
     * 인증 코드 검증. 성공 시 저장소에서 즉시 제거 (일회용).
     *
     * @throws BusinessException 코드 없음 / 만료 / 불일치
     */
    public void verifyCode(String email, String inputCode) {
        String key   = email.toLowerCase().trim();
        CodeEntry entry = codeStore.get(key);

        if (entry == null) {
            throw new BusinessException(ErrorCode.VERIFICATION_CODE_INVALID);
        }
        if (entry.isExpired()) {
            codeStore.remove(key);
            throw new BusinessException(ErrorCode.VERIFICATION_CODE_EXPIRED);
        }
        if (!entry.code().equals(inputCode)) {
            throw new BusinessException(ErrorCode.VERIFICATION_CODE_INVALID);
        }

        codeStore.remove(key);  // 사용 완료 → 즉시 삭제
    }

    /**
     * dev 전용: 현재 저장된 인증 코드 조회 (DevController에서 사용).
     */
    public String getStoredCode(String email) {
        CodeEntry entry = codeStore.get(email.toLowerCase().trim());
        return (entry != null && !entry.isExpired()) ? entry.code() : null;
    }

    // ─── 알림 메일 ───────────────────────────────────────────────────────

    @Async
    public void sendPaymentConfirmation(String to, String nameEn, String registrationNumber,
                                        long totalAmount, String paidAt) {
        if (appProperties.isDevMode()) {
            log.info("[DEV] Payment Confirmation → {} | Reg#{} | ₩{}",
                    to, registrationNumber, String.format("%,d", totalAmount));
            return;
        }
        sendHtmlMail(to, "[KSSC 2026] Registration Payment Confirmed",
                buildPaymentConfirmationHtml(nameEn, registrationNumber, totalAmount, paidAt));
    }

    @Async
    public void sendCancellationConfirmation(String to, String nameEn,
                                              String registrationNumber, long refundAmount) {
        if (appProperties.isDevMode()) {
            log.info("[DEV] Cancellation Confirmed → {} | Reg#{} | Refund ₩{}",
                    to, registrationNumber, String.format("%,d", refundAmount));
            return;
        }
        sendHtmlMail(to, "[KSSC 2026] Registration Cancellation Confirmed",
                buildCancellationHtml(nameEn, registrationNumber, refundAmount));
    }

    // ─── private helpers ─────────────────────────────────────────────────

    private void sendHtmlMail(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setFrom(FROM_ADDRESS);
            helper.setText(htmlBody, true);
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Email send failed to {}: {}", to, e.getMessage());
        }
    }

    // ─── HTML 템플릿 ─────────────────────────────────────────────────────

    private String buildVerificationHtml(String code, int expirationMinutes) {
        return """
                <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
                <body style="font-family:'Segoe UI',sans-serif;background:#f8fafc;padding:40px 0">
                  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
                    <div style="background:#1e293b;padding:24px 32px">
                      <p style="color:#2dd4bf;font-size:12px;font-weight:600;letter-spacing:3px;margin:0">KSSC 2026</p>
                      <h1 style="color:#fff;font-size:20px;margin:4px 0 0">Email Verification</h1>
                    </div>
                    <div style="padding:32px">
                      <p style="color:#475569;margin:0 0 24px">Enter the 6-digit verification code below.</p>
                      <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
                        <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#0f766e">%s</span>
                      </div>
                      <p style="color:#94a3b8;font-size:13px;margin:0">This code expires in %d minutes.</p>
                    </div>
                  </div>
                </body></html>
                """.formatted(code, expirationMinutes);
    }

    private String buildPaymentConfirmationHtml(String nameEn, String registrationNumber,
                                                long totalAmount, String paidAt) {
        return """
                <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
                <body style="font-family:'Segoe UI',sans-serif;background:#f8fafc;padding:40px 0">
                  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
                    <div style="background:#1e293b;padding:24px 32px">
                      <p style="color:#2dd4bf;font-size:12px;font-weight:600;letter-spacing:3px;margin:0">KSSC 2026</p>
                      <h1 style="color:#fff;font-size:20px;margin:4px 0 0">Payment Confirmed</h1>
                    </div>
                    <div style="padding:32px">
                      <p style="color:#1e293b;margin:0 0 4px">Dear %s, your registration is complete.</p>
                      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:24px 0">
                        <table style="width:100%%;border-collapse:collapse">
                          <tr><td style="color:#94a3b8;font-size:13px;padding:6px 0">Registration No.</td>
                              <td style="color:#1e293b;font-weight:600;font-size:13px;text-align:right">%s</td></tr>
                          <tr><td style="color:#94a3b8;font-size:13px;padding:6px 0">Amount Paid</td>
                              <td style="color:#1e293b;font-weight:600;font-size:13px;text-align:right">₩%,d</td></tr>
                          <tr><td style="color:#94a3b8;font-size:13px;padding:6px 0">Date</td>
                              <td style="color:#1e293b;font-size:13px;text-align:right">%s</td></tr>
                        </table>
                      </div>
                      <p style="color:#94a3b8;font-size:12px;margin:0">Inquiries: registration@kssc2026.org</p>
                    </div>
                  </div>
                </body></html>
                """.formatted(nameEn, registrationNumber, totalAmount, paidAt);
    }

    private String buildCancellationHtml(String nameEn, String registrationNumber, long refundAmount) {
        return """
                <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
                <body style="font-family:'Segoe UI',sans-serif;background:#f8fafc;padding:40px 0">
                  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
                    <div style="background:#1e293b;padding:24px 32px">
                      <p style="color:#2dd4bf;font-size:12px;font-weight:600;letter-spacing:3px;margin:0">KSSC 2026</p>
                      <h1 style="color:#fff;font-size:20px;margin:4px 0 0">Cancellation Confirmed</h1>
                    </div>
                    <div style="padding:32px">
                      <p style="color:#1e293b;margin:0 0 24px">Dear %s, your registration has been cancelled.</p>
                      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin-bottom:24px">
                        <p style="margin:0;color:#94a3b8;font-size:13px">Registration No: <strong style="color:#1e293b">%s</strong></p>
                        <p style="margin:8px 0 0;color:#94a3b8;font-size:13px">Expected Refund: <strong style="color:#1e293b">₩%,d</strong></p>
                      </div>
                      <p style="color:#94a3b8;font-size:12px;margin:0">Refunds are processed within 3–5 business days.</p>
                    </div>
                  </div>
                </body></html>
                """.formatted(nameEn, registrationNumber, refundAmount);
    }

    // ─── Inner record ────────────────────────────────────────────────────

    /**
     * 인메모리 코드 저장 엔트리.
     * Redis 전환 시 이 record를 JSON 직렬화 가능한 클래스로 교체.
     */
    private record CodeEntry(String code, Instant expiresAt) {
        CodeEntry(String code, int expirationMinutes) {
            this(code, Instant.now().plusSeconds(expirationMinutes * 60L));
        }

        boolean isExpired() {
            return Instant.now().isAfter(expiresAt);
        }
    }
}
