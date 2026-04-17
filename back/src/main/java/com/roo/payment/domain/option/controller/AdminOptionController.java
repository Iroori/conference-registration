package com.roo.payment.domain.option.controller;

import com.roo.payment.common.response.ApiResponse;
import com.roo.payment.domain.option.dto.AdminConferenceOptionResponse;
import com.roo.payment.domain.option.service.ConferenceOptionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 관리자 전용 옵션 엔드포인트.
 * SecurityConfig가 /api/admin/** 경로에 ROLE_ADMIN 을 요구하므로,
 * 이 컨트롤러에 접근하려면 admin=true 인 사용자의 JWT가 필요하다.
 */
@RestController
@RequestMapping("/api/admin/options")
@PreAuthorize("hasRole('ADMIN')")
public class AdminOptionController {

    private final ConferenceOptionService optionService;

    public AdminOptionController(ConferenceOptionService optionService) {
        this.optionService = optionService;
    }

    /** 전체 옵션 조회 (잔여 좌석 포함) */
    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminConferenceOptionResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(optionService.getAllOptionsForAdmin()));
    }
}
