package com.roo.payment.domain.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * 이메일 인증 코드 발송 요청 DTO.
 * POST /api/email/send-code
 */
public record SendCodeRequest(
        @NotBlank @Email
        String email
) {}
