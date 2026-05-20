package com.roo.payment.domain.user.dto;

import com.roo.payment.domain.user.entity.MemberType;
import jakarta.validation.constraints.NotNull;

public record ChangeMemberTypeRequest(
        @NotNull MemberType memberType
) {}
