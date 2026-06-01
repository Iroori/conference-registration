package com.roo.payment.domain.user.dto;

import com.roo.payment.domain.user.entity.DietaryRequirement;
import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record SignupRequest(
        @NotBlank @Email
        String email,

        // Received as a SHA-256 hex digest (64 chars) — password strength is enforced client-side
        @NotBlank @Size(min = 64, max = 64)
        String password,

        @NotBlank @Size(max = 100)
        String lastName,

        @NotBlank @Size(max = 100)
        String firstName,

        @NotBlank @Size(max = 200)
        String affiliation,

        @NotBlank @Size(max = 100)
        String position,

        @NotBlank @Size(max = 100)
        String country,

        @Size(max = 50)
        String phone,

        LocalDate birthDate,

        Boolean isPresenter,

        @NotNull
        DietaryRequirement dietaryRequirement,

        @Size(max = 200)
        String dietaryNote,

        @Size(max = 300)
        String paperInfo,

        @Size(max = 100)
        String iabseId,

        @Size(max = 200)
        String billingUniversity,

        @Size(max = 100)
        String billingVat,

        @Size(max = 100)
        String billingPoNumber,

        @Size(max = 300)
        String billingStreet,

        @Size(max = 300)
        String billingAdditionalInfo,

        @Size(max = 50)
        String billingPoBox,

        @Size(max = 50)
        String billingPostcode,

        @Size(max = 100)
        String billingCity,

        @Size(max = 100)
        String billingCountry
) {}
