package com.roo.payment.domain.payment;

import com.roo.payment.domain.option.entity.ConferenceOption;
import com.roo.payment.domain.option.entity.OptionCategory;
import com.roo.payment.domain.option.repository.ConferenceOptionRepository;
import com.roo.payment.domain.payment.dto.CompletePaymentRequest;
import com.roo.payment.domain.payment.dto.PaymentResponse;
import com.roo.payment.domain.payment.entity.OptionWaitlist;
import com.roo.payment.domain.payment.entity.OptionWaitlist.WaitlistStatus;
import com.roo.payment.domain.payment.entity.Payment;
import com.roo.payment.domain.payment.entity.PaymentMethod;
import com.roo.payment.domain.payment.entity.PaymentStatus;
import com.roo.payment.domain.payment.entity.PaymentType;
import com.roo.payment.domain.payment.repository.OptionWaitlistRepository;
import com.roo.payment.domain.payment.repository.PaymentRepository;
import com.roo.payment.domain.payment.service.PaymentService;
import com.roo.payment.domain.payment.service.WaitlistService;
import com.roo.payment.domain.user.entity.MemberType;
import com.roo.payment.domain.user.entity.User;
import com.roo.payment.domain.user.repository.UserRepository;
import com.roo.payment.security.JwtTokenProvider;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 대기자 오퍼 & 추가 결제 통합 테스트.
 * test 프로파일(H2 create-drop) — 스키마가 매번 새로 생성되어 신규 enum 값(OFFERED/EXPIRED)이 허용된다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class WaitlistFlowIntegrationTest {

    private MockMvc mockMvc;

    @Autowired private WebApplicationContext wac;
    @Autowired private UserRepository userRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private ConferenceOptionRepository optionRepository;
    @Autowired private OptionWaitlistRepository waitlistRepository;
    @Autowired private JwtTokenProvider jwtTokenProvider;
    @Autowired private PaymentService paymentService;
    @Autowired private WaitlistService waitlistService;
    @Autowired private EntityManager em;

    private User admin;
    private User owner;
    private User other;
    private String adminToken;
    private String ownerToken;
    private String otherToken;
    private ConferenceOption tour;   // 유료, 정원 40
    private ConferenceOption freeOpt; // 무료, 정원 5 (PG 우회 완료 테스트용)

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();

        admin = new User("wl-admin@kibse.or.kr", "pw", "Ad", "Min", "KIBSE", "Staff", "KR",
                "+82-10-0000-0001", LocalDate.of(1980, 1, 1), MemberType.MEMBER);
        admin.promoteToAdmin();
        admin.verifyEmail();
        userRepository.save(admin);

        owner = new User("wl-owner@test.com", "pw", "Own", "Er", "Univ", "Eng", "KR",
                "+82-10-0000-0002", LocalDate.of(1995, 1, 1), MemberType.NON_MEMBER);
        owner.verifyEmail();
        userRepository.save(owner);

        other = new User("wl-other@test.com", "pw", "Oth", "Er", "Univ", "Eng", "KR",
                "+82-10-0000-0003", LocalDate.of(1995, 1, 1), MemberType.NON_MEMBER);
        other.verifyEmail();
        userRepository.save(other);

        adminToken = "Bearer " + jwtTokenProvider.generateToken(admin.getEmail(), admin.getMemberType().name(), true);
        ownerToken = "Bearer " + jwtTokenProvider.generateToken(owner.getEmail(), owner.getMemberType().name(), false);
        otherToken = "Bearer " + jwtTokenProvider.generateToken(other.getEmail(), other.getMemberType().name(), false);

        tour = new ConferenceOption("OPT-TEST-TOUR", OptionCategory.PROGRAM, "테스트 투어", "Test Tour", "d",
                90000, false, false, false, null, 40);
        optionRepository.save(tour);

        freeOpt = new ConferenceOption("OPT-TEST-FREE", OptionCategory.PROGRAM, "무료 옵션", "Free Opt", "d",
                0, true, false, false, null, 5);
        optionRepository.save(freeOpt);
    }

    /** 결제 완료된 부모 + WAITING 대기건을 직접 시드한다. */
    private Long seedWaiting(User user, ConferenceOption option, String parentRegNo) {
        Payment parent = new Payment(parentRegNo, user, user.getMemberType(), PaymentMethod.CARD, 0, 0, List.of());
        parent.complete();
        paymentRepository.save(parent);
        OptionWaitlist w = new OptionWaitlist(parent, option);
        Long id = waitlistRepository.save(w).getId();
        em.flush();
        em.clear();
        return id;
    }

    // ── intake (FK 저장순서 버그 회귀 방지) ──────────────────────────────────

    @Test
    @DisplayName("waitlistedOptionIds로 결제 개시 시 WAITING 대기건이 저장된다 (FK 저장순서 회귀)")
    void initiate_withWaitlistedOption_createsWaitingEntry() throws Exception {
        String body = "{\"selectedOptionIds\":[\"OPT-TEST-TOUR\"],\"paymentMethod\":\"CARD\",\"waitlistedOptionIds\":[\"OPT-TEST-TOUR\"]}";

        mockMvc.perform(post("/api/payments/initiate")
                        .header("Authorization", ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());

        em.flush(); em.clear();
        List<OptionWaitlist> rows = waitlistRepository.findByOptionIdAndStatusOrderByCreatedAtAsc("OPT-TEST-TOUR", WaitlistStatus.WAITING);
        assertEquals(1, rows.size());
    }

    // ── 관리자 오퍼 ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("오퍼(qty=2)하면 OFFERED 전환 + 잔여 좌석이 수량만큼 예약된다")
    void offer_reservesSeats() throws Exception {
        Long wid = seedWaiting(owner, tour, "IABSE-P-1");

        mockMvc.perform(post("/api/admin/waitlists/{id}/offer", wid)
                        .header("Authorization", adminToken)
                        .param("quantity", "2").param("force", "false"))
                .andExpect(status().isOk());

        em.flush(); em.clear();
        OptionWaitlist w = waitlistRepository.findById(wid).orElseThrow();
        assertEquals(WaitlistStatus.OFFERED, w.getStatus());
        assertEquals(2, w.getOfferedQuantity());

        mockMvc.perform(get("/api/admin/waitlists").header("Authorization", adminToken).param("optionId", "OPT-TEST-TOUR"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.availableSeats").value(38)); // 40 - 0 - 2
    }

    @Test
    @DisplayName("잔여를 초과하는 오퍼는 force=false면 409, force=true면 허용된다")
    void offer_overCapacity_requiresForce() throws Exception {
        Long wid = seedWaiting(owner, tour, "IABSE-P-2");

        mockMvc.perform(post("/api/admin/waitlists/{id}/offer", wid)
                        .header("Authorization", adminToken)
                        .param("quantity", "100").param("force", "false"))
                .andExpect(status().isConflict()); // WAITLIST_CAPACITY_FULL

        mockMvc.perform(post("/api/admin/waitlists/{id}/offer", wid)
                        .header("Authorization", adminToken)
                        .param("quantity", "100").param("force", "true"))
                .andExpect(status().isOk());

        em.flush(); em.clear();
        assertEquals(WaitlistStatus.OFFERED, waitlistRepository.findById(wid).orElseThrow().getStatus());
    }

    @Test
    @DisplayName("일반 사용자는 오퍼 API에 접근할 수 없다 (403)")
    void offer_forbiddenForNonAdmin() throws Exception {
        Long wid = seedWaiting(owner, tour, "IABSE-P-3");
        mockMvc.perform(post("/api/admin/waitlists/{id}/offer", wid)
                        .header("Authorization", ownerToken)
                        .param("quantity", "1").param("force", "false"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("오퍼 회수 시 다시 WAITING으로 돌아간다")
    void revoke_returnsToWaiting() throws Exception {
        Long wid = seedWaiting(owner, tour, "IABSE-P-4");
        waitlistService.offer(wid, 2, false);
        em.flush(); em.clear();

        mockMvc.perform(post("/api/admin/waitlists/{id}/revoke", wid).header("Authorization", adminToken))
                .andExpect(status().isOk());

        em.flush(); em.clear();
        assertEquals(WaitlistStatus.WAITING, waitlistRepository.findById(wid).orElseThrow().getStatus());
    }

    // ── 유저 오퍼 조회 & 추가 결제 ──────────────────────────────────────────

    @Test
    @DisplayName("오퍼받은 유저는 offers에서 수량·총액을 확인하고 WAITLIST 결제를 개시한다")
    void userSeesOffer_and_initiatesWaitlistPayment() throws Exception {
        Long wid = seedWaiting(owner, tour, "IABSE-P-5");
        waitlistService.offer(wid, 2, false);
        em.flush(); em.clear();

        mockMvc.perform(get("/api/payments/waitlist/offers").header("Authorization", ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].quantity").value(2))
                .andExpect(jsonPath("$.data[0].totalAmount").value(180000)); // 90000 x 2

        mockMvc.perform(post("/api/payments/waitlist/{id}/initiate", wid).header("Authorization", ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.paymentType").value("WAITLIST"))
                .andExpect(jsonPath("$.data.totalAmount").value(180000))
                .andExpect(jsonPath("$.data.originRegistrationNumber").value("IABSE-P-5"));
    }

    @Test
    @DisplayName("오퍼 소유자가 아닌 유저가 결제 개시하면 403")
    void initiateWaitlistPayment_nonOwner_forbidden() throws Exception {
        Long wid = seedWaiting(owner, tour, "IABSE-P-6");
        waitlistService.offer(wid, 1, false);
        em.flush(); em.clear();

        mockMvc.perform(post("/api/payments/waitlist/{id}/initiate", wid).header("Authorization", otherToken))
                .andExpect(status().isForbidden()); // WAITLIST_FORBIDDEN
    }

    @Test
    @DisplayName("OFFERED 상태가 아니면 결제 개시 400")
    void initiateWaitlistPayment_notOffered_badRequest() throws Exception {
        Long wid = seedWaiting(owner, tour, "IABSE-P-7"); // WAITING 상태 그대로
        mockMvc.perform(post("/api/payments/waitlist/{id}/initiate", wid).header("Authorization", ownerToken))
                .andExpect(status().isBadRequest()); // WAITLIST_NOT_OFFERED
    }

    // ── 완료 (PG 우회: 무료 옵션 → totalAmount 0) ───────────────────────────

    @Test
    @DisplayName("WAITLIST 결제 완료 시 오퍼 수량만큼 정원이 증가하고 대기건이 COMPLETED가 된다")
    void completeWaitlistPayment_incrementsByQuantity_andFulfills() {
        Long wid = seedWaiting(owner, freeOpt, "IABSE-P-8");
        waitlistService.offer(wid, 3, false); // 무료 옵션, 잔여 5 >= 3
        em.flush(); em.clear();

        PaymentResponse init = paymentService.initiateWaitlistPayment(owner.getEmail(), wid);
        assertEquals("WAITLIST", init.paymentType());
        assertEquals(0, init.totalAmount()); // 무료 옵션
        em.flush(); em.clear();

        // totalAmount 0 → PG 검증 우회
        paymentService.completePayment(owner.getEmail(),
                new CompletePaymentRequest(init.registrationNumber(), "FREE_TID", "0000"));
        em.flush(); em.clear();

        ConferenceOption reloaded = optionRepository.findById(freeOpt.getId()).orElseThrow();
        assertEquals(3, reloaded.getCurrentCount(), "오퍼 수량(3)만큼 카운트 증가");

        OptionWaitlist w = waitlistRepository.findById(wid).orElseThrow();
        assertEquals(WaitlistStatus.COMPLETED, w.getStatus());
        assertEquals(PaymentStatus.COMPLETED,
                paymentRepository.findByRegistrationNumber(init.registrationNumber()).orElseThrow().getStatus());
    }

    // ── 직접 오퍼 (대기 신청/결제 이력 없는 유저) ───────────────────────────

    @Test
    @DisplayName("직접 오퍼: 결제 이력 없는 유저에게 권한 부여 → OFFERED(payment=null) 생성, 유저가 결제 개시")
    void grant_toPaymentlessUser_createsOfferedAndUserPays() throws Exception {
        // other 유저는 결제/대기 이력이 전혀 없음
        String body = "{\"email\":\"" + other.getEmail() + "\",\"optionId\":\"OPT-TEST-TOUR\",\"quantity\":3,\"force\":true}";
        mockMvc.perform(post("/api/admin/waitlists/grant")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
        em.flush(); em.clear();

        // 결제 이력 없이 OFFERED 생성됨 (payment=null, user=other)
        List<OptionWaitlist> rows = waitlistRepository
                .findByOptionIdAndStatusOrderByCreatedAtAsc("OPT-TEST-TOUR", WaitlistStatus.OFFERED);
        assertEquals(1, rows.size());
        OptionWaitlist granted = rows.get(0);
        assertNull(granted.getPayment(), "직접 오퍼는 결제 연결이 없어야 함");
        assertEquals(other.getEmail(), granted.getUser().getEmail());

        // 유저 오퍼 조회 (수량 3 / 총 270,000)
        mockMvc.perform(get("/api/payments/waitlist/offers").header("Authorization", otherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].quantity").value(3))
                .andExpect(jsonPath("$.data[0].totalAmount").value(270000));

        // 결제 개시 → WAITLIST, origin은 null (연결 결제 없음)
        PaymentResponse init = paymentService.initiateWaitlistPayment(other.getEmail(), granted.getId());
        assertEquals("WAITLIST", init.paymentType());
        assertEquals(270000L, init.totalAmount());
        assertNull(init.originRegistrationNumber());
    }

    @Test
    @DisplayName("직접 오퍼: 잔여 초과 수량이면 force=false일 때 409")
    void grant_overCapacity_withoutForce_conflict() throws Exception {
        String body = "{\"email\":\"" + other.getEmail() + "\",\"optionId\":\"OPT-TEST-TOUR\",\"quantity\":100,\"force\":false}";
        mockMvc.perform(post("/api/admin/waitlists/grant")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("직접 오퍼는 관리자 전용 (일반 유저 403)")
    void grant_forbiddenForNonAdmin() throws Exception {
        String body = "{\"email\":\"" + other.getEmail() + "\",\"optionId\":\"OPT-TEST-TOUR\",\"quantity\":1,\"force\":true}";
        mockMvc.perform(post("/api/admin/waitlists/grant")
                        .header("Authorization", ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
    }

    // ── 결제 삭제 FK 처리 (대기 행이 달린 결제) ─────────────────────────────

    @Test
    @DisplayName("대기 행이 달린 결제를 관리자가 삭제해도 FK 오류 없이 처리된다")
    void deletePaymentWithWaitlistRow_cleansUp() throws Exception {
        // 부모 결제 + 대기건 시드
        Payment parent = new Payment("IABSE-P-9", owner, owner.getMemberType(), PaymentMethod.CARD, 0, 0, List.of());
        paymentRepository.save(parent);
        OptionWaitlist w = new OptionWaitlist(parent, tour);
        waitlistRepository.save(w);
        Long parentId = parent.getId();
        em.flush(); em.clear();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/admin/payments/{id}", parentId).header("Authorization", adminToken))
                .andExpect(status().isOk());

        em.flush(); em.clear();
        assertFalse(paymentRepository.findById(parentId).isPresent());
        assertTrue(waitlistRepository.findByPaymentId(parentId).isEmpty(), "대기 intake 행도 정리됨");
    }
}
