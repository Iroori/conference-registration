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

@Component
public class DataInitializer implements ApplicationRunner {

    private final ConferenceOptionRepository optionRepository;
    private final UserRepository userRepository;
    private final IasbseMemberRepository iasbseMemberRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(ConferenceOptionRepository optionRepository,
                           UserRepository userRepository,
                           IasbseMemberRepository iasbseMemberRepository,
                           PasswordEncoder passwordEncoder) {
        this.optionRepository = optionRepository;
        this.userRepository = userRepository;
        this.iasbseMemberRepository = iasbseMemberRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedOptions();
        seedTestAccounts();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 컨퍼런스 옵션 초기 데이터
    // ─────────────────────────────────────────────────────────────────────────
    private void seedOptions() {
        if (optionRepository.count() > 0) return;

        optionRepository.saveAll(List.of(

                // ── Pre-Registration (4 categories) ──────────────────────────────────
                new ConferenceOption(
                        "OPT-REG-PRE-MEMBER",
                        OptionCategory.REGISTRATION,
                        "사전등록 (IABSE 회원)",
                        "Pre-Registration — IABSE Member",
                        null,
                        1_200_000L, false, true, false,
                        MemberType.MEMBER, null
                ),
                new ConferenceOption(
                        "OPT-REG-PRE-NM",
                        OptionCategory.REGISTRATION,
                        "사전등록 (비회원)",
                        "Pre-Registration — Non-Member",
                        null,
                        1_400_000L, false, true, false,
                        MemberType.NON_MEMBER, null
                ),
                new ConferenceOption(
                        "OPT-REG-PRE-NMP",
                        OptionCategory.REGISTRATION,
                        "사전등록 (비회원 Plus)",
                        "Pre-Registration — Non-Member Plus",
                        null,
                        1_500_000L, false, true, false,
                        MemberType.NON_MEMBER_PLUS, null
                ),
                new ConferenceOption(
                        "OPT-REG-PRE-YE",
                        OptionCategory.REGISTRATION,
                        "사전등록 (Young Engineer)",
                        "Pre-Registration — Young Engineer",
                        null,
                        700_000L, false, true, false,
                        MemberType.YOUNG_ENGINEER, null
                ),

                // ── Early Bird (+20% 임의 가격, 실제 가격 미정) ─────────────────────
                new ConferenceOption(
                        "OPT-REG-EARLY-MEMBER",
                        OptionCategory.REGISTRATION,
                        "얼리버드 등록 (IABSE 회원)",
                        "Early Bird Registration — IABSE Member",
                        null,
                        1_440_000L, false, true, false,
                        MemberType.MEMBER, null
                ),
                new ConferenceOption(
                        "OPT-REG-EARLY-NM",
                        OptionCategory.REGISTRATION,
                        "얼리버드 등록 (비회원)",
                        "Early Bird Registration — Non-Member",
                        null,
                        1_680_000L, false, true, false,
                        MemberType.NON_MEMBER, null
                ),
                new ConferenceOption(
                        "OPT-REG-EARLY-NMP",
                        OptionCategory.REGISTRATION,
                        "얼리버드 등록 (비회원 Plus)",
                        "Early Bird Registration — Non-Member Plus",
                        null,
                        1_800_000L, false, true, false,
                        MemberType.NON_MEMBER_PLUS, null
                ),
                new ConferenceOption(
                        "OPT-REG-EARLY-YE",
                        OptionCategory.REGISTRATION,
                        "얼리버드 등록 (Young Engineer)",
                        "Early Bird Registration — Young Engineer",
                        null,
                        840_000L, false, true, false,
                        MemberType.YOUNG_ENGINEER, null
                ),

                // ── Regular Registration (+40% 임의 가격, 실제 가격 미정) ──────────
                new ConferenceOption(
                        "OPT-REG-MEMBER",
                        OptionCategory.REGISTRATION,
                        "일반등록 (IABSE 회원)",
                        "Regular Registration — IABSE Member",
                        null,
                        1_680_000L, false, true, false,
                        MemberType.MEMBER, null
                ),
                new ConferenceOption(
                        "OPT-REG-NONMEMBER",
                        OptionCategory.REGISTRATION,
                        "일반등록 (비회원)",
                        "Regular Registration — Non-Member",
                        null,
                        1_960_000L, false, true, false,
                        MemberType.NON_MEMBER, null
                ),
                new ConferenceOption(
                        "OPT-REG-NONMEMBER-PLUS",
                        OptionCategory.REGISTRATION,
                        "일반등록 (비회원 Plus)",
                        "Regular Registration — Non-Member Plus",
                        null,
                        2_100_000L, false, true, false,
                        MemberType.NON_MEMBER_PLUS, null
                ),
                new ConferenceOption(
                        "OPT-REG-YE",
                        OptionCategory.REGISTRATION,
                        "일반등록 (Young Engineer)",
                        "Regular Registration — Young Engineer",
                        null,
                        980_000L, false, true, false,
                        MemberType.YOUNG_ENGINEER, null
                ),

                // ── Social Events / Additional Programs ───────────────────────────────
                new ConferenceOption(
                        "OPT-WELCOME",
                        OptionCategory.PROGRAM,
                        "환영 리셉션",
                        "Welcome Reception (Sep 16)",
                        null,
                        0L, true, false, false,
                        null, null
                ),
                new ConferenceOption(
                        "OPT-GALA-DINNER",
                        OptionCategory.PROGRAM,
                        "갈라 디너",
                        "Gala Dinner (Sep 17)",
                        null,
                        200_000L, false, false, false,
                        null, 230
                ),
                new ConferenceOption(
                        "OPT-TECH-TOUR",
                        OptionCategory.PROGRAM,
                        "기술 투어",
                        "Technical Tour (Sep 19)",
                        null,
                        100_000L, false, false, false,
                        null, 40
                ),
                new ConferenceOption(
                        "OPT-ACCOMPANYING",
                        OptionCategory.PROGRAM,
                        "동반자 워킹 투어",
                        "Accompanying Persons Walking Tour",
                        null,
                        100_000L, false, false, false,
                        null, null
                ),
                new ConferenceOption(
                        "OPT-PRE-WORKSHOP",
                        OptionCategory.PROGRAM,
                        "프리 워크숍",
                        "Pre-Workshop",
                        null,
                        80_000L, false, false, false,
                        null, null
                ),

                // ── Administrative Services ───────────────────────────────────────────
                new ConferenceOption(
                        "OPT-VISA",
                        OptionCategory.ADMIN,
                        "초청장 (비자용)",
                        "Official Invitation Letter (Visa)",
                        null,
                        0L, true, false, false,
                        null, null
                )
        ));
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
        if (userRepository.count() > 0) return;

        // Store BCrypt(SHA-256("Test1234!")) to match the client-side hashing scheme
        String pw = passwordEncoder.encode(sha256("Test1234!"));

        // 1) IASBSE 회원 등록 (member@test.com)
        iasbseMemberRepository.save(
                new IasbseMember("member@test.com", "김회원", "Kim Hoewon",
                        "POSTECH", "IASBSE-001")
        );

        // 2) MEMBER 계정 (IASBSE 회원, 이메일 인증 완료)
        User member = new User(
                "member@test.com", pw,
                "김회원", "Kim Hoewon",
                "POSTECH", "교수",
                "대한민국", "+82-10-1111-0001",
                LocalDate.of(1975, 5, 10),
                MemberType.MEMBER
        );
        member.verifyEmail();
        userRepository.save(member);

        // 3) YOUNG_ENGINEER 계정 (비회원, 만 30세)
        User youngEngineer = new User(
                "young@test.com", pw,
                "이청년", "Lee Cheongnyeon",
                "KAIST", "박사과정",
                "대한민국", "+82-10-2222-0002",
                LocalDate.of(1995, 8, 20),
                MemberType.YOUNG_ENGINEER
        );
        youngEngineer.verifyEmail();
        userRepository.save(youngEngineer);

        // 4) NON_MEMBER 계정 (일반 비회원, 만 47세)
        User senior = new User(
                "senior@test.com", pw,
                "박시니어", "Park Senior",
                "한국건설기술연구원", "수석연구원",
                "대한민국", "+82-10-3333-0003",
                LocalDate.of(1978, 3, 15),
                MemberType.NON_MEMBER
        );
        senior.verifyEmail();
        userRepository.save(senior);

        // 5) 관리자 계정 (admin@kibse.or.kr / Admin2026!)
        //    잔여 티켓 조회 등 관리자 전용 엔드포인트 접근용.
        User admin = new User(
                "admin@kibse.or.kr", passwordEncoder.encode(sha256("Admin2026!")),
                "관리자", "Administrator",
                "KIBSE", "Admin",
                "대한민국", "+82-2-0000-0000",
                LocalDate.of(1985, 1, 1),
                MemberType.MEMBER
        );
        admin.verifyEmail();
        admin.promoteToAdmin();
        userRepository.save(admin);
    }
}
