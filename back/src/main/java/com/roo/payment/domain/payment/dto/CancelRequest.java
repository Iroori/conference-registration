package com.roo.payment.domain.payment.dto;

import jakarta.validation.constraints.NotBlank;

public record CancelRequest(
        @NotBlank
        String registrationNumber,

        @NotBlank
        String reason
) {}
