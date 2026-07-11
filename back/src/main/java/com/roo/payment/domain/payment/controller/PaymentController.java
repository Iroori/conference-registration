package com.roo.payment.domain.payment.controller;

import com.roo.payment.common.response.ApiResponse;
import com.roo.payment.domain.payment.dto.PaymentFailureRequest;
import com.roo.payment.domain.payment.dto.InitiatePaymentRequest;
import com.roo.payment.domain.payment.dto.CompletePaymentRequest;
import com.roo.payment.domain.payment.dto.PaymentResponse;
import com.roo.payment.domain.payment.service.PaymentService;
import com.roo.payment.domain.payment.dto.DiscountCodeResponse;
import com.roo.payment.domain.payment.entity.DiscountCode;
import com.roo.payment.domain.payment.service.DiscountCodeService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    private final PaymentService paymentService;
    private final DiscountCodeService discountCodeService;

    public PaymentController(PaymentService paymentService, DiscountCodeService discountCodeService) {
        this.paymentService = paymentService;
        this.discountCodeService = discountCodeService;
    }

    /**
     * Verify discount code for logged-in user
     * GET /api/payments/discount-code/verify
     */
    @GetMapping("/discount-code/verify")
    public ResponseEntity<ApiResponse<DiscountCodeResponse>> verifyDiscountCode(
            @AuthenticationPrincipal String email,
            @RequestParam String code) {
        log.info("[PAYMENT_CTRL] Verifying discount code — email={} code={}", email, code);
        DiscountCode dc = discountCodeService.verifyDiscountCode(code);
        return ResponseEntity.ok(ApiResponse.ok("Discount code is valid.", DiscountCodeResponse.from(dc)));
    }

    /**
     * Initiate payment (pre-PG registration)
     * POST /api/payments/initiate
     */
    @PostMapping("/initiate")
    public ResponseEntity<ApiResponse<PaymentResponse>> initiatePayment(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody InitiatePaymentRequest request) {
        log.info("[PAYMENT_CTRL] Initiate request received — email={} options={}", email, request.selectedOptionIds());
        PaymentResponse response = paymentService.initiatePayment(email, request);
        return ResponseEntity.ok(ApiResponse.ok("Payment initiated. Please proceed to checkout.", response));
    }

    /**
     * Complete payment (post-PG success validation)
     * POST /api/payments/complete
     */
    @PostMapping("/complete")
    public ResponseEntity<ApiResponse<PaymentResponse>> completePayment(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody CompletePaymentRequest request) {
        log.info("[PAYMENT_CTRL] Complete request received — email={} regNo={} tid={}", email, request.registrationNumber(), request.tid());
        PaymentResponse response = paymentService.completePayment(email, request);
        return ResponseEntity.ok(ApiResponse.ok("Payment completed successfully.", response));
    }

    /**
     * PayGate Server-to-Server Callback (Failsafe)
     * POST /api/payments/paygate/callback
     */
    @PostMapping(value = "/paygate/callback", produces = "text/html;charset=UTF-8")
    @ResponseBody
    public String paygateCallback(
            @RequestParam("tid") String tid,
            @RequestParam("mb_serial_no") String mbSerialNo,
            @RequestParam("replycode") String replycode) {
        log.info("[PAYMENT_CTRL] Callback received from PayGate — tid={} mbSerialNo={} replycode={}", tid, mbSerialNo, replycode);
        try {
            paymentService.handlePaygateCallback(tid, mbSerialNo, replycode);
            return String.format("<PGTL><VERIFYRECEIVED>RCVD</VERIFYRECEIVED><TID>%s</TID></PGTL>", tid);
        } catch (Exception e) {
            log.error("[PAYMENT_CTRL] Callback process error — tid={} mbSerialNo={} error={}", tid, mbSerialNo, e.getMessage());
            return String.format("<PGTL><VERIFYRECEIVED>ERR</VERIFYRECEIVED><TID>%s</TID></PGTL>", tid);
        }
    }

    /**
     * Retrieve my payment history
     * GET /api/payments/me
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getMyPayments(
            @AuthenticationPrincipal String email) {
        List<PaymentResponse> payments = paymentService.getMyPayments(email);
        return ResponseEntity.ok(ApiResponse.ok(payments));
    }



    /**
     * Receive payment failure event from frontend (PayGate popup failure)
     * POST /api/payments/failure
     */
    @PostMapping("/failure")
    public ResponseEntity<ApiResponse<Void>> recordPaymentFailure(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody PaymentFailureRequest request) {
        log.warn("[PAYMENT_CTRL] Payment failure event received — email={} replycode={} replyMsg={} tid={}",
                email,
                request.replycode(),
                request.replyMsg(),
                request.tid() != null ? request.tid() : "N/A");
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
