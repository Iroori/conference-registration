package com.roo.payment.domain.payment.controller;

import com.roo.payment.common.response.ApiResponse;
import com.roo.payment.domain.payment.dto.WaitlistGrantRequest;
import com.roo.payment.domain.payment.dto.WaitlistOptionDetail;
import com.roo.payment.domain.payment.dto.WaitlistSummaryResponse;
import com.roo.payment.domain.payment.service.WaitlistService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 관리자 전용 대기자(Waitlist) 관리 API.
 * /api/admin/** 은 SecurityConfig 에서 ROLE_ADMIN 을 요구한다.
 */
@RestController
@RequestMapping("/api/admin/waitlists")
public class AdminWaitlistController {

    private static final Logger log = LoggerFactory.getLogger(AdminWaitlistController.class);

    private final WaitlistService waitlistService;

    public AdminWaitlistController(WaitlistService waitlistService) {
        this.waitlistService = waitlistService;
    }

    /** 대기자가 존재하는 옵션별 요약 */
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<List<WaitlistSummaryResponse>>> summary() {
        return ResponseEntity.ok(ApiResponse.ok(waitlistService.summary()));
    }

    /** 특정 옵션의 FIFO 대기자 상세 목록 + 좌석 현황 */
    @GetMapping
    public ResponseEntity<ApiResponse<WaitlistOptionDetail>> byOption(@RequestParam String optionId) {
        return ResponseEntity.ok(ApiResponse.ok(waitlistService.listByOption(optionId)));
    }

    /**
     * 대기자에게 좌석 오퍼 (수량 지정 가능).
     * 잔여 좌석 부족 시 force=true 로 초과 오퍼 승인.
     */
    @PostMapping("/{id}/offer")
    public ResponseEntity<ApiResponse<Void>> offer(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") int quantity,
            @RequestParam(defaultValue = "false") boolean force) {
        log.info("[ADMIN_WAITLIST] Offer request — id={} quantity={} force={}", id, quantity, force);
        waitlistService.offer(id, quantity, force);
        return ResponseEntity.ok(ApiResponse.ok("Offer sent to the waitlisted attendee.", null));
    }

    /** 오퍼 회수 — 다시 대기열로 */
    @PostMapping("/{id}/revoke")
    public ResponseEntity<ApiResponse<Void>> revoke(@PathVariable Long id) {
        log.info("[ADMIN_WAITLIST] Revoke request — id={}", id);
        waitlistService.revoke(id);
        return ResponseEntity.ok(ApiResponse.ok("Offer revoked.", null));
    }

    /**
     * 직접 오퍼 — 대기 신청/등록 결제 이력과 무관하게, 회원가입한 유저에게 결제 권한을 연다.
     * force 미지정 시 기본 true (정원 초과 허용).
     */
    @PostMapping("/grant")
    public ResponseEntity<ApiResponse<Void>> grant(@Valid @RequestBody WaitlistGrantRequest request) {
        boolean force = request.force() == null || request.force();
        log.info("[ADMIN_WAITLIST] Direct grant — optionId={} quantity={} force={}",
                request.optionId(), request.quantity(), force);
        waitlistService.grantAndOffer(request.email(), request.optionId(), request.quantity(), force);
        return ResponseEntity.ok(ApiResponse.ok("Payment access granted to the user.", null));
    }
}
