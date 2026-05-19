package com.roo.payment.domain.payment.controller;

import com.roo.payment.common.response.ApiResponse;
import com.roo.payment.domain.payment.dto.PaymentFailureRequest;
import com.roo.payment.domain.payment.dto.PaymentRequest;
import com.roo.payment.domain.payment.dto.PaymentResponse;
import com.roo.payment.domain.payment.service.PaymentService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /**
     * Create and complete payment
     * POST /api/payments
     */
    @PostMapping
    public ResponseEntity<ApiResponse<PaymentResponse>> createPayment(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PaymentRequest request) {
        log.info("[PAYMENT_CTRL] Payment request received — email={} options={}",
                userDetails.getUsername(), request.selectedOptionIds());
        PaymentResponse response = paymentService.createPayment(userDetails.getUsername(), request);
        log.info("[PAYMENT_CTRL] Payment completed — email={} regNo={}",
                userDetails.getUsername(), response.registrationNumber());
        return ResponseEntity.ok(ApiResponse.ok("Payment completed successfully.", response));
    }

    /**
     * Retrieve my payment history
     * GET /api/payments/me
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getMyPayments(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<PaymentResponse> payments = paymentService.getMyPayments(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(payments));
    }

    /**
     * Receive payment failure event from frontend (PayGate popup failure)
     * POST /api/payments/failure
     */
    @PostMapping("/failure")
    public ResponseEntity<ApiResponse<Void>> recordPaymentFailure(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PaymentFailureRequest request) {
        log.warn("[PAYMENT_CTRL] Payment failure event received — email={} replycode={} replyMsg={} tid={}",
                userDetails.getUsername(),
                request.replycode(),
                request.replyMsg(),
                request.tid() != null ? request.tid() : "N/A");
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
