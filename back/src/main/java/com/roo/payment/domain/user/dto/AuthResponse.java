package com.roo.payment.domain.user.dto;

import com.roo.payment.domain.user.entity.DietaryRequirement;
import com.roo.payment.domain.user.entity.MemberType;
import com.roo.payment.domain.user.entity.User;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String email,
        String lastName,
        String firstName,
        String affiliation,
        String position,
        String country,
        String phone,
        MemberType memberType,
        boolean isYoungEngineer,
        boolean isPresenter,
        boolean isAuthor,
        DietaryRequirement dietaryRequirement,
        String dietaryNote,
        boolean admin,
        String paperInfo
) {
    public static AuthResponse of(String accessToken, String refreshToken, User user) {
        return new AuthResponse(
                accessToken,
                refreshToken,
                user.getEmail(),
                user.getLastName(),
                user.getFirstName(),
                user.getAffiliation(),
                user.getPosition(),
                user.getCountry(),
                user.getPhone(),
                user.getMemberType(),
                user.isYoungEngineer(),
                user.isPresenter(),
                user.isAuthor(),
                user.getDietaryRequirement(),
                user.getDietaryNote(),
                user.isAdmin(),
                user.getPaperInfo()
        );
    }
}
