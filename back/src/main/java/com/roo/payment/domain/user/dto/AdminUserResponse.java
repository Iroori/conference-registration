package com.roo.payment.domain.user.dto;

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
        String paperInfo
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
                user.getPaperInfo()
        );
    }
}
