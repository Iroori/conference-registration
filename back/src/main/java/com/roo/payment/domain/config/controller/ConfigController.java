package com.roo.payment.domain.config.controller;

import com.roo.payment.common.response.ApiResponse;
import com.roo.payment.config.AppProperties;
import com.roo.payment.domain.config.dto.RegistrationPeriodsResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 클라이언트가 조회하는 공용 설정 엔드포인트.
 * 인증 불필요 — CORS만 통과하면 접근 가능.
 */
@RestController
@RequestMapping("/api/config")
public class ConfigController {

    private final AppProperties appProperties;

    public ConfigController(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    /**
     * Pre-Registration / Early Bird / Regular 각 티어의 시작/종료일 반환.
     * 프론트는 현재 시각과 비교하여 active tier 판정.
     */
    @GetMapping("/registration-periods")
    public ResponseEntity<ApiResponse<RegistrationPeriodsResponse>> getRegistrationPeriods() {
        return ResponseEntity.ok(ApiResponse.ok(
                RegistrationPeriodsResponse.from(appProperties.getRegistration())
        ));
    }
}
