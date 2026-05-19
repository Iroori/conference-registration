package com.roo.payment.domain.payment.dto;

import com.roo.payment.domain.payment.entity.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

public record PaymentRequest(
                @NotEmpty List<String> selectedOptionIds,

                /** optionId → quantity. If absent for an option, defaults to 1. */
                Map<String, Integer> quantities,

                @NotNull PaymentMethod paymentMethod,

                String tid,

                String replycode,

                /** 동반자 등록 옵션 선택 시 동반자 이름 — 그 외에는 null */
                @Valid AccompanyingPersonInfo accompanyingPerson) {

        public record AccompanyingPersonInfo(
                        @NotBlank @Size(max = 100) String lastName,
                        @NotBlank @Size(max = 100) String firstName) {
        }
}
