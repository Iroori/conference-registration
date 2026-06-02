package com.roo.payment.domain.user.controller;

import com.roo.payment.common.response.ApiResponse;
import com.roo.payment.domain.user.dto.UpdateProfileRequest;
import com.roo.payment.domain.user.dto.AuthResponse;
import com.roo.payment.domain.user.entity.User;
import com.roo.payment.domain.user.repository.UserRepository;
import com.roo.payment.security.JwtTokenProvider;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import com.roo.payment.common.exception.BusinessException;
import com.roo.payment.common.exception.ErrorCode;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;

    public UserController(UserRepository userRepository, JwtTokenProvider jwtTokenProvider) {
        this.userRepository = userRepository;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    /**
     * 회원의 개인정보 직접 수정 API (로그인 상태 필수)
     * PUT /api/user/profile
     *
     * 성공 시 세션 동기화를 위한 갱신된 JWT와 개인정보 필드들을 포함한 AuthResponse 반환.
     */
    @PutMapping("/profile")
    @Transactional
    public ResponseEntity<ApiResponse<AuthResponse>> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody UpdateProfileRequest req) {

        String email = userDetails.getUsername();
        User user = userRepository.findByEmailAndActiveTrue(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // Profile update
        user.updateProfile(
                req.firstName(),
                req.lastName(),
                req.affiliation(),
                req.country(),
                req.position(),
                req.phone(),
                user.getBirthDate()
        );
        user.assignBillingAddress(
                req.billingUniversity(),
                req.billingVat(),
                req.billingPoNumber(),
                req.billingStreet(),
                req.billingAdditionalInfo(),
                req.billingPoBox(),
                req.billingPostcode(),
                req.billingCity(),
                req.billingCountry()
        );

        userRepository.save(user);

        // Generate refreshed JWT Token with new details
        String newAccessToken = jwtTokenProvider.generateToken(user.getEmail(), user.getMemberType().name());
        AuthResponse response = AuthResponse.of(newAccessToken, "", user);

        return ResponseEntity.ok(ApiResponse.ok("Profile updated successfully.", response));
    }
}
