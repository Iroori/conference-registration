package com.roo.payment.domain.user.service;

import com.roo.payment.config.AppProperties;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final AppProperties appProperties;

    public EmailService(JavaMailSender mailSender, AppProperties appProperties) {
        this.mailSender = mailSender;
        this.appProperties = appProperties;
    }

    /**
     * 이메일 인증 코드 발송
     * dev 모드: 콘솔에 코드 출력 (이메일 미발송)
     */
    @Async
    public void sendVerificationCode(String to, String code, int expirationMinutes) {
        if (appProperties.isDevMode()) {
            printDevBanner("이메일 인증 코드", to,
                    "코드: " + code + "  (유효 " + expirationMinutes + "분)");
            return;
        }
        sendHtmlMail(to, "[KSSC 2026] 이메일 인증 코드",
                buildVerificationHtml(code, expirationMinutes));
    }

    /**
     * 결제 완료 알림 이메일
     */
    @Async
    public void sendPaymentConfirmation(String to, String nameKr, String registrationNumber,
                                        long totalAmount, String paidAt) {
        if (appProperties.isDevMode()) {
            printDevBanner("결제 완료 알림", to,
                    "등록번호: " + registrationNumber + " | 금액: ₩" + String.format("%,d", totalAmount));
            return;
        }
        sendHtmlMail(to, "[KSSC 2026] 참가 등록 결제 완료 안내",
                buildPaymentConfirmationHtml(nameKr, registrationNumber, totalAmount, paidAt));
    }

    /**
     * 결제 취소 알림 이메일
     */
    @Async
    public void sendCancellationConfirmation(String to, String nameKr,
                                              String registrationNumber, long refundAmount) {
        if (appProperties.isDevMode()) {
            printDevBanner("결제 취소 알림", to,
                    "등록번호: " + registrationNumber + " | 환불금액: ₩" + String.format("%,d", refundAmount));
            return;
        }
        sendHtmlMail(to, "[KSSC 2026] 결제 취소 처리 완료 안내",
                buildCancellationHtml(nameKr, registrationNumber, refundAmount));
    }

    // ─── private ─────────────────────────────────────────────────────────────

    private void printDevBanner(String type, String to, String detail) {
        System.out.println("""
                ╔══════════════════════════════════════════════╗
                ║  [DEV] %s
                ║  수신: %s
                ║  %s
                ╚══════════════════════════════════════════════╝
                """.formatted(type, to, detail));
    }

    private void sendHtmlMail(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setFrom("noreply@kssc2026.org");
            helper.setText(htmlBody, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("[WARN] Email send failed to " + to + ": " + e.getMessage());
        }
    }

    private String buildVerificationHtml(String code, int expirationMinutes) {
        return """
                <!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"></head>
                <body style="font-family:'Segoe UI',sans-serif;background:#f8fafc;padding:40px 0">
                  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
                    <div style="background:#1e293b;padding:24px 32px">
                      <p style="color:#2dd4bf;font-size:12px;font-weight:600;letter-spacing:3px;margin:0">KSSC 2026</p>
                      <h1 style="color:#fff;font-size:20px;margin:4px 0 0">이메일 인증</h1>
                    </div>
                    <div style="padding:32px">
                      <p style="color:#475569;margin:0 0 24px">아래 6자리 인증 코드를 입력해주세요.</p>
                      <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
                        <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#0f766e">%s</span>
                      </div>
                      <p style="color:#94a3b8;font-size:13px;margin:0">이 코드는 %d분 후 만료됩니다.</p>
                    </div>
                  </div>
                </body></html>
                """.formatted(code, expirationMinutes);
    }

    private String buildPaymentConfirmationHtml(String nameKr, String registrationNumber,
                                                long totalAmount, String paidAt) {
        return """
                <!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"></head>
                <body style="font-family:'Segoe UI',sans-serif;background:#f8fafc;padding:40px 0">
                  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
                    <div style="background:#1e293b;padding:24px 32px">
                      <p style="color:#2dd4bf;font-size:12px;font-weight:600;letter-spacing:3px;margin:0">KSSC 2026</p>
                      <h1 style="color:#fff;font-size:20px;margin:4px 0 0">결제 완료 안내</h1>
                    </div>
                    <div style="padding:32px">
                      <p style="color:#1e293b;margin:0 0 4px">%s 님, 참가 등록이 완료되었습니다.</p>
                      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:24px 0">
                        <table style="width:100%%;border-collapse:collapse">
                          <tr><td style="color:#94a3b8;font-size:13px;padding:6px 0">등록 번호</td>
                              <td style="color:#1e293b;font-weight:600;font-size:13px;text-align:right">%s</td></tr>
                          <tr><td style="color:#94a3b8;font-size:13px;padding:6px 0">결제 금액</td>
                              <td style="color:#1e293b;font-weight:600;font-size:13px;text-align:right">₩%,d</td></tr>
                          <tr><td style="color:#94a3b8;font-size:13px;padding:6px 0">결제 일시</td>
                              <td style="color:#1e293b;font-size:13px;text-align:right">%s</td></tr>
                        </table>
                      </div>
                      <p style="color:#94a3b8;font-size:12px;margin:0">문의: registration@kssc2026.org</p>
                    </div>
                  </div>
                </body></html>
                """.formatted(nameKr, registrationNumber, totalAmount, paidAt);
    }

    private String buildCancellationHtml(String nameKr, String registrationNumber, long refundAmount) {
        return """
                <!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"></head>
                <body style="font-family:'Segoe UI',sans-serif;background:#f8fafc;padding:40px 0">
                  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
                    <div style="background:#1e293b;padding:24px 32px">
                      <p style="color:#2dd4bf;font-size:12px;font-weight:600;letter-spacing:3px;margin:0">KSSC 2026</p>
                      <h1 style="color:#fff;font-size:20px;margin:4px 0 0">결제 취소 완료</h1>
                    </div>
                    <div style="padding:32px">
                      <p style="color:#1e293b;margin:0 0 24px">%s 님의 참가 등록이 취소 처리되었습니다.</p>
                      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin-bottom:24px">
                        <p style="margin:0;color:#94a3b8;font-size:13px">등록 번호: <strong style="color:#1e293b">%s</strong></p>
                        <p style="margin:8px 0 0;color:#94a3b8;font-size:13px">환불 예정 금액: <strong style="color:#1e293b">₩%,d</strong></p>
                      </div>
                      <p style="color:#94a3b8;font-size:12px;margin:0">환불은 3~5 영업일 이내 처리됩니다.</p>
                    </div>
                  </div>
                </body></html>
                """.formatted(nameKr, registrationNumber, refundAmount);
    }
}
