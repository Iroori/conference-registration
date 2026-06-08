package com.roo.payment.domain.payment.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CreateDiscountCodeRequest(
        @NotBlank @Email String userEmail,
        int iabseMemberDiscountRate,
        int nonIabseMemberDiscountRate,
        boolean galaDinnerFree,
        boolean accompanyingPersonFree,
        boolean technicalTourFree
) {}
