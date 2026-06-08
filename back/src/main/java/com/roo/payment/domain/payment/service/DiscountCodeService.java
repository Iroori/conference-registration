package com.roo.payment.domain.payment.service;

import com.roo.payment.common.exception.BusinessException;
import com.roo.payment.common.exception.ErrorCode;
import com.roo.payment.domain.payment.entity.DiscountCode;
import com.roo.payment.domain.payment.repository.DiscountCodeRepository;
import com.roo.payment.domain.user.entity.User;
import com.roo.payment.domain.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class DiscountCodeService {

    private final DiscountCodeRepository discountCodeRepository;
    private final UserRepository userRepository;
    private final SecureRandom random = new SecureRandom();

    public DiscountCodeService(DiscountCodeRepository discountCodeRepository, UserRepository userRepository) {
        this.discountCodeRepository = discountCodeRepository;
        this.userRepository = userRepository;
    }

    /**
     * 할인코드 생성 및 유저에게 할당
     */
    @Transactional
    public DiscountCode createDiscountCode(String userEmail, int iabseMemberDiscountRate, int nonIabseMemberDiscountRate,
                                           boolean galaDinnerFree, boolean accompanyingPersonFree, boolean technicalTourFree) {
        User user = userRepository.findByEmailAndActiveTrue(userEmail)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 고유한 8자리 문자열(영문 대문자 + 숫자) 생성
        String code;
        do {
            code = generateRandomCode(8);
        } while (discountCodeRepository.existsByCode(code));

        DiscountCode discountCode = new DiscountCode(
                code, user, iabseMemberDiscountRate, nonIabseMemberDiscountRate,
                galaDinnerFree, accompanyingPersonFree, technicalTourFree
        );

        return discountCodeRepository.save(discountCode);
    }

    /**
     * 전체 할인코드 목록 조회 (어드민용)
     */
    public List<DiscountCode> getAllDiscountCodes() {
        return discountCodeRepository.findAll();
    }

    /**
     * 할인코드 검증 (로그인한 유저 기준)
     */
    public DiscountCode verifyDiscountCode(String code, String userEmail) {
        DiscountCode discountCode = discountCodeRepository.findByCodeAndActiveTrue(code.toUpperCase().trim())
                .orElseThrow(() -> new BusinessException(ErrorCode.DISCOUNT_CODE_NOT_FOUND));

        if (discountCode.isUsed()) {
            throw new BusinessException(ErrorCode.DISCOUNT_CODE_ALREADY_USED);
        }

        if (!discountCode.getUser().getEmail().equalsIgnoreCase(userEmail.trim())) {
            throw new BusinessException(ErrorCode.DISCOUNT_CODE_INVALID_USER);
        }

        return discountCode;
    }

    /**
     * 할인코드 삭제
     */
    @Transactional
    public void deleteDiscountCode(Long id) {
        if (!discountCodeRepository.existsById(id)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Discount code does not exist.");
        }
        discountCodeRepository.deleteById(id);
    }

    private String generateRandomCode(int length) {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
