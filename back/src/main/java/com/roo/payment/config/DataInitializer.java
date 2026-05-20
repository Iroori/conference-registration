package com.roo.payment.config;

import com.roo.payment.domain.iasbse.entity.IasbseMember;
import com.roo.payment.domain.iasbse.repository.IasbseMemberRepository;
import com.roo.payment.domain.option.entity.ConferenceOption;
import com.roo.payment.domain.option.entity.OptionCategory;
import com.roo.payment.domain.option.repository.ConferenceOptionRepository;
import com.roo.payment.domain.user.entity.MemberType;
import com.roo.payment.domain.user.entity.User;
import com.roo.payment.domain.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class DataInitializer implements ApplicationRunner {

    private final ConferenceOptionRepository optionRepository;
    private final UserRepository userRepository;
    private final IasbseMemberRepository iasbseMemberRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.roo.payment.domain.iasbse.service.IasbseMemberService iasbseMemberService;

    public DataInitializer(ConferenceOptionRepository optionRepository,
                           UserRepository userRepository,
                           IasbseMemberRepository iasbseMemberRepository,
                           PasswordEncoder passwordEncoder,
                           com.roo.payment.domain.iasbse.service.IasbseMemberService iasbseMemberService) {
        this.optionRepository = optionRepository;
        this.userRepository = userRepository;
        this.iasbseMemberRepository = iasbseMemberRepository;
        this.passwordEncoder = passwordEncoder;
        this.iasbseMemberService = iasbseMemberService;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedIasbseMembersFromExcel();
        seedOptions();
        seedTestAccounts();
    }

    private void seedIasbseMembersFromExcel() {
        String defaultPath = "/Users/roor2i/Desktop/sw/conference-registration/docs/payment/2026-04-28 Members IABSE (1).xls";
        int imported = iasbseMemberService.importFromLocalFile(defaultPath);
        if (imported > 0) {
            org.slf4j.LoggerFactory.getLogger(DataInitializer.class)
                    .info("Successfully seeded " + imported + " IABSE members from local excel: " + defaultPath);
        } else {
            org.slf4j.LoggerFactory.getLogger(DataInitializer.class)
                    .warn("Skipped seeding IABSE members. Excel file not found or empty: " + defaultPath);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 컨퍼런스 옵션 시드 — 시작 시 항상 desiredOptions() 기준으로 동기화한다.
    //   · 신규 옵션: insert
    //   · 기존 옵션: 가격·정원·문구 등 갱신 (판매 수량 currentCount는 보존)
    //   · 목록에서 빠진 옵션: 비활성화 (결제 이력 FK 보존을 위해 삭제하지 않음)
    // ─────────────────────────────────────────────────────────────────────────
    private void seedOptions() {
        List<ConferenceOption> desired = desiredOptions();
        Set<String> desiredIds = desired.stream()
                .map(ConferenceOption::getId)
                .collect(Collectors.toSet());

        for (ConferenceOption d : desired) {
            optionRepository.findById(d.getId())
                    .ifPresentOrElse(
                            existing -> existing.syncFrom(d),
                            () -> optionRepository.save(d));
        }

        optionRepository.findAll().forEach(o -> {
            if (!desiredIds.contains(o.getId()) && o.isActive()) {
                o.deactivate();
            }
        });
    }

    /**
     * 등록비·옵션비 기준 데이터.
     * 등록비 카테고리 5종(IABSE Member / Non-IABSE Member / Non-Member Plus /
     * Young Engineer / Additional Badge for Exhibitors)을 기간 3티어로 구성한다.
     * 등록비 옵션은 모든 회원 유형에 노출하고(allowedMemberType = null), 카테고리 잠금은
     * 프론트엔드에서 처리한다.
     */
    private List<ConferenceOption> desiredOptions() {
        return List.of(
                // ── 등록비: 얼리버드 (~6/30) ──────────────────────────────────────
                reg("OPT-REG-PRE-MEMBER",
                        "얼리버드 (IABSE 회원)", "Early Bird — IABSE Member", 1_200_000L),
                reg("OPT-REG-PRE-NM",
                        "얼리버드 (비IABSE 회원)", "Early Bird — Non-IABSE Member", 1_400_000L),
                reg("OPT-REG-PRE-NMP",
                        "얼리버드 (비회원 Plus, 1년 IABSE 회원권 포함)",
                        "Early Bird — IABSE-Non Member Plus (includes 1 year IABSE membership)", 1_500_000L),
                reg("OPT-REG-PRE-YE",
                        "얼리버드 (Young Engineer)", "Early Bird — Young Engineer", 700_000L),
                reg("OPT-REG-PRE-EXH",
                        "얼리버드 (전시자 추가 배지)",
                        "Early Bird — Additional Badge for Exhibitors", 450_000L),

                // ── 등록비: 일반등록 (7/1~8/31) ──────────────────────────────────
                reg("OPT-REG-EARLY-MEMBER",
                        "일반등록 (IABSE 회원)", "General Registration — IABSE Member", 1_350_000L),
                reg("OPT-REG-EARLY-NM",
                        "일반등록 (비IABSE 회원)", "General Registration — Non-IABSE Member", 1_550_000L),
                reg("OPT-REG-EARLY-NMP",
                        "일반등록 (비회원 Plus, 1년 IABSE 회원권 포함)",
                        "General Registration — IABSE-Non Member Plus (includes 1 year IABSE membership)", 1_650_000L),
                reg("OPT-REG-EARLY-YE",
                        "일반등록 (Young Engineer)", "General Registration — Young Engineer", 700_000L),
                reg("OPT-REG-EARLY-EXH",
                        "일반등록 (전시자 추가 배지)",
                        "General Registration — Additional Badge for Exhibitors", 450_000L),

                // ── 등록비: 현장등록 (9/14~) ─────────────────────────────────────
                reg("OPT-REG-MEMBER",
                        "현장등록 (IABSE 회원)", "On-site Registration — IABSE Member", 1_500_000L),
                reg("OPT-REG-NONMEMBER",
                        "현장등록 (비IABSE 회원)", "On-site Registration — Non-IABSE Member", 1_700_000L),
                reg("OPT-REG-NONMEMBER-PLUS",
                        "현장등록 (비회원 Plus, 1년 IABSE 회원권 포함)",
                        "On-site Registration — IABSE-Non Member Plus (includes 1 year IABSE membership)", 1_800_000L),
                reg("OPT-REG-YE",
                        "현장등록 (Young Engineer)", "On-site Registration — Young Engineer", 900_000L),
                reg("OPT-REG-EXH",
                        "현장등록 (전시자 추가 배지)",
                        "On-site Registration — Additional Badge for Exhibitors", 550_000L),

                // ── 옵션비: 사회 행사 / 부대 프로그램 ────────────────────────────
                new ConferenceOption(
                        "OPT-WELCOME", OptionCategory.PROGRAM,
                        "환영 리셉션", "Welcome Reception",
                        "I would like to attend the Welcome reception at the Congress Venue",
                        0L, true, false, false, null, null),
                new ConferenceOption(
                        "OPT-GALA-DINNER", OptionCategory.PROGRAM,
                        "갈라 디너", "Gala Dinner",
                        "I would like to attend the Gala dinner at the Gyeongwonjae",
                        250_000L, false, false, false, null, 200),
                new ConferenceOption(
                        "OPT-GALA-DINNER-YE", OptionCategory.PROGRAM,
                        "갈라 디너 (Young Engineer)", "Gala Dinner (Young Engineer)",
                        "I would like to attend the Gala dinner at the Gyeongwonjae",
                        200_000L, false, false, false, MemberType.YOUNG_ENGINEER, 80),
                new ConferenceOption(
                        "OPT-TECH-TOUR-1", OptionCategory.PROGRAM,
                        "기술 투어 1", "Technical Tour 1 — Cheongna Sky Bridge",
                        "I would like to attend the Cheongna Sky Bridge tour",
                        70_000L, false, false, false, null, 40),
                new ConferenceOption(
                        "OPT-TECH-TOUR-2", OptionCategory.PROGRAM,
                        "기술 투어 2", "Technical Tour 2 — Gimpo-Paju Tunnel",
                        "I would like to attend the Gimpo-Paju Tunnel tour",
                        0L, false, false, false, null, 40),
                new ConferenceOption(
                        "OPT-TECH-TOUR-3", OptionCategory.PROGRAM,
                        "기술 투어 3", "Technical Tour 3 — Yeongdong-daero Underground Complex",
                        "I would like to attend the Underground Complex Site at Yeongdong-daero tour",
                        0L, false, false, false, null, 40),

                // ── 옵션비: 동반자 등록 (기간별 금액 상이) ───────────────────────
                new ConferenceOption(
                        "OPT-ACCOMP-PRE", OptionCategory.PROGRAM,
                        "동반자 등록 (사전등록)", "Accompanying Person",
                        "I would like to register an accompanying person",
                        350_000L, false, false, false, null, null),
                new ConferenceOption(
                        "OPT-ACCOMP-EARLY", OptionCategory.PROGRAM,
                        "동반자 등록 (얼리버드)", "Accompanying Person",
                        "I would like to register an accompanying person",
                        350_000L, false, false, false, null, null),
                new ConferenceOption(
                        "OPT-ACCOMP-REGULAR", OptionCategory.PROGRAM,
                        "동반자 등록 (일반등록)", "Accompanying Person",
                        "I would like to register an accompanying person",
                        400_000L, false, false, false, null, null),

                // ── 행정 서비스 ──────────────────────────────────────────────────
                new ConferenceOption(
                        "OPT-VISA", OptionCategory.ADMIN,
                        "초청장 (비자용)", "Official Invitation Letter (Visa)",
                        null, 0L, true, false, false, null, null)
        );
    }

    /** 등록비 옵션 — 모든 회원 유형 노출, 정원 무제한, 필수 항목. */
    private ConferenceOption reg(String id, String nameKr, String nameEn, long price) {
        return new ConferenceOption(
                id, OptionCategory.REGISTRATION, nameKr, nameEn, null,
                price, false, true, false, null, null);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 개발용 테스트 계정 (이메일 인증 완료 상태로 생성)
    //
    //  member@test.com   / Test1234!  →  MEMBER        (IASBSE 회원)
    //  young@test.com    / Test1234!  →  NON_MEMBER    (Young Engineer, 1995년생 → 만 30세)
    //  senior@test.com   / Test1234!  →  NON_MEMBER_PLUS (일반 비회원, 1978년생 → 만 47세)
    // ─────────────────────────────────────────────────────────────────────────
    /** SHA-256 hex of a plaintext password — mirrors the client-side hashing in api.ts */
    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(64);
            for (byte b : hash) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private void seedTestAccounts() {
        String pw = passwordEncoder.encode(sha256("Test1234!"));

        // 1) IASBSE 회원 등록
        if (!iasbseMemberRepository.existsByFirstNameIgnoreCaseAndLastNameIgnoreCaseAndCompanyIgnoreCase("Hoewon", "Kim", "POSTECH")) {
            iasbseMemberRepository.save(new IasbseMember("Hoewon", "Kim", "POSTECH", "Active"));
        }
        if (!iasbseMemberRepository.existsByFirstNameIgnoreCaseAndLastNameIgnoreCaseAndCompanyIgnoreCase("John", "Smith", "Stanford University")) {
            iasbseMemberRepository.save(new IasbseMember("John", "Smith", "Stanford University", "Active"));
        }

        // 2) MEMBER 계정 (IASBSE 회원, 이메일 인증 완료, 국내 계정)
        seedUser("member@test.com", pw, "Kim", "Hoewon", "POSTECH", "Professor", "KR", "+82-10-1111-0001", LocalDate.of(1975, 5, 10), MemberType.MEMBER, false);

        // 3) MEMBER 계정 (IASBSE 회원, 이메일 인증 완료, 해외 계정)
        seedUser("overseas@test.com", pw, "Smith", "John", "Stanford University", "Associate Professor", "US", "+1-650-555-0123", LocalDate.of(1982, 11, 5), MemberType.MEMBER, false);

        // 4) YOUNG_ENGINEER 계정 (비회원, 만 30세, 해외 계정)
        seedUser("young@test.com", pw, "Lee", "Cheongnyeon", "KAIST", "Ph.D. Candidate", "US", "+1-555-0199", LocalDate.of(1995, 8, 20), MemberType.YOUNG_ENGINEER, false);

        // 5) NON_MEMBER 계정 (일반 비회원, 만 47세, 해외 계정)
        seedUser("senior@test.com", pw, "Park", "Senior", "KICT", "Principal Researcher", "JP", "+81-90-1111-2222", LocalDate.of(1978, 3, 15), MemberType.NON_MEMBER, false);

        // 6) 관리자 계정 (admin@kibse.or.kr / Admin2026!)
        seedUser("admin@kibse.or.kr", passwordEncoder.encode(sha256("Admin2026!")), "System", "Administrator", "KIBSE", "Admin", "KR", "+82-2-0000-0000", LocalDate.of(1985, 1, 1), MemberType.MEMBER, true);
    }

    private void seedUser(String email, String pw, String lastName, String firstName,
                          String affiliation, String position, String country, String phone,
                          LocalDate birthDate, MemberType type, boolean isAdmin) {
        userRepository.findByEmailAndActiveTrue(email).ifPresentOrElse(
                user -> {
                    user.updateProfile(firstName, lastName, affiliation, country, position, phone, birthDate);
                    userRepository.save(user);
                },
                () -> {
                    User newUser = new User(email, pw, lastName, firstName, affiliation, position, country, phone, birthDate, type);
                    newUser.verifyEmail();
                    if (isAdmin) newUser.promoteToAdmin();
                    userRepository.save(newUser);
                }
        );
    }
}
