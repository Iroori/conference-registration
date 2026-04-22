package com.roo.payment.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

/**
 * JavaMailSender 공용 빈 — {@code spring.mail.*} 설정으로 SMTP 서버에 연결한다.
 *
 * 활성 Provider ({@code email.provider}) 는 이 빈을 주입받아 사용한다:
 *   - smtp → Google Workspace SMTP ({@code smtp.gmail.com:587}, Google 앱 비밀번호)
 *   - ses  → AWS SES SMTP ({@code email-smtp.ap-northeast-2.amazonaws.com:587}, SES SMTP 자격증명)
 *
 * Provider 전환 시 환경변수 {@code EMAIL_PROVIDER}, {@code MAIL_HOST},
 * {@code MAIL_USERNAME}, {@code GOOGLE_APP_PASSWORD}/{@code MAIL_PASSWORD} 를 함께 조정한다.
 *
 * dev 프로파일: {@code app.dev-mode=true} 시 EmailService 가 콘솔 출력으로 대체하므로
 *               실제 SMTP 연결 없이 동작 ({@code test-connection: false}).
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
        mailSender.setPassword(password);  // Gmail: 앱 비밀번호(16자리) / SES: SMTP 자격증명
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
