package com.roo.payment.domain.user.dto;

import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record SignupRequest(
        @NotBlank @Email
        String email,

        // Received as a SHA-256 hex digest (64 chars) — password strength is enforced client-side
        @NotBlank @Size(min = 64, max = 64)
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
        LocalDate birthDate,

        Boolean isPresenter
) {}
