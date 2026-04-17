package com.roo.payment.domain.payment.controller;

import com.roo.payment.common.response.ApiResponse;
import com.roo.payment.config.AppProperties;
import com.roo.payment.domain.payment.dto.PaymentResponse;
import com.roo.payment.domain.payment.entity.Payment;
import com.roo.payment.domain.payment.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 관리자 전용 결제 조회 API.
 * X-Admin-Key 헤더가 App Properties의 admin.secretKey와 일치해야 접근 가능.
 */
@RestController
@RequestMapping("/api/admin/payments")
public class AdminPaymentController {

    private static final Logger log = LoggerFactory.getLogger(AdminPaymentController.class);

    private final PaymentRepository paymentRepository;
    private final AppProperties appProperties;

    public AdminPaymentController(PaymentRepository paymentRepository, AppProperties appProperties) {
        this.paymentRepository = paymentRepository;
        this.appProperties = appProperties;
    }

    /**
     * 전체 결제 목록 조회 (옵션 포함)
     * GET /api/admin/payments
     * Header: X-Admin-Key: {ADMIN_SECRET}
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getAllPayments(
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey) {

        validateAdminKey(adminKey);

        List<PaymentResponse> payments = paymentRepository.findAllWithOptions()
                .stream()
                .map(PaymentResponse::from)
                .toList();

        log.info("[ADMIN] 전체 결제 목록 조회 — count={}", payments.size());
        return ResponseEntity.ok(ApiResponse.ok(payments));
    }

    /**
     * 단건 결제 상세 조회
     * GET /api/admin/payments/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentById(
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @PathVariable Long id) {

        validateAdminKey(adminKey);

        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new com.roo.payment.common.exception.BusinessException(
                        com.roo.payment.common.exception.ErrorCode.PAYMENT_NOT_FOUND));

        log.info("[ADMIN] 결제 단건 조회 — id={}", id);
        return ResponseEntity.ok(ApiResponse.ok(PaymentResponse.from(payment)));
    }

    private void validateAdminKey(String adminKey) {
        String expected = appProperties.getAdmin().getSecretKey();
        if (expected == null || !expected.equals(adminKey)) {
            log.warn("[ADMIN] 유효하지 않은 관리자 키로 접근 시도");
            throw new com.roo.payment.common.exception.BusinessException(
                    com.roo.payment.common.exception.ErrorCode.FORBIDDEN);
        }
    }
}
