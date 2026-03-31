package com.roo.payment.domain.payment.dto;

import com.roo.payment.domain.payment.entity.PaymentMethod;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record PaymentRequest(
        @NotEmpty
        List<String> selectedOptionIds,

        @NotNull
        PaymentMethod paymentMethod
) {}
