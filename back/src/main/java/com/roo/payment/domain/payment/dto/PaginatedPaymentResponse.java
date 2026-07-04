package com.roo.payment.domain.payment.dto;

import java.util.List;

public record PaginatedPaymentResponse(
        List<PaymentResponse> payments,
        long totalElements,
        int totalPages,
        int currentPage,
        int size
) {}
