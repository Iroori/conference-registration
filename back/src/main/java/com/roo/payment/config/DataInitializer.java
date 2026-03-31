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
                new ConferenceOption(
                        "OPT-REG-MEMBER",
                        OptionCategory.REGISTRATION,
                        "컨퍼런스 등록 (IASBSE 회원)",
                        "Conference Registration (IASBSE Member)",
                        "전일정 포함 · 논문집 PDF 제공",
                        150_000L, false, true, false,
                        MemberType.MEMBER, null
                ),
                new ConferenceOption(
                        "OPT-REG-NONMEMBER",
                        OptionCategory.REGISTRATION,
                        "컨퍼런스 등록 (비회원 - Young Engineer)",
                        "Conference Registration (Non-Member, Young Engineer)",
                        "전일정 포함 · 만 35세 이하",
                        250_000L, false, true, false,
                        MemberType.NON_MEMBER, null
                ),
                new ConferenceOption(
                        "OPT-REG-NONMEMBER-PLUS",
                        OptionCategory.REGISTRATION,
                        "컨퍼런스 등록 (비회원 - 일반)",
                        "Conference Registration (Non-Member)",
                        "전일정 포함 · 현장 등록",
                        320_000L, false, true, false,
                        MemberType.NON_MEMBER_PLUS, null
                ),
                new ConferenceOption(
                        "OPT-GALA",
                        OptionCategory.PROGRAM,
                        "갈라 디너",
                        "Gala Dinner",
                        "Day 2 저녁 · 공식 만찬 · 드레스코드: 비즈니스 캐주얼",
                        80_000L, false, false, false,
                        null, null
                ),
                new ConferenceOption(
                        "OPT-TOUR",
                        OptionCategory.PROGRAM,
                        "투어 프로그램",
                        "Tour Program",
                        "Day 3 오후 · 도시 문화 투어 · 버스 이동 포함",
                        50_000L, false, false, false,
                        null, 40
                ),
                new ConferenceOption(
                        "OPT-YEP",
                        OptionCategory.PROGRAM,
                        "영 엔지니어 프로그램",
                        "Young Engineer Program",
                        "만 35세 이하 · 멘토링 + 네트워킹 세션",
                        30_000L, false, false, false,
                        MemberType.NON_MEMBER, null
                ),
                new ConferenceOption(
                        "OPT-VISA",
                        OptionCategory.ADMIN,
                        "비자 초청장 요청",
                        "Visa Invitation Letter",
                        "여권 정보 입력 필요 · 5영업일 이내 발급",
                        0L, true, false, false,
                        null, null
                ),
                new ConferenceOption(
                        "OPT-PROCEEDINGS",
                        OptionCategory.ADMIN,
                        "논문집 인쇄본",
                        "Printed Proceedings",
                        "현장 수령 · USB 동봉",
                        20_000L, false, false, false,
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
    private void seedTestAccounts() {
        if (userRepository.count() > 0) return;

        String pw = passwordEncoder.encode("Test1234!");

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

        // 3) NON_MEMBER 계정 (Young Engineer, 만 30세)
        User youngEngineer = new User(
                "young@test.com", pw,
                "이청년", "Lee Cheongnyeon",
                "KAIST", "박사과정",
                "대한민국", "+82-10-2222-0002",
                LocalDate.of(1995, 8, 20),
                MemberType.NON_MEMBER
        );
        youngEngineer.verifyEmail();
        userRepository.save(youngEngineer);

        // 4) NON_MEMBER_PLUS 계정 (일반 비회원, 만 47세)
        User senior = new User(
                "senior@test.com", pw,
                "박시니어", "Park Senior",
                "한국건설기술연구원", "수석연구원",
                "대한민국", "+82-10-3333-0003",
                LocalDate.of(1978, 3, 15),
                MemberType.NON_MEMBER_PLUS
        );
        senior.verifyEmail();
        userRepository.save(senior);
    }
}
