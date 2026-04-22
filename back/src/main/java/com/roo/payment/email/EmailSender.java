package com.roo.payment.email;

import com.roo.payment.email.dto.EmailMessage;

/**
 * 이메일 발송 추상화 계층.
 *
 * 서비스 레이어는 이 인터페이스에만 의존한다.
 * 구현체는 {@code com.roo.payment.email.provider} 참조 (SMTP / SES).
 * 활성 구현체는 설정값 {@code email.provider} 로 결정된다.
 */
public interface EmailSender {
    void send(EmailMessage message);
}
