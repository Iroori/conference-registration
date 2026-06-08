package com.roo.payment.domain.payment;

import com.roo.payment.domain.option.entity.ConferenceOption;
import com.roo.payment.domain.option.entity.OptionCategory;
import com.roo.payment.domain.option.repository.ConferenceOptionRepository;
import com.roo.payment.domain.payment.entity.DiscountCode;
import com.roo.payment.domain.payment.entity.Payment;
import com.roo.payment.domain.payment.entity.PaymentMethod;
import com.roo.payment.domain.payment.entity.PaymentStatus;
import com.roo.payment.domain.payment.repository.DiscountCodeRepository;
import com.roo.payment.domain.payment.repository.PaymentRepository;
import com.roo.payment.domain.user.entity.MemberType;
import com.roo.payment.domain.user.entity.User;
import com.roo.payment.domain.user.repository.UserRepository;
import com.roo.payment.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AdminPaymentControllerTest {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private ConferenceOptionRepository optionRepository;

    @Autowired
    private DiscountCodeRepository discountCodeRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private jakarta.persistence.EntityManager entityManager;

    private User adminUser;
    private User normalUser;
    private String adminToken;
    private String normalToken;
    private ConferenceOption testOption;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac)
                .apply(springSecurity())
                .build();

        // Create admin user
        adminUser = new User("admin-pay-test@kibse.or.kr", "password", "Admin", "Payment",
                "KIBSE", "Staff", "KR", "+82-10-9999-8888", LocalDate.of(1980, 1, 1), MemberType.MEMBER);
        adminUser.promoteToAdmin();
        adminUser.verifyEmail();
        userRepository.save(adminUser);

        // Create normal user
        normalUser = new User("user-pay-test@test.com", "password", "Gildong", "Hong",
                "Univ", "Student", "KR", "+82-10-1234-5678", LocalDate.of(1995, 2, 2), MemberType.NON_MEMBER);
        normalUser.verifyEmail();
        userRepository.save(normalUser);

        // Generate tokens
        adminToken = "Bearer " + jwtTokenProvider.generateToken(adminUser.getEmail(), adminUser.getMemberType().name(), true);
        normalToken = "Bearer " + jwtTokenProvider.generateToken(normalUser.getEmail(), normalUser.getMemberType().name(), false);

        // Create a test conference option
        testOption = new ConferenceOption("OPT-TEST-DEL", OptionCategory.PROGRAM, "테스트 옵션", "Test Option", "Desc", 100000, false, false, false, null, null);
        testOption.increaseCount(); // Count = 1
        optionRepository.save(testOption);
    }

    @Test
    @DisplayName("어드민 권한으로 결제 삭제 시 - 티켓 수량 복원 및 할인 코드 초기화 검증")
    void testDeletePaymentSuccess() throws Exception {
        // Create test discount code
        DiscountCode discountCode = new DiscountCode("PROMO777", normalUser, 50, 50, false, false, false);
        discountCode.markAsUsed();
        discountCodeRepository.save(discountCode);

        // Create completed payment
        Payment payment = new Payment("IABSE-TEST-999", normalUser, MemberType.NON_MEMBER, PaymentMethod.CARD, 100000, 0, List.of(testOption));
        payment.complete();
        payment.applyDiscount(discountCode.getCode(), 50000, 50000, 0, 0, 0);
        paymentRepository.save(payment);

        int initialCount = testOption.getCurrentCount();
        assertTrue(discountCode.isUsed());

        // Flush and clear persistence context before mockMvc call to prevent 1st-level cache mismatch
        entityManager.flush();
        entityManager.clear();

        // Perform delete call with admin token
        mockMvc.perform(delete("/api/admin/payments/" + payment.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isOk());

        // Flush and clear again to reflect and fetch the changes made inside the MockMvc handler
        entityManager.flush();
        entityManager.clear();

        // 1. Verify Payment is deleted
        assertFalse(paymentRepository.findById(payment.getId()).isPresent());

        // 2. Verify Option count is decremented (restored)
        ConferenceOption updatedOption = optionRepository.findById(testOption.getId()).orElseThrow();
        assertEquals(initialCount - 1, updatedOption.getCurrentCount());

        // 3. Verify DiscountCode is reset to unused
        DiscountCode updatedCode = discountCodeRepository.findByCode(discountCode.getCode()).orElseThrow();
        assertFalse(updatedCode.isUsed());
    }

    @Test
    @DisplayName("일반 사용자가 결제 삭제 API 호출 시 403 Forbidden 권한 제한 검증")
    void testDeletePaymentForbiddenForUser() throws Exception {
        Payment payment = new Payment("IABSE-TEST-888", normalUser, MemberType.NON_MEMBER, PaymentMethod.CARD, 100000, 0, List.of(testOption));
        paymentRepository.save(payment);

        mockMvc.perform(delete("/api/admin/payments/" + payment.getId())
                        .header("Authorization", normalToken))
                .andExpect(status().isForbidden());

        // Verify Payment still exists
        assertTrue(paymentRepository.findById(payment.getId()).isPresent());
    }
}
