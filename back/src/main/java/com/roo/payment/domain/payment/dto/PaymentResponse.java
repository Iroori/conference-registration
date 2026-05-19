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
        AccompanyingPersonInfo accompanyingPerson
) {
    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public record AccompanyingPersonInfo(String lastName, String firstName) {
        static AccompanyingPersonInfo from(AccompanyingPerson ap) {
            return ap == null ? null
                    : new AccompanyingPersonInfo(ap.getLastName(), ap.getFirstName());
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
                AccompanyingPersonInfo.from(payment.getAccompanyingPerson())
        );
    }
}
