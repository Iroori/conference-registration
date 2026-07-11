package com.roo.payment.domain.payment.dto;

import jakarta.validation.constraints.NotBlank;

public record CompletePaymentRequest(
                @NotBlank String registrationNumber,
                @NotBlank String tid,
                @NotBlank String replycode
) {}
