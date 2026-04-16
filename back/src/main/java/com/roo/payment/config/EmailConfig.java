package com.roo.payment.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

/**
 * AWS SES SMTP JavaMailSender 빈 설정.
 *
 * prod 프로파일: application.yaml의 spring.mail.* 값을 환경변수로 주입
 * dev  프로파일: app.dev-mode=true 시 EmailService가 콘솔 출력으로 대체하므로
 *               실제 SMTP 연결 없이 동작함 (test-connection: false)
 *
 * AWS SES SMTP 자격증명 발급:
 *   1. AWS SES 콘솔 → SMTP settings → Create SMTP credentials
 *   2. 생성된 SMTP Username / Password를 MAIL_USERNAME / MAIL_PASSWORD 환경변수에 설정
 *   ※ SES SMTP 자격증명은 IAM Access Key / Secret Key와 별개입니다.
 *
 * SES 도메인 인증 (Route 53 연동 시 자동):
 *   - SES 콘솔 → Verified identities → Add domain → Route 53 자동 DNS 설정
 *   - Sandbox 해제 후 임의 수신자에게 발송 가능 (기본은 검증된 이메일만 수신 가능)
 */
@Configuration
public class EmailConfig {

    @Value("${spring.mail.host:smtp.gmail.com}")
    private String host;

    @Value("${spring.mail.port:587}")
    private int port;

    @Value("${spring.mail.username:}")
    private String username;

    @Value("${spring.mail.password:}")
    private String password;

    @Value("${spring.mail.properties.mail.smtp.auth:true}")
    private boolean smtpAuth;

    @Value("${spring.mail.properties.mail.smtp.starttls.enable:true}")
    private boolean starttlsEnable;

    @Bean
    public JavaMailSender javaMailSender() {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(host);
        mailSender.setPort(port);
        mailSender.setUsername(username);
        mailSender.setPassword(password);  // Google App Password (16자리)
        mailSender.setDefaultEncoding("UTF-8");

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", String.valueOf(smtpAuth));
        props.put("mail.smtp.starttls.enable", String.valueOf(starttlsEnable));
        props.put("mail.smtp.starttls.required", "true");
        props.put("mail.smtp.connectiontimeout", "5000");
        props.put("mail.smtp.timeout", "5000");
        props.put("mail.smtp.writetimeout", "5000");
        props.put("mail.debug", "false");   // SMTP 디버그 로그 (운영: false)

        // ── Redis 연동 시 참고 ───────────────────────────────────────────
        // Spring Data Redis를 추가하면 VerificationCodeStore를
        // ConcurrentHashMap → RedisTemplate 기반으로 교체 가능.
        // pom.xml: spring-boot-starter-data-redis
        // application.yaml: spring.data.redis.host / port / password
        // ─────────────────────────────────────────────────────────────────

        return mailSender;
    }
}
