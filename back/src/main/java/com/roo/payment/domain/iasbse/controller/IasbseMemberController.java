package com.roo.payment.domain.iasbse.controller;

import com.roo.payment.common.response.ApiResponse;
import com.roo.payment.config.AppProperties;
import com.roo.payment.domain.iasbse.service.IasbseMemberService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
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
     * 회원가입 시 IASBSE 회원 검증 (인증 불필요)
     */
    @GetMapping("/check")
    public ResponseEntity<ApiResponse<Boolean>> checkIasbseMember(
            @RequestParam String firstName,
            @RequestParam String lastName,
            @RequestParam String company) {
        boolean isMember = iasbseMemberService.isIasbseMember(firstName, lastName, company);
        return ResponseEntity.ok(ApiResponse.ok(isMember));
    }

    /**
     * 엑셀에서 추출한 고유 소속(Company) 목록 조회 (인증 불필요 - 회원가입 Dropdown 용)
     */
    @GetMapping("/companies")
    public ResponseEntity<ApiResponse<List<String>>> getCompanies() {
        List<String> companies = iasbseMemberService.getDistinctCompanies();
        return ResponseEntity.ok(ApiResponse.ok(companies));
    }

    /**
     * 관리자: 엑셀 파일 업로드
     */
    @PostMapping("/admin/import")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> importMembers(
            @RequestHeader("X-Admin-Key") String adminKey,
            @RequestParam("file") MultipartFile file) throws IOException {

        if (!appProperties.getAdmin().getSecretKey().equals(adminKey)) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.fail("Admin authentication required."));
        }

        int imported = iasbseMemberService.importFromExcel(file);
        return ResponseEntity.ok(ApiResponse.ok(
                "IASBSE member data upload complete",
                Map.of("imported", imported)
        ));
    }
}
