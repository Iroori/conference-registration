package com.roo.payment.domain.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @NotBlank @Size(max = 100) String firstName,
    @NotBlank @Size(max = 100) String lastName,
    @NotBlank @Size(max = 200) String affiliation,
    @NotBlank @Size(max = 100) String country,
    @NotBlank @Size(max = 100) String position,
    @NotBlank @Size(max = 50) String phone
) {}
