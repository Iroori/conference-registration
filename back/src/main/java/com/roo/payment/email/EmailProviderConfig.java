package com.roo.payment.email;

import com.roo.payment.email.provider.SesEmailSender;
import com.roo.payment.email.provider.SmtpEmailSender;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * 설정값 {@code email.provider} 에 따라 활성 {@link EmailSender} 빈을 선택한다.
 *
 * <ul>
 *   <li>{@code smtp} → {@link SmtpEmailSender} (Google Workspace SMTP)</li>
 *   <li>{@code ses}  → {@link SesEmailSender}  (AWS SES SMTP, 롤백 대비)</li>
 * </ul>
 *
 * 각 구현체는 {@code @ConditionalOnProperty} 로 해당 provider에서만 인스턴스화되므로
 * {@link ObjectProvider#getIfAvailable()} 로 안전하게 조회한다.
 */
@Configuration
public class EmailProviderConfig {

    private final String provider;

    public EmailProviderConfig(@Value("${email.provider}") String provider) {
        this.provider = provider;
    }

    @Bean
    @Primary
    public EmailSender emailSender(ObjectProvider<SmtpEmailSender> smtpProvider,
                                   ObjectProvider<SesEmailSender> sesProvider) {
        EmailSender sender = switch (provider.toLowerCase()) {
            case "smtp" -> smtpProvider.getIfAvailable();
            case "ses"  -> sesProvider.getIfAvailable();
            default -> throw new IllegalArgumentException(
                    "Unknown email provider: '" + provider + "' (expected 'smtp' or 'ses')");
        };
        if (sender == null) {
            throw new IllegalStateException(
                    "EmailSender bean for provider '" + provider + "' is not available — "
                            + "verify the corresponding @Component is active.");
        }
        return sender;
    }
}
