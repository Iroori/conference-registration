package com.roo.payment.domain.payment.dto;

import com.roo.payment.domain.option.dto.ConferenceOptionResponse;
import com.roo.payment.domain.payment.entity.AccompanyingPerson;
import com.roo.payment.domain.payment.entity.Payment;
import com.roo.payment.domain.payment.entity.PaymentMethod;
import com.roo.payment.domain.payment.entity.PaymentStatus;
import com.roo.payment.domain.user.entity.MemberType;

import java.time.format.DateTimeFormatter;
import java.util.List;

public record PaymentResponse(
        Long id,
        String registrationNumber,
        String email,
        String lastName,
        String firstName,
        String affiliation,
        MemberType memberType,
        PaymentStatus status,
        PaymentMethod paymentMethod,
        long subtotal,
        long tax,
        long totalAmount,
        String paidAt,
        List<ConferenceOptionResponse> selectedOptions,
        List<AccompanyingPersonInfo> accompanyingPersons,
        List<ExhibitorBadgeInfo> exhibitorBadges,
        String appliedDiscountCode,
        long discountTotalAmount,
        long discountRegAmount,
        long discountGalaAmount,
        long discountAccompAmount,
        long discountTourAmount,
        String passportFirstName,
        String passportLastName,
        String passportNumber,
        String birthDate
) {
    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public record AccompanyingPersonInfo(String lastName, String firstName) {
        public static AccompanyingPersonInfo from(AccompanyingPerson ap) {
            return ap == null ? null
                    : new AccompanyingPersonInfo(ap.getLastName(), ap.getFirstName());
        }
    }

    public record ExhibitorBadgeInfo(String lastName, String firstName) {
        public static ExhibitorBadgeInfo from(com.roo.payment.domain.payment.entity.ExhibitorBadge eb) {
            return eb == null ? null
                    : new ExhibitorBadgeInfo(eb.getLastName(), eb.getFirstName());
        }
    }

    public static PaymentResponse from(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getRegistrationNumber(),
                payment.getUser().getEmail(),
                payment.getUser().getLastName(),
                payment.getUser().getFirstName(),
                payment.getUser().getAffiliation(),
                payment.getMemberType(),
                payment.getStatus(),
                payment.getPaymentMethod(),
                payment.getSubtotal(),
                payment.getTax(),
                payment.getTotalAmount(),
                payment.getPaidAt() != null ? payment.getPaidAt().format(FORMATTER) : null,
                payment.getSelectedOptions().stream()
                        .map(ConferenceOptionResponse::from)
                        .toList(),
                payment.getAccompanyingPersons().stream()
                        .map(AccompanyingPersonInfo::from)
                        .toList(),
                payment.getExhibitorBadges().stream()
                        .map(ExhibitorBadgeInfo::from)
                        .toList(),
                payment.getAppliedDiscountCode(),
                payment.getDiscountTotalAmount(),
                payment.getDiscountRegAmount(),
                payment.getDiscountGalaAmount(),
                payment.getDiscountAccompAmount(),
                payment.getDiscountTourAmount(),
                payment.getUser().getPassportFirstName(),
                payment.getUser().getPassportLastName(),
                payment.getUser().getPassportNumber(),
                payment.getUser().getBirthDate() != null ? payment.getUser().getBirthDate().toString() : null
        );
    }
}
