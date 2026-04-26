package com.roo.payment.email.dto;

/**
 * 이메일 발송 요청 공통 DTO.
 *
 * @param to      수신자 주소
 * @param subject 제목
 * @param body    본문 — {@code html=true} 이면 HTML, 그렇지 않으면 plaintext
 * @param html    본문이 HTML인지 여부
 */
public record EmailMessage(String to, String subject, String body, boolean html) {

    public static EmailMessage html(String to, String subject, String body) {
        return new EmailMessage(to, subject, body, true);
    }

    public static EmailMessage plain(String to, String subject, String body) {
        return new EmailMessage(to, subject, body, false);
    }
}
