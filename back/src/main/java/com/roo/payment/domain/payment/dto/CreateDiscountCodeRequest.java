package com.roo.payment.domain.payment.dto;

public record CreateDiscountCodeRequest(
        int iabseMemberDiscountRate,
        int nonIabseMemberDiscountRate,
        boolean galaDinnerFree,
        boolean accompanyingPersonFree,
        boolean technicalTourFree
) {}
