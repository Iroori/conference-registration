package com.roo.payment.domain.user.controller;

import com.roo.payment.common.response.ApiResponse;
import com.roo.payment.domain.iasbse.dto.AddIasbseMemberRequest;
import com.roo.payment.domain.iasbse.entity.IasbseMember;
import com.roo.payment.domain.user.dto.AdminUserResponse;
import com.roo.payment.domain.user.dto.PaginatedUserResponse;
import com.roo.payment.domain.user.dto.ChangeMemberTypeRequest;
import com.roo.payment.domain.user.service.AdminUserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminUserController {

    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    /**
     * 가입 유저 리스트 페이징 및 검색 조회
     * GET /api/admin/users
     */
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<PaginatedUserResponse>> getPaginatedUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        PaginatedUserResponse users = adminUserService.getPaginatedUsers(page, size, search);
        return ResponseEntity.ok(ApiResponse.ok(users));
    }

    /**
     * 특정 유저 회원 유형 수동 조정
     * PUT /api/admin/users/{id}/member-type
     */
    @PutMapping("/users/{id}/member-type")
    public ResponseEntity<ApiResponse<Void>> changeMemberType(
            @PathVariable Long id,
            @Valid @RequestBody ChangeMemberTypeRequest request) {
        adminUserService.changeMemberType(id, request.memberType());
        return ResponseEntity.ok(ApiResponse.ok("Successfully updated member type.", null));
    }

    /**
     * IABSE 원본 회원 리스트 조회 및 검색
     * GET /api/admin/iasbse-members
     */
    @GetMapping("/iasbse-members")
    public ResponseEntity<ApiResponse<List<IasbseMember>>> getAllIasbseMembers(
            @RequestParam(required = false) String search) {
        List<IasbseMember> members = adminUserService.getAllIasbseMembers(search);
        return ResponseEntity.ok(ApiResponse.ok(members));
    }

    /**
     * 특정 유저 강제 삭제 (결제 연쇄 제거 & 티켓 정원 복원 포함)
     * DELETE /api/admin/users/{id}
     */
    @DeleteMapping("/users/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {
        adminUserService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.ok("Successfully deleted user and all associated records.", null));
    }

    /**
     * IABSE 회원 수기 추가
     * POST /api/admin/iasbse-members
     */
    @PostMapping("/iasbse-members")
    public ResponseEntity<ApiResponse<IasbseMember>> addIasbseMember(
            @Valid @RequestBody AddIasbseMemberRequest request) {
        IasbseMember created = adminUserService.addIasbseMember(request);
        return ResponseEntity.ok(ApiResponse.ok("Successfully added IABSE member.", created));
    }

    /**
     * IABSE 회원 수기 삭제
     * DELETE /api/admin/iasbse-members/{id}
     */
    @DeleteMapping("/iasbse-members/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteIasbseMember(@PathVariable Long id) {
        adminUserService.deleteIasbseMember(id);
        return ResponseEntity.ok(ApiResponse.ok("Successfully deleted IABSE member.", null));
    }
}
