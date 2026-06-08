package com.roo.payment.domain.user.dto;

import java.util.List;

public record PaginatedUserResponse(
        List<AdminUserResponse> users,
        long totalElements,
        int totalPages,
        int currentPage,
        int size
) {}
