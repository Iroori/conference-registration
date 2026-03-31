package com.roo.payment.domain.user.dto;

import com.roo.payment.security.validator.StrongPassword;
import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record SignupRequest(
        @NotBlank @Email
        String email,

        @NotBlank @Size(min = 8, max = 100) @StrongPassword
        String password,

        @NotBlank @Size(max = 100)
        String nameKr,

        @NotBlank @Size(max = 100)
        String nameEn,

        @NotBlank @Size(max = 200)
        String affiliation,

        @NotBlank @Size(max = 100)
        String position,

        @NotBlank @Size(max = 100)
        String country,

        @Size(max = 50)
        String phone,

        @NotNull @Past
        LocalDate birthDate
) {}
