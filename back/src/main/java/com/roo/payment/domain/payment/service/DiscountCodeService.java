package com.roo.payment.domain.payment.service;

import com.roo.payment.common.exception.BusinessException;
import com.roo.payment.common.exception.ErrorCode;
import com.roo.payment.domain.payment.entity.DiscountCode;
import com.roo.payment.domain.payment.repository.DiscountCodeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class DiscountCodeService {

    private final DiscountCodeRepository discountCodeRepository;
    private final SecureRandom random = new SecureRandom();

    public DiscountCodeService(DiscountCodeRepository discountCodeRepository) {
        this.discountCodeRepository = discountCodeRepository;
    }

    /**
     * 할인코드 생성
     */
    @Transactional
    public DiscountCode createDiscountCode(int iabseMemberDiscountRate, int nonIabseMemberDiscountRate,
                                           boolean galaDinnerFree, boolean accompanyingPersonFree, boolean technicalTourFree) {
        // 고유한 8자리 문자열(영문 대문자 + 숫자) 생성
        String code;
        do {
            code = generateRandomCode(8);
        } while (discountCodeRepository.existsByCode(code));

        DiscountCode discountCode = new DiscountCode(
                code, iabseMemberDiscountRate, nonIabseMemberDiscountRate,
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
     * 할인코드 검증
     */
    public DiscountCode verifyDiscountCode(String code) {
        DiscountCode discountCode = discountCodeRepository.findByCodeAndActiveTrue(code.toUpperCase().trim())
                .orElseThrow(() -> new BusinessException(ErrorCode.DISCOUNT_CODE_NOT_FOUND));

        if (discountCode.isUsed()) {
            throw new BusinessException(ErrorCode.DISCOUNT_CODE_ALREADY_USED);
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
