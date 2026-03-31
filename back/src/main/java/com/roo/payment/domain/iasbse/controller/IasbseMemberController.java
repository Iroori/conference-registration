package com.roo.payment.domain.iasbse.controller;

import com.roo.payment.common.response.ApiResponse;
import com.roo.payment.config.AppProperties;
import com.roo.payment.domain.iasbse.dto.IasbseCheckResponse;
import com.roo.payment.domain.iasbse.service.IasbseMemberService;
import jakarta.validation.constraints.Email;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/iasbse")
public class IasbseMemberController {

    private final IasbseMemberService iasbseMemberService;
    private final AppProperties appProperties;

    public IasbseMemberController(IasbseMemberService iasbseMemberService, AppProperties appProperties) {
        this.iasbseMemberService = iasbseMemberService;
        this.appProperties = appProperties;
    }

    /**
     * 회원가입 폼에서 이메일 입력 시 실시간 IASBSE 회원 여부 확인
     * GET /api/iasbse/check?email=xxx@xxx.com
     */
    @GetMapping("/check")
    public ResponseEntity<ApiResponse<IasbseCheckResponse>> checkMembership(
            @RequestParam @Email String email) {

        boolean isMember = iasbseMemberService.isIasbseMember(email);
        IasbseCheckResponse response = isMember
                ? IasbseCheckResponse.member()
                : IasbseCheckResponse.notMember();

        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * 관리자 - 엑셀 파일로 IASBSE 회원 데이터 일괄 업로드
     * POST /api/iasbse/admin/import
     * Header: X-Admin-Key: {adminSecretKey}
     */
    @PostMapping("/admin/import")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> importMembers(
            @RequestHeader("X-Admin-Key") String adminKey,
            @RequestParam("file") MultipartFile file) throws IOException {

        if (!appProperties.getAdmin().getSecretKey().equals(adminKey)) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.fail("관리자 인증이 필요합니다."));
        }

        int imported = iasbseMemberService.importFromExcel(file);
        return ResponseEntity.ok(ApiResponse.ok(
                "IASBSE 회원 데이터 업로드 완료",
                Map.of("imported", imported)
        ));
    }
}
