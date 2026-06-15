package com.roo.payment.domain.payment.controller;

import com.roo.payment.common.response.ApiResponse;
import com.roo.payment.domain.payment.dto.CreateDiscountCodeRequest;
import com.roo.payment.domain.payment.dto.DiscountCodeResponse;
import com.roo.payment.domain.payment.entity.DiscountCode;
import com.roo.payment.domain.payment.service.DiscountCodeService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/discount-codes")
@PreAuthorize("hasRole('ADMIN')")
public class AdminDiscountCodeController {

    private final DiscountCodeService discountCodeService;

    public AdminDiscountCodeController(DiscountCodeService discountCodeService) {
        this.discountCodeService = discountCodeService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<DiscountCodeResponse>>> list() {
        List<DiscountCodeResponse> responses = discountCodeService.getAllDiscountCodes().stream()
                .map(DiscountCodeResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(responses));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DiscountCodeResponse>> create(
            @Valid @RequestBody CreateDiscountCodeRequest req) {
        DiscountCode created = discountCodeService.createDiscountCode(
                req.iabseMemberDiscountRate(),
                req.nonIabseMemberDiscountRate(),
                req.galaDinnerFree(),
                req.accompanyingPersonFree(),
                req.technicalTourFree()
        );
        return ResponseEntity.ok(ApiResponse.ok("Discount code created successfully.", DiscountCodeResponse.from(created)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        discountCodeService.deleteDiscountCode(id);
        return ResponseEntity.ok(ApiResponse.ok("Discount code deleted successfully.", null));
    }
}
