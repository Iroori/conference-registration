package com.roo.payment.domain.payment.service;

import com.roo.payment.common.exception.BusinessException;
import com.roo.payment.common.exception.ErrorCode;
import com.roo.payment.domain.option.entity.ConferenceOption;
import com.roo.payment.domain.option.repository.ConferenceOptionRepository;
import com.roo.payment.domain.payment.dto.PaymentRequest;
import com.roo.payment.domain.payment.dto.PaymentResponse;
import com.roo.payment.domain.payment.entity.DiscountCode;
import com.roo.payment.domain.payment.entity.PaymentMethod;
import com.roo.payment.domain.payment.repository.DiscountCodeRepository;
import com.roo.payment.domain.user.entity.MemberType;
import com.roo.payment.domain.user.entity.User;
import com.roo.payment.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class DiscountCodeServiceTest {

    @Autowired
    private DiscountCodeService discountCodeService;

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DiscountCodeRepository discountCodeRepository;

    @Autowired
    private ConferenceOptionRepository optionRepository;

    private User testUser;
    private User otherUser;

    @BeforeEach
    void setUp() {
        // Create test users
        testUser = new User("test-member@test.com", "passwordHash", "Kim", "Minsu",
                "RooCorp", "Engineer", "KR", "+82-10-1234-5678", LocalDate.of(1990, 5, 15), MemberType.MEMBER);
        testUser.verifyEmail();
        userRepository.save(testUser);

        otherUser = new User("other-member@test.com", "passwordHash", "Lee", "Chulsoo",
                "RooCorp", "Designer", "KR", "+82-10-8765-4321", LocalDate.of(1992, 10, 20), MemberType.NON_MEMBER);
        otherUser.verifyEmail();
        userRepository.save(otherUser);
    }

    @Test
    @DisplayName("할인코드 생성 및 유효성 검증 성공 테스트")
    void testCreateAndVerifyDiscountCodeSuccess() {
        DiscountCode code = discountCodeService.createDiscountCode(
                50, 0, true, false, true
        );

        assertNotNull(code);
        assertEquals(8, code.getCode().length());
        assertEquals(50, code.getIabseMemberDiscountRate());
        assertEquals(0, code.getNonIabseMemberDiscountRate());
        assertTrue(code.isGalaDinnerFree());
        assertFalse(code.isAccompanyingPersonFree());
        assertTrue(code.isTechnicalTourFree());
        assertFalse(code.isUsed());
        assertTrue(code.isActive());

        // Verify lookup and validation
        DiscountCode verified = discountCodeService.verifyDiscountCode(code.getCode());
        assertEquals(code.getId(), verified.getId());
    }

    @Test
    @DisplayName("존재하지 않는 코드를 검증 시 에러 발생")
    void testVerifyDiscountCodeErrors() {
        DiscountCode code = discountCodeService.createDiscountCode(
                50, 50, false, false, false
        );

        // 존재하지 않는 코드 검증
        BusinessException ex1 = assertThrows(BusinessException.class, () ->
                discountCodeService.verifyDiscountCode("INVALID8")
        );
        assertEquals(ErrorCode.DISCOUNT_CODE_NOT_FOUND, ex1.getErrorCode());
    }

    @Test
    @DisplayName("할인코드 삭제 테스트")
    void testDeleteDiscountCode() {
        DiscountCode code = discountCodeService.createDiscountCode(
                50, 50, false, false, false
        );

        discountCodeService.deleteDiscountCode(code.getId());
        assertFalse(discountCodeRepository.findById(code.getId()).isPresent());
    }

    @Test
    @DisplayName("결제 시 할인코드 적용 테스트 - 등록비 50%, 갈라 디너 100%, 동반인 1명 100% 무료")
    void testCreatePaymentWithDiscountCode() {
        // IABSE Member 50% 할인, Gala Dinner 무료, Accompanying Person 1명 무료 할인코드 생성
        DiscountCode discountCode = discountCodeService.createDiscountCode(
                50, 0, true, true, false
        );

        // Select options: 얼리버드 IABSE Member 등록비(1,300,000 KRW), Gala Dinner (250,000 KRW), Accompanying (400,000 KRW) 2개 신청
        // 2개 신청이므로 Accompanying 총 금액은 800,000 KRW가 된다. 할인 적용 후 1명(400,000 KRW)만 차감되어야 한다.
        List<String> optionIds = List.of("OPT-REG-PRE-MEMBER", "OPT-GALA-DINNER", "OPT-ACCOMP-PRE");
        Map<String, Integer> quantities = Map.of(
                "OPT-REG-PRE-MEMBER", 1,
                "OPT-GALA-DINNER", 1,
                "OPT-ACCOMP-PRE", 2
        );

        PaymentRequest.AccompanyingPersonInfo p1 = new PaymentRequest.AccompanyingPersonInfo("Hong", "Gildong");
        PaymentRequest.AccompanyingPersonInfo p2 = new PaymentRequest.AccompanyingPersonInfo("Kim", "Chulsoo");

        PaymentRequest request = new PaymentRequest(
                optionIds,
                quantities,
                PaymentMethod.CARD,
                null, // Passing null tid to bypass real HttpURLConnection call
                "0000",
                List.of(p1, p2),
                null,
                null,
                null,
                LocalDate.of(1990, 5, 15),
                discountCode.getCode(),
                null,
                null,
                null
        );

        PaymentResponse response = paymentService.createPayment(testUser.getEmail(), request);

        assertNotNull(response);
        assertEquals(1050000L, response.totalAmount()); // 2,350,000 - 1,300,000 = 1,050,000 KRW
        assertEquals(PaymentMethod.CARD, response.paymentMethod());
        assertEquals(discountCode.getCode(), response.appliedDiscountCode());

        // Verify discount calculations in database
        assertEquals(1300000L, response.discountTotalAmount());
        assertEquals(650000L, response.discountRegAmount()); // 1,300,000 * 50%
        assertEquals(250000L, response.discountGalaAmount()); // Gala dinner price
        assertEquals(400000L, response.discountAccompAmount()); // 1 accompanying person free (price: 400,000)
        assertEquals(0L, response.discountTourAmount());

        // Verify code is now marked as used
        DiscountCode codeAfterUse = discountCodeRepository.findById(discountCode.getId()).orElseThrow();
        assertTrue(codeAfterUse.isUsed());
    }

    @Test
    @DisplayName("할인코드 적용으로 최종 결제금액이 0 KRW인 경우 PG 연동 생략 및 즉시 결제 완료 검증")
    void testZeroAmountBypassPayment() {
        // 등록비 100% 할인 및 갈라디너 무료 할인코드 생성
        DiscountCode discountCode = discountCodeService.createDiscountCode(
                100, 100, true, false, false
        );

        // IABSE Member 등록비(1,300,000 KRW), Gala Dinner (250,000 KRW)
        List<String> optionIds = List.of("OPT-REG-PRE-MEMBER", "OPT-GALA-DINNER");
        Map<String, Integer> quantities = Map.of(
                "OPT-REG-PRE-MEMBER", 1,
                "OPT-GALA-DINNER", 1
        );

        // PG tid가 null/blank여도 finalAmount = 0 이므로 PG 검증을 건너뛰고 정상 처리되어야 함.
        PaymentRequest request = new PaymentRequest(
                optionIds,
                quantities,
                PaymentMethod.CARD,
                null,
                "0000",
                null,
                null,
                null,
                null,
                LocalDate.of(1990, 5, 15),
                discountCode.getCode(),
                null,
                null,
                null
        );

        PaymentResponse response = paymentService.createPayment(testUser.getEmail(), request);

        assertNotNull(response);
        assertEquals(0, response.totalAmount());
        assertEquals(PaymentMethod.CARD, response.paymentMethod());
        assertEquals(discountCode.getCode(), response.appliedDiscountCode());

        // Verify discount calculations in database
        assertEquals(1300000L + 250000L, response.discountTotalAmount());
        assertEquals(1300000L, response.discountRegAmount());
        assertEquals(250000L, response.discountGalaAmount());
        assertEquals(0L, response.discountAccompAmount());
        assertEquals(0L, response.discountTourAmount());

        // Verify code is now marked as used
        DiscountCode codeAfterUse = discountCodeRepository.findById(discountCode.getId()).orElseThrow();
        assertTrue(codeAfterUse.isUsed());

        // Try using the code again, should throw ALREADY_USED error
        assertThrows(BusinessException.class, () ->
                paymentService.createPayment(testUser.getEmail(), request)
        );
    }
}
