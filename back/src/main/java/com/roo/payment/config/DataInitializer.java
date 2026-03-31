package com.roo.payment.config;

import com.roo.payment.domain.option.entity.ConferenceOption;
import com.roo.payment.domain.option.entity.OptionCategory;
import com.roo.payment.domain.option.repository.ConferenceOptionRepository;
import com.roo.payment.domain.user.entity.MemberType;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class DataInitializer implements ApplicationRunner {

    private final ConferenceOptionRepository optionRepository;

    public DataInitializer(ConferenceOptionRepository optionRepository) {
        this.optionRepository = optionRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (optionRepository.count() > 0) return;

        optionRepository.saveAll(List.of(
                // ─── REGISTRATION ───────────────────────────────────────────
                // MEMBER 전용 등록비
                new ConferenceOption(
                        "OPT-REG-MEMBER",
                        OptionCategory.REGISTRATION,
                        "컨퍼런스 등록 (IASBSE 회원)",
                        "Conference Registration (IASBSE Member)",
                        "전일정 포함 · 논문집 PDF 제공",
                        150_000L, false, true, false,
                        MemberType.MEMBER, null
                ),
                // NON_MEMBER(Young Engineer) 전용 등록비
                new ConferenceOption(
                        "OPT-REG-NONMEMBER",
                        OptionCategory.REGISTRATION,
                        "컨퍼런스 등록 (비회원 - Young Engineer)",
                        "Conference Registration (Non-Member, Young Engineer)",
                        "전일정 포함 · 만 35세 이하",
                        250_000L, false, true, false,
                        MemberType.NON_MEMBER, null
                ),
                // NON_MEMBER_PLUS(일반 비회원) 전용 등록비
                new ConferenceOption(
                        "OPT-REG-NONMEMBER-PLUS",
                        OptionCategory.REGISTRATION,
                        "컨퍼런스 등록 (비회원 - 일반)",
                        "Conference Registration (Non-Member)",
                        "전일정 포함 · 현장 등록",
                        320_000L, false, true, false,
                        MemberType.NON_MEMBER_PLUS, null
                ),

                // ─── PROGRAM ────────────────────────────────────────────────
                // 모든 유형 허용 (allowedMemberType = null)
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
                // Young Engineer 전용 프로그램
                new ConferenceOption(
                        "OPT-YEP",
                        OptionCategory.PROGRAM,
                        "영 엔지니어 프로그램",
                        "Young Engineer Program",
                        "만 35세 이하 · 멘토링 + 네트워킹 세션",
                        30_000L, false, false, false,
                        MemberType.NON_MEMBER, null
                ),

                // ─── ADMIN ──────────────────────────────────────────────────
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
}
