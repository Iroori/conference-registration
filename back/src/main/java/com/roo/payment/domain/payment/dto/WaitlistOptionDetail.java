package com.roo.payment.domain.payment.dto;

import java.util.List;

/**
 * 관리자 대기자 상세 화면 — 특정 옵션의 좌석 현황 + FIFO 대기자 목록.
 */
public record WaitlistOptionDetail(
        String optionId,
        String optionName,
        Integer maxCapacity,   // null = 무제한
        int currentCount,
        int availableSeats,    // maxCapacity - currentCount - 미결제 오퍼 수 (무제한이면 Integer.MAX_VALUE)
        long price,
        List<WaitlistEntryResponse> entries
) {
}
