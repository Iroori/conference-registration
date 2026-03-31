package com.roo.payment.domain.payment.dto;

import com.roo.payment.domain.payment.entity.PaymentMethod;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;

public record PaymentRequest(
        @NotEmpty
        List<String> selectedOptionIds,

        /** optionId → quantity. If absent for an option, defaults to 1. */
        Map<String, Integer> quantities,

        @NotNull
        PaymentMethod paymentMethod
) {}
