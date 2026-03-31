package com.roo.payment.domain.option.dto;

import com.roo.payment.domain.option.entity.ConferenceOption;
import com.roo.payment.domain.option.entity.OptionCategory;
import com.roo.payment.domain.user.entity.MemberType;

public record ConferenceOptionResponse(
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
        boolean available
) {
    public static ConferenceOptionResponse from(ConferenceOption option) {
        return new ConferenceOptionResponse(
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
                option.hasCapacity()
        );
    }
}
