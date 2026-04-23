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
 * Google Workspace SMTP 기반 이메일 발송 구현체.
 *
 * 활성 조건: {@code email.provider=smtp}
 * SMTP 서버/자격증명은 {@code spring.mail.*} 설정으로 주입되며,
 * Google 앱 비밀번호(16자리)는 환경변수 {@code GOOGLE_APP_PASSWORD} 로 관리한다.
 */
@Component
@ConditionalOnProperty(name = "email.provider", havingValue = "smtp")
public class SmtpEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(SmtpEmailSender.class);

    private final JavaMailSender mailSender;
    private final String fromAddress;

    public SmtpEmailSender(JavaMailSender mailSender,
                           @Value("${email.from:iabse2026@kibse.or.kr}") String fromAddress) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        log.info("Email provider activated: SMTP (Google Workspace) — from={}", fromAddress);
    }

    @Override
    public void send(EmailMessage message) {
        try {
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
            helper.setFrom(new InternetAddress(fromAddress, "IABSE 2026 Registration", "UTF-8"));
            helper.setTo(message.to());
            helper.setSubject(message.subject());
            helper.setText(message.body(), message.html());
            mailSender.send(mime);
        } catch (Exception e) {
            log.error("[SMTP] Email send failed to {}: {}", message.to(), e.getMessage());
            throw new RuntimeException("SMTP email send failed", e);
        }
    }
}
