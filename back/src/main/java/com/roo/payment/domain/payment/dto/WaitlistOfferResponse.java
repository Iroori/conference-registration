package com.roo.payment.domain.payment.dto;

/**
 * 유저가 받은 유효 오퍼 — 전용 결제 페이지에서 잠긴 라인아이템으로 표시.
 * quantity 만큼 청구되며 total = price × quantity.
 */
public record WaitlistOfferResponse(
        Long waitlistId,
        String optionId,
        String optionName,
        long price,
        int quantity,
        long totalAmount,
        String offerExpiresAt
) {
}
