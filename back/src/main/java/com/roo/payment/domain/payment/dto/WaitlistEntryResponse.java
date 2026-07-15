package com.roo.payment.domain.payment.dto;

/**
 * 관리자 대기자 리스트의 개별 대기자 항목.
 */
public record WaitlistEntryResponse(
        Long waitlistId,
        int position,
        String userEmail,
        String userName,
        String requestedAt,
        String status,               // WAITING / OFFERED / COMPLETED / EXPIRED / CANCELLED
        String parentPaymentStatus,  // 원 등록 결제 상태 (PENDING/COMPLETED/FAILED...)
        int offeredQuantity,         // OFFERED 상태일 때 오퍼된 수량
        String offeredAt,
        String offerExpiresAt,
        boolean offerExpired
) {
}
