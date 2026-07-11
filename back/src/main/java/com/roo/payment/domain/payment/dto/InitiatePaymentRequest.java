package com.roo.payment.domain.payment.dto;

import com.roo.payment.domain.payment.entity.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

public record InitiatePaymentRequest(
                @NotEmpty List<String> selectedOptionIds,

                /** optionId → quantity. If absent for an option, defaults to 1. */
                Map<String, Integer> quantities,

                @NotNull PaymentMethod paymentMethod,

                @Valid List<AccompanyingPersonInfo> accompanyingPersons,
                @Valid List<ExhibitorBadgeInfo> exhibitorBadges,
                List<String> waitlistedOptionIds,
                @Size(max = 100) String iabseId,
                java.time.LocalDate birthDate,
                @Size(max = 30) String appliedDiscountCode,
                @Size(max = 100) String passportFirstName,
                @Size(max = 100) String passportLastName,
                @Size(max = 100) String passportNumber) {

        public record AccompanyingPersonInfo(
                        @NotBlank @Size(max = 100) String lastName,
                        @NotBlank @Size(max = 100) String firstName) {
        }

        public record ExhibitorBadgeInfo(
                        @NotBlank @Size(max = 100) String lastName,
                        @NotBlank @Size(max = 100) String firstName) {
        }
}
