package com.roo.payment.domain.payment.dto;

import com.roo.payment.domain.payment.entity.DiscountCode;

public record DiscountCodeResponse(
        Long id,
        String code,
        int iabseMemberDiscountRate,
        int nonIabseMemberDiscountRate,
        boolean galaDinnerFree,
        boolean accompanyingPersonFree,
        boolean technicalTourFree,
        boolean used,
        boolean active
) {
    public static DiscountCodeResponse from(DiscountCode dc) {
        return new DiscountCodeResponse(
                dc.getId(),
                dc.getCode(),
                dc.getIabseMemberDiscountRate(),
                dc.getNonIabseMemberDiscountRate(),
                dc.isGalaDinnerFree(),
                dc.isAccompanyingPersonFree(),
                dc.isTechnicalTourFree(),
                dc.isUsed(),
                dc.isActive()
        );
    }
}
