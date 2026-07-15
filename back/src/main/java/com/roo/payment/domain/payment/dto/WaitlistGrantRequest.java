package com.roo.payment.domain.payment.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * 관리자 직접 오퍼 요청 — 대기 신청 없이 회원가입한 유저에게 특정 옵션 결제 권한을 연다.
 * force=null 이면 기본 true (정원 초과 허용 — 실결제 누락 보정 용도가 주 목적).
 */
public record WaitlistGrantRequest(
        @NotBlank @Email String email,
        @NotBlank String optionId,
        @NotNull @Positive Integer quantity,
        Boolean force
) {
}
