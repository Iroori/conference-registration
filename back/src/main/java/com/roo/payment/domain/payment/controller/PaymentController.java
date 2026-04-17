package com.roo.payment.domain.payment.controller;

import com.roo.payment.common.response.ApiResponse;
import com.roo.payment.domain.payment.dto.CancelRequest;
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
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /**
     * 결제 생성 및 완료
     * POST /api/payments
     */
    @PostMapping
    public ResponseEntity<ApiResponse<PaymentResponse>> createPayment(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PaymentRequest request) {
        log.info("[PAYMENT_CTRL] 결제 요청 수신 — email={} options={}",
                userDetails.getUsername(), request.selectedOptionIds());
        PaymentResponse response = paymentService.createPayment(userDetails.getUsername(), request);
        log.info("[PAYMENT_CTRL] 결제 완료 응답 — email={} regNo={}",
                userDetails.getUsername(), response.registrationNumber());
        return ResponseEntity.ok(ApiResponse.ok("결제가 완료되었습니다.", response));
    }

    /**
     * 내 결제 내역 조회
     * GET /api/payments/me
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getMyPayments(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<PaymentResponse> payments = paymentService.getMyPayments(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(payments));
    }

    /**
     * 결제 취소
     * POST /api/payments/cancel
     */
    @PostMapping("/cancel")
    public ResponseEntity<ApiResponse<Map<String, Object>>> cancelPayment(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CancelRequest request) {
        Map<String, Object> result = paymentService.cancelPayment(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /**
     * 결제 실패 이벤트 수신 — 프론트엔드 PayGate 팝업 실패 시 서버 로그 기록
     * POST /api/payments/failure
     */
    @PostMapping("/failure")
    public ResponseEntity<ApiResponse<Void>> recordPaymentFailure(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PaymentFailureRequest request) {
        log.warn("[PAYMENT_CTRL] 결제 실패 이벤트 수신 — email={} replycode={} replyMsg={} tid={}",
                userDetails.getUsername(),
                request.replycode(),
                request.replyMsg(),
                request.tid() != null ? request.tid() : "N/A");
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
