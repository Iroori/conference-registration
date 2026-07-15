package com.roo.payment.domain.payment.dto;

/**
 * 관리자 대기자 요약 — 대기자가 존재하는 옵션별 집계.
 */
public record WaitlistSummaryResponse(
        String optionId,
        String optionName,
        Integer maxCapacity,
        int currentCount,
        int availableSeats,
        long waitingCount,
        long offeredCount
) {
}
