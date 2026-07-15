package com.roo.payment.domain.payment.controller;

import com.roo.payment.common.response.ApiResponse;
import com.roo.payment.config.AppProperties;
import com.roo.payment.domain.payment.dto.PaymentResponse;
import com.roo.payment.domain.payment.entity.Payment;
import com.roo.payment.domain.payment.entity.PaymentStatus;
import com.roo.payment.domain.payment.entity.PaymentType;
import com.roo.payment.domain.payment.entity.OptionWaitlist;
import com.roo.payment.domain.payment.repository.PaymentRepository;
import com.roo.payment.domain.payment.repository.DiscountCodeRepository;
import com.roo.payment.domain.payment.repository.OptionWaitlistRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.Authentication;

import java.util.List;

/**
 * 관리자 전용 결제 조회 API.
 * X-Admin-Key 헤더가 App Properties의 admin.secretKey와 일치하거나,
 * JWT 토큰을 통한 ROLE_ADMIN 권한을 가질 시 접근 가능.
 */
@RestController
@RequestMapping("/api/admin/payments")
public class AdminPaymentController {

    private static final Logger log = LoggerFactory.getLogger(AdminPaymentController.class);

    private final PaymentRepository paymentRepository;
    private final DiscountCodeRepository discountCodeRepository;
    private final OptionWaitlistRepository optionWaitlistRepository;
    private final AppProperties appProperties;

    public AdminPaymentController(PaymentRepository paymentRepository, DiscountCodeRepository discountCodeRepository,
                                  OptionWaitlistRepository optionWaitlistRepository, AppProperties appProperties) {
        this.paymentRepository = paymentRepository;
        this.discountCodeRepository = discountCodeRepository;
        this.optionWaitlistRepository = optionWaitlistRepository;
        this.appProperties = appProperties;
    }

    /**
     * 전체 결제 목록 조회 (옵션 포함)
     * GET /api/admin/payments
     * Header: X-Admin-Key: {ADMIN_SECRET}
     */
    @GetMapping
    public ResponseEntity<ApiResponse<?>> getAllPayments(
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String search) {

        validateAdminKey(adminKey);

        if (page != null && size != null) {
            org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                    page, size, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"));
            org.springframework.data.domain.Page<Payment> paymentPage;
            if (search == null || search.trim().isEmpty()) {
                paymentPage = paymentRepository.findAll(pageable);
            } else {
                paymentPage = paymentRepository.searchPayments(search.trim(), pageable);
            }
            List<PaymentResponse> paymentList = paymentPage.getContent().stream()
                    .map(PaymentResponse::from)
                    .toList();

            com.roo.payment.domain.payment.dto.PaginatedPaymentResponse response = new com.roo.payment.domain.payment.dto.PaginatedPaymentResponse(
                    paymentList,
                    paymentPage.getTotalElements(),
                    paymentPage.getTotalPages(),
                    paymentPage.getNumber(),
                    paymentPage.getSize()
            );

            log.info("[ADMIN] 결제 목록 페이징 조회 — page={}, size={}, search={}, totalElements={}", page, size, search, paymentPage.getTotalElements());
            return ResponseEntity.ok(ApiResponse.ok(response));
        } else {
            List<PaymentResponse> payments = paymentRepository.findAllWithOptions()
                    .stream()
                    .map(PaymentResponse::from)
                    .toList();

            log.info("[ADMIN] 전체 결제 목록 조회 — count={}", payments.size());
            return ResponseEntity.ok(ApiResponse.ok(payments));
        }
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

    /**
     * 결제 내역 삭제 및 관련 상태 복원 (어드민용)
     * DELETE /api/admin/payments/{id}
     */
    @DeleteMapping("/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<ApiResponse<Void>> deletePayment(
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @PathVariable Long id) {

        validateAdminKey(adminKey);

        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new com.roo.payment.common.exception.BusinessException(
                        com.roo.payment.common.exception.ErrorCode.PAYMENT_NOT_FOUND));

        log.info("[ADMIN] Deleting payment record id={}, regNo={}", id, payment.getRegistrationNumber());

        // 1. COMPLETED 결제 건에 대해서 옵션 정원 복원
        if (payment.getStatus() == PaymentStatus.COMPLETED) {
            if (payment.getPaymentType() == PaymentType.WAITLIST) {
                // WAITLIST 결제 — 오퍼 수량만큼 복원하고 대기건을 다시 대기열로 되돌림
                optionWaitlistRepository.findByFulfilledPaymentId(payment.getId()).ifPresent(w -> {
                    w.getOption().decreaseCount(w.getOfferedQuantity());
                    w.revertFulfillment();
                    optionWaitlistRepository.save(w);
                    log.info("[ADMIN] Reverted waitlist fulfillment id={}, restored {} seat(s)", w.getId(), w.getOfferedQuantity());
                });
            } else {
                payment.getSelectedOptions().forEach(o -> {
                    o.decreaseCount();
                    log.info("[ADMIN] Restored option count for '{}' due to payment deletion", o.getNameEn());
                });
            }
        }

        // 1-2. 이 결제에 매달린 대기자(intake) 행 삭제 — FK 무결성 보장
        java.util.List<OptionWaitlist> intakeWaitlists = optionWaitlistRepository.findByPaymentId(payment.getId());
        if (!intakeWaitlists.isEmpty()) {
            optionWaitlistRepository.deleteAll(intakeWaitlists);
            log.info("[ADMIN] Deleted {} waitlist intake row(s) for payment id={}", intakeWaitlists.size(), payment.getId());
        }

        // 2. 할인 코드를 사용한 결제 건의 경우, 할인 코드 미사용으로 상태 복원
        String appliedCode = payment.getAppliedDiscountCode();
        if (appliedCode != null && !appliedCode.isBlank()) {
            discountCodeRepository.findByCode(appliedCode).ifPresent(dc -> {
                dc.markAsUnused();
                discountCodeRepository.save(dc);
                log.info("[ADMIN] Restored discount code '{}' to unused status", appliedCode);
            });
        }

        // 3. ManyToMany 옵션 관계 해제
        payment.getSelectedOptions().clear();

        // 4. 결제 기록 삭제
        paymentRepository.delete(payment);

        return ResponseEntity.ok(ApiResponse.ok("Payment record deleted successfully.", null));
    }

    private void validateAdminKey(String adminKey) {
        // 1. Spring Security Context 에서 ROLE_ADMIN 권한이 있는지 확인
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return; // ROLE_ADMIN 권한을 소지하고 있으므로 X-Admin-Key 헤더 검증 패스
        }

        // 2. 권한이 없을 경우 기존 X-Admin-Key 검증 진행
        String expected = appProperties.getAdmin().getSecretKey();
        if (expected == null || !expected.equals(adminKey)) {
            log.warn("[ADMIN] 유효하지 않은 관리자 키로 접근 시도");
            throw new com.roo.payment.common.exception.BusinessException(
                    com.roo.payment.common.exception.ErrorCode.FORBIDDEN);
        }
    }
}
