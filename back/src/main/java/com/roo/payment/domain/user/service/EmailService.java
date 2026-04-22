package com.roo.payment.domain.user.service;

import com.roo.payment.common.exception.BusinessException;
import com.roo.payment.common.exception.ErrorCode;
import com.roo.payment.config.AppProperties;
import com.roo.payment.email.EmailSender;
import com.roo.payment.email.dto.EmailMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
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

    // 재발송 쿨다운 (초). 동일 이메일에 대해 이 간격 내 재요청 시 TOO_MANY_REQUESTS
    private static final long RESEND_COOLDOWN_SECONDS = 30L;

    // 인증 완료 이력 유효 기간 (분) — /auth/signup 진입 전 "최근 인증됨" 판단에 사용
    private static final long VERIFIED_TTL_MINUTES = 20L;

    private final SecureRandom random = new SecureRandom();

    // Provider 추상화 — email.provider 설정값에 따라 SMTP / SES 중 하나가 주입됨
    private final EmailSender   emailSender;
    private final AppProperties appProperties;

    // ── In-memory 인증 코드 저장소 ──────────────────────────────────────
    // key: email(소문자), value: CodeEntry { code, expiresAt }
    // 멀티 인스턴스 환경 전환 시 Redis로 교체 (위 주석 참조)
    private final Map<String, CodeEntry> codeStore = new ConcurrentHashMap<>();

    // 직전 발송 시각 (BUG-D: 쿨다운 체크용)
    private final Map<String, Instant> lastSentAt = new ConcurrentHashMap<>();

    // 인증 완료 이력 (BUG-A 해결 핵심: 가입 API에서 이 맵을 조회해 인증 여부 판단)
    // key: email(소문자), value: 인증 완료 시각 (만료는 VERIFIED_TTL_MINUTES 이후)
    private final Map<String, Instant> verifiedEmails = new ConcurrentHashMap<>();

    // Self-injection: @Async 프록시를 경유하기 위해 자기 자신을 @Lazy로 주입
    //   - sendAndStoreCode()는 동기 저장이 필요하므로 @Async 미적용
    //   - 메일 발송은 self.dispatchVerificationMail() 을 통해 프록시 경유 비동기 실행
    @Autowired
    @Lazy
    private EmailService self;

    public EmailService(EmailSender emailSender, AppProperties appProperties) {
        this.emailSender   = emailSender;
        this.appProperties = appProperties;
    }

    // ─── 코드 생성 & 발송 ────────────────────────────────────────────────

    /**
     * 6자리 인증 코드를 생성하여 인메모리에 저장하고 이메일로 발송.
     *
     * 핵심 설계:
     *  1) 코드 생성 + codeStore.put 은 **동기적으로 호출 스레드에서 실행**
     *     → 재발송 연속 호출 시 put 순서가 역전되는 경합 방지 (BUG-A 해결)
     *  2) 쿨다운: 동일 이메일 30초 이내 재요청 시 TOO_MANY_REQUESTS (BUG-D)
     *  3) 메일 발송(네트워크 I/O)만 별도 @Async 메서드로 분리
     *
     * dev 모드: SMTP 미사용, 콘솔 로그에 코드 출력.
     *
     * @throws BusinessException VERIFICATION_CODE_COOLDOWN — 30초 내 재요청 시
     */
    public void sendAndStoreCode(String email) {
        String key  = email.toLowerCase().trim();
        int expMin  = appProperties.getEmailVerification().getExpirationMinutes();

        // 쿨다운 체크 (BUG-D)
        Instant last = lastSentAt.get(key);
        if (last != null) {
            long elapsed = Instant.now().getEpochSecond() - last.getEpochSecond();
            if (elapsed < RESEND_COOLDOWN_SECONDS) {
                throw new BusinessException(ErrorCode.VERIFICATION_CODE_COOLDOWN);
            }
        }

        String code = String.format("%06d", random.nextInt(1_000_000));

        // 동기 저장 — 호출 순서대로 저장되도록 함 (BUG-A)
        codeStore.put(key, new CodeEntry(code, expMin));
        lastSentAt.put(key, Instant.now());

        // 이메일이 변경되어 재발송되면 이전 인증 이력 무효화
        verifiedEmails.remove(key);

        // 발송은 비동기 (네트워크 I/O 차단 방지) — self 프록시 경유
        self.dispatchVerificationMail(key, code, expMin);
    }

    @Async
    public void dispatchVerificationMail(String to, String code, int expMin) {
        if (appProperties.isDevMode()) {
            log.info("""

                    ╔══════════════════════════════════════════════╗
                    ║  [DEV] Email Verification Code
                    ║  To: {}
                    ║  Code: {}  (expires in {} min)
                    ╚══════════════════════════════════════════════╝""",
                    to, code, expMin);
            return;
        }
        sendHtmlMail(to,
                "[IABSE 2026] Email Verification Code",
                buildVerificationHtml(code, expMin));
    }

    /**
     * 인증 코드 검증. 성공 시:
     *  - codeStore에서 즉시 제거 (일회용)
     *  - verifiedEmails에 현재 시각 기록 (이후 signup 요청 시 선행 조건으로 사용)
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

        codeStore.remove(key);                              // 사용 완료 → 즉시 삭제
        verifiedEmails.put(key, Instant.now());             // 인증 성공 이력 저장
    }

    /**
     * 해당 이메일이 최근 {@value #VERIFIED_TTL_MINUTES}분 이내에 인증되었는지 확인.
     * /auth/signup 호출 시 선행 조건으로 검증된다.
     */
    public boolean isRecentlyVerified(String email) {
        String key = email.toLowerCase().trim();
        Instant at = verifiedEmails.get(key);
        if (at == null) return false;
        long elapsed = Instant.now().getEpochSecond() - at.getEpochSecond();
        if (elapsed > VERIFIED_TTL_MINUTES * 60L) {
            verifiedEmails.remove(key);
            return false;
        }
        return true;
    }

    /**
     * 인증 이력 소비 (가입 성공 후 호출하여 재사용 방지).
     */
    public void consumeVerified(String email) {
        verifiedEmails.remove(email.toLowerCase().trim());
    }

    /**
     * dev 전용: 현재 저장된 인증 코드 조회 (DevController에서 사용).
     */
    public String getStoredCode(String email) {
        CodeEntry entry = codeStore.get(email.toLowerCase().trim());
        return (entry != null && !entry.isExpired()) ? entry.code() : null;
    }

    /**
     * 만료된 코드/인증 이력 정기 청소 (BUG-F 해결).
     * 5분마다 실행.
     */
    @Scheduled(fixedRate = 300_000L)
    public void purgeExpired() {
        Instant now = Instant.now();
        codeStore.entrySet().removeIf(e -> e.getValue().isExpired());
        verifiedEmails.entrySet().removeIf(e ->
                now.getEpochSecond() - e.getValue().getEpochSecond() > VERIFIED_TTL_MINUTES * 60L);
        lastSentAt.entrySet().removeIf(e ->
                now.getEpochSecond() - e.getValue().getEpochSecond() > 3600L);
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
        sendHtmlMail(to, "[IABSE 2026] Registration Payment Confirmed",
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
        sendHtmlMail(to, "[IABSE 2026] Registration Cancellation Confirmed",
                buildCancellationHtml(nameEn, registrationNumber, refundAmount));
    }

    // ─── private helpers ─────────────────────────────────────────────────

    private void sendHtmlMail(String to, String subject, String htmlBody) {
        // 발송 실패는 호출 트랜잭션을 막지 않도록 경계에서 흡수한다.
        // Provider 구현체(SMTP/SES)는 실패 시 RuntimeException 으로 전파.
        try {
            emailSender.send(EmailMessage.html(to, subject, htmlBody));
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
                      <p style="color:#2dd4bf;font-size:12px;font-weight:600;letter-spacing:3px;margin:0">IABSE 2026</p>
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
                      <p style="color:#2dd4bf;font-size:12px;font-weight:600;letter-spacing:3px;margin:0">IABSE 2026</p>
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
                      <p style="color:#94a3b8;font-size:12px;margin:0">Inquiries: iabse2026@kibse.or.kr</p>
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
                      <p style="color:#2dd4bf;font-size:12px;font-weight:600;letter-spacing:3px;margin:0">IABSE 2026</p>
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
