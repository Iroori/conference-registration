package com.roo.payment.domain.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 가입 전 이메일 소유권 확인을 위한 코드 검증 요청 DTO.
 * POST /api/auth/verify-code
 *
 * 성공 시 서버는 인증 완료 이력을 20분간 보관하고,
 * 이후 /api/auth/signup 요청의 선행 조건으로 검사한다.
 */
public record VerifyCodeRequest(
        @NotBlank @Email
        String email,

        @NotBlank @Size(min = 6, max = 6) @Pattern(regexp = "\\d{6}")
        String code
) {}
