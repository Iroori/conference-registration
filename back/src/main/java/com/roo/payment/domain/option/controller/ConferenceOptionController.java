package com.roo.payment.domain.option.controller;

import com.roo.payment.common.response.ApiResponse;
import com.roo.payment.domain.option.dto.ConferenceOptionResponse;
import com.roo.payment.domain.option.service.ConferenceOptionService;
import com.roo.payment.domain.user.entity.MemberType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/options")
public class ConferenceOptionController {

    private final ConferenceOptionService optionService;

    public ConferenceOptionController(ConferenceOptionService optionService) {
        this.optionService = optionService;
    }

    /**
     * 회원 유형별 컨퍼런스 옵션 목록
     * GET /api/options?memberType=MEMBER
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ConferenceOptionResponse>>> getOptions(
            @RequestParam(defaultValue = "NON_MEMBER") MemberType memberType) {
        return ResponseEntity.ok(ApiResponse.ok(optionService.getOptions(memberType)));
    }
}
