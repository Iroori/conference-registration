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
        String paperInfo,

        String billingUniversity,
        String billingVat,
        String billingPoNumber,
        String billingStreet,
        String billingAdditionalInfo,
        String billingPoBox,
        String billingPostcode,
        String billingCity,
        String billingCountry,

        String passportFirstName,
        String passportLastName,
        String passportNumber,
        java.time.LocalDate birthDate
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
                user.getPaperInfo(),

                user.getBillingUniversity(),
                user.getBillingVat(),
                user.getBillingPoNumber(),
                user.getBillingStreet(),
                user.getBillingAdditionalInfo(),
                user.getBillingPoBox(),
                user.getBillingPostcode(),
                user.getBillingCity(),
                user.getBillingCountry(),

                user.getPassportFirstName(),
                user.getPassportLastName(),
                user.getPassportNumber(),
                user.getBirthDate()
        );
    }
}
