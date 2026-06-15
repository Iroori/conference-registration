package com.roo.payment.domain.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @NotBlank @Size(max = 100) String firstName,
    @NotBlank @Size(max = 100) String lastName,
    @NotBlank @Size(max = 200) String affiliation,
    @NotBlank @Size(max = 100) String country,
    @NotBlank @Size(max = 100) String position,
    @NotBlank @Size(max = 50) String phone,

    @NotBlank @Size(max = 200) String billingUniversity,
    @Size(max = 100) String billingVat,
    @Size(max = 100) String billingPoNumber,
    @NotBlank @Size(max = 300) String billingStreet,
    @Size(max = 300) String billingAdditionalInfo,
    @Size(max = 50) String billingPoBox,
    @NotBlank @Size(max = 50) String billingPostcode,
    @NotBlank @Size(max = 100) String billingCity,
    @NotBlank @Size(max = 100) String billingCountry,

    boolean isPresenter,
    boolean isAuthor,
    @Size(max = 300) String paperInfo,

    @Size(max = 100) String passportFirstName,
    @Size(max = 100) String passportLastName,
    @Size(max = 100) String passportNumber,
    java.time.LocalDate birthDate
) {}
