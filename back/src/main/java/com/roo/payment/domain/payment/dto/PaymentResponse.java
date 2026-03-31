package com.roo.payment.domain.payment.dto;

import com.roo.payment.domain.option.dto.ConferenceOptionResponse;
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
        String nameKr,
        String nameEn,
        String affiliation,
        MemberType memberType,
        PaymentStatus status,
        PaymentMethod paymentMethod,
        long subtotal,
        long tax,
        long totalAmount,
        String paidAt,
        List<ConferenceOptionResponse> selectedOptions
) {
    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public static PaymentResponse from(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getRegistrationNumber(),
                payment.getUser().getEmail(),
                payment.getUser().getNameKr(),
                payment.getUser().getNameEn(),
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
                        .toList()
        );
    }
}
