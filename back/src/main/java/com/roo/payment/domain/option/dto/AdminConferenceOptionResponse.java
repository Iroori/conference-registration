package com.roo.payment.domain.option.dto;

import com.roo.payment.domain.option.entity.ConferenceOption;
import com.roo.payment.domain.option.entity.OptionCategory;
import com.roo.payment.domain.user.entity.MemberType;

/**
 * 관리자 전용 옵션 응답 DTO.
 * 잔여 좌석(maxCapacity/currentCount)을 포함한다.
 */
public record AdminConferenceOptionResponse(
        String id,
        OptionCategory category,
        String nameKr,
        String nameEn,
        String description,
        long price,
        boolean isFree,
        boolean isRequired,
        boolean requiresUpload,
        MemberType allowedMemberType,
        Integer maxCapacity,
        int currentCount,
        int remaining,
        boolean available
) {
    public static AdminConferenceOptionResponse from(ConferenceOption option) {
        int remaining = option.getMaxCapacity() != null
                ? option.getMaxCapacity() - option.getCurrentCount()
                : Integer.MAX_VALUE;
        return new AdminConferenceOptionResponse(
                option.getId(),
                option.getCategory(),
                option.getNameKr(),
                option.getNameEn(),
                option.getDescription(),
                option.getPrice(),
                option.isFree(),
                option.isRequired(),
                option.isRequiresUpload(),
                option.getAllowedMemberType(),
                option.getMaxCapacity(),
                option.getCurrentCount(),
                remaining,
                option.hasCapacity()
        );
    }
}
