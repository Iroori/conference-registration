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
        long totalCount = iasbseMemberRepository.count();
        long withIdCount = iasbseMemberRepository.countByIabseIdNotNull();
        boolean hasFellowSeeded = iasbseMemberRepository.existsByIabseIdIgnoreCase("66811267");
        if (totalCount > 0 && withIdCount == totalCount && hasFellowSeeded) {
            org.slf4j.LoggerFactory.getLogger(DataInitializer.class)
                    .info("IABSE members database already contains new format records including Fellow. Skipping excel seeding to preserve data.");
            return;
        }
        org.slf4j.LoggerFactory.getLogger(DataInitializer.class)
                .info("IABSE members database needs update or is empty. Clearing and seeding from new excel.");
        iasbseMemberRepository.deleteAll();

        String defaultPath = "2026-06-02 Members IABSE.xls";
        int imported = iasbseMemberService.importFromResource(defaultPath);
        if (imported > 0) {
            org.slf4j.LoggerFactory.getLogger(DataInitializer.class)
                    .info("Successfully seeded " + imported + " IABSE members from classpath resource: " + defaultPath);
        } else {
            org.slf4j.LoggerFactory.getLogger(DataInitializer.class)
                    .warn("Skipped seeding IABSE members. Classpath resource not found or empty: " + defaultPath);
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
                            existing -> {
                                existing.syncFrom(d);
                                optionRepository.save(existing);
                            },
                            () -> optionRepository.save(d));
        }

        optionRepository.findAll().forEach(o -> {
            if (!desiredIds.contains(o.getId()) && o.isActive()) {
                o.deactivate();
                optionRepository.save(o);
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
                // ── 등록비: 사전등록 고정요율 (Early Bird 요율) ────────────────────
                reg("OPT-REG-PRE-MEMBER",
                        "얼리버드 (IABSE 회원)", "Early Bird — IABSE Member", 1_300_000L),
                reg("OPT-REG-PRE-NM",
                        "얼리버드 (비IABSE 회원)", "Early Bird — Non-IABSE Member", 1_400_000L),
                reg("OPT-REG-PRE-NMP",
                        "얼리버드 (비회원 Plus, 1년 IABSE 회원권 포함)",
                        "Early Bird — IABSE-Non Member Plus (includes 1 year IABSE membership)", 1_500_000L),
                reg("OPT-REG-PRE-YE",
                        "얼리버드 (Young Engineer)", "Early Bird — Young Engineer", 800_000L),
                reg("OPT-REG-PRE-EXH",
                        "얼리버드 (전시자 추가 배지)",
                        "Early Bird — Additional Badge for Exhibitors", 500_000L),

                new ConferenceOption(
                        "OPT-WELCOME", OptionCategory.PROGRAM,
                        "환영 리셉션", "Welcome Reception",
                        "I would like to attend the Welcome reception at the Congress Venue",
                        0L, true, false, false, null, 600),
                new ConferenceOption(
                        "OPT-YE-PROGRAM", OptionCategory.PROGRAM,
                        "Young Engineer 프로그램", "Young Engineers Programme",
                        "I will attend the Young Engineer Programme social networking event.",
                        0L, true, false, false, null, null),
                new ConferenceOption(
                        "OPT-PECHAKUCHA", OptionCategory.PROGRAM,
                        "Pechakucha 세션 발표 신청", "Pechakucha Session Presentation",
                        "I would like to present in the Pechakucha session.",
                        0L, true, false, false, null, null),
                new ConferenceOption(
                        "OPT-GALA-DINNER", OptionCategory.PROGRAM,
                        "갈라 디너", "Gala Dinner",
                        "I would like to attend the Gala dinner at the Gyeongwonjae",
                        250_000L, false, false, false, null, 200),
                new ConferenceOption(
                        "OPT-TECH-TOUR-1", OptionCategory.PROGRAM,
                        "기술 투어 I", "Technical Tour I — Cheongna Sky Bridge",
                        "I would like to attend the Cheongna Sky Bridge tour",
                        90_000L, false, false, false, null, 40),
                new ConferenceOption(
                        "OPT-TECH-TOUR-2", OptionCategory.PROGRAM,
                        "기술 투어 II", "Technical Tour II — Gimpo-Paju Tunnel",
                        "I would like to attend the Gimpo-Paju Tunnel tour",
                        90_000L, false, false, false, null, 40),
                new ConferenceOption(
                        "OPT-TECH-TOUR-3", OptionCategory.PROGRAM,
                        "기술 투어 III", "Technical Tour III — Yeongdong-daero Underground Complex",
                        "I would like to attend the Underground Complex Site at Yeongdong-daero tour",
                        90_000L, false, false, false, null, 40),

                // ── 옵션비: 동반자 등록 (사전등록요율 고정) ───────────────────────
                new ConferenceOption(
                        "OPT-ACCOMP-PRE", OptionCategory.PROGRAM,
                        "동반자 등록 (사전등록)", "Accompanying Person",
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
    //  senior@test.com   / Test1234!  →  NON_MEMBER (일반 비회원, 1978년생 → 만 47세)
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
        // 관리자 계정 (admin@kibse.or.kr / Admin2026!)
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
