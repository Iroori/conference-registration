package com.roo.payment.domain.user.dto;

import com.roo.payment.domain.user.entity.DietaryRequirement;
import com.roo.payment.domain.user.entity.MemberType;
import com.roo.payment.domain.user.entity.User;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record AdminUserResponse(
        Long id,
        String email,
        String lastName,
        String firstName,
        String affiliation,
        String position,
        String country,
        String phone,
        LocalDate birthDate,
        MemberType memberType,
        boolean emailVerified,
        boolean presenter,
        boolean author,
        boolean admin,
        LocalDateTime createdAt,
        String paperInfo,
        DietaryRequirement dietaryRequirement,
        String dietaryNote,
        String iabseId,
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
        String passportNumber
) {
    public static AdminUserResponse from(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getEmail(),
                user.getLastName(),
                user.getFirstName(),
                user.getAffiliation(),
                user.getPosition(),
                user.getCountry(),
                user.getPhone(),
                user.getBirthDate(),
                user.getMemberType(),
                user.isEmailVerified(),
                user.isPresenter(),
                user.isAuthor(),
                user.isAdmin(),
                user.getCreatedAt(),
                user.getPaperInfo(),
                user.getDietaryRequirement(),
                user.getDietaryNote(),
                user.getIabseId(),
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
                user.getPassportNumber()
        );
    }
}

