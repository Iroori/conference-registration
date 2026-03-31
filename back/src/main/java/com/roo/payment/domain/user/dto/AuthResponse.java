package com.roo.payment.domain.user.dto;

import com.roo.payment.domain.user.entity.MemberType;
import com.roo.payment.domain.user.entity.User;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String email,
        String nameKr,
        String nameEn,
        String affiliation,
        String position,
        MemberType memberType,
        boolean isYoungEngineer
) {
    public static AuthResponse of(String accessToken, String refreshToken, User user) {
        return new AuthResponse(
                accessToken,
                refreshToken,
                user.getEmail(),
                user.getNameKr(),
                user.getNameEn(),
                user.getAffiliation(),
                user.getPosition(),
                user.getMemberType(),
                user.isYoungEngineer()
        );
    }
}
