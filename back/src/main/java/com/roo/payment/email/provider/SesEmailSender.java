package com.roo.payment.email.provider;

import com.roo.payment.email.EmailSender;
import com.roo.payment.email.dto.EmailMessage;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

/**
 * AWS SES SMTP 기반 이메일 발송 구현체 (기존 로직 유지, 롤백 대비용).
 *
 * 활성 조건: {@code email.provider=ses}
 * SES SMTP 자격증명은 IAM Access Key와 별개로 SES 콘솔에서 발급한다.
 * 도메인 검증 / Sandbox 해제 등 운영 전제조건은 AWS SES 콘솔 참고.
 */
@Component
@ConditionalOnProperty(name = "email.provider", havingValue = "ses")
public class SesEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(SesEmailSender.class);

    private final JavaMailSender mailSender;
    private final String fromAddress;

    public SesEmailSender(JavaMailSender mailSender,
                          @Value("${email.from:iabse2026@kibse.or.kr}") String fromAddress) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        log.info("Email provider activated: AWS SES (SMTP) — from={}", fromAddress);
    }

    @Override
    public void send(EmailMessage message) {
        try {
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
            helper.setFrom(new InternetAddress(fromAddress, "IABSE Congress Incheon 2026 Registration", "UTF-8"));
            helper.setTo(message.to());
            helper.setSubject(message.subject());
            helper.setText(message.body(), message.html());
            mailSender.send(mime);
        } catch (Exception e) {
            log.error("[SES] Email send failed to {}: {}", message.to(), e.getMessage());
            throw new RuntimeException("SES email send failed", e);
        }
    }
}
