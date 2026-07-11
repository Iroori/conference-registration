package com.roo.payment.domain.payment.service;

import com.roo.payment.common.exception.BusinessException;
import com.roo.payment.common.exception.ErrorCode;
import com.roo.payment.config.AppProperties;
import com.roo.payment.domain.option.entity.ConferenceOption;
import com.roo.payment.domain.option.repository.ConferenceOptionRepository;
import com.roo.payment.domain.payment.dto.InitiatePaymentRequest;
import com.roo.payment.domain.payment.dto.CompletePaymentRequest;
import com.roo.payment.domain.payment.dto.PaymentResponse;
import com.roo.payment.domain.payment.entity.DiscountCode;
import com.roo.payment.domain.payment.entity.Payment;
import com.roo.payment.domain.payment.entity.PaymentStatus;
import com.roo.payment.domain.payment.entity.OptionWaitlist;
import com.roo.payment.domain.payment.repository.PaymentRepository;
import com.roo.payment.domain.payment.repository.OptionWaitlistRepository;
import com.roo.payment.domain.user.entity.User;
import com.roo.payment.domain.user.repository.UserRepository;
import com.roo.payment.domain.user.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.HttpURLConnection;
import java.net.URL;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@Service
@Transactional(readOnly = true)
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    /** 등록번호 prefix — IABSE 브랜딩 */
    private static final String REG_NUMBER_PREFIX = "IABSE-2026-";

    /** 동반자 등록 옵션 ID 접두사 */
    private static final String ACCOMPANYING_OPTION_PREFIX = "OPT-ACCOMP";

    private final PaymentRepository paymentRepository;
    private final ConferenceOptionRepository optionRepository;
    private final OptionWaitlistRepository optionWaitlistRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final AppProperties appProperties;
    private final DiscountCodeService discountCodeService;

    public PaymentService(PaymentRepository paymentRepository,
            ConferenceOptionRepository optionRepository,
            OptionWaitlistRepository optionWaitlistRepository,
            UserRepository userRepository,
            EmailService emailService,
            AppProperties appProperties,
            DiscountCodeService discountCodeService) {
        this.paymentRepository = paymentRepository;
        this.optionRepository = optionRepository;
        this.optionWaitlistRepository = optionWaitlistRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.appProperties = appProperties;
        this.discountCodeService = discountCodeService;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 결제 생성
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public PaymentResponse initiatePayment(String email, InitiatePaymentRequest request) {
        log.info("[PAYMENT] Initiating payment — email={} options={} method={}",
                maskEmail(email), request.selectedOptionIds(), request.paymentMethod());

        User user = userRepository.findByEmailAndActiveTrue(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 옵션 조회 및 검증
        List<String> uniqueIds = request.selectedOptionIds().stream().distinct().toList();
        List<ConferenceOption> options = optionRepository.findAllById(uniqueIds);
        if (options.size() != uniqueIds.size()) {
            throw new BusinessException(ErrorCode.OPTION_NOT_FOUND);
        }

        // 동반자 등록 옵션이 선택된 경우 동반자 이름 필수
        boolean hasAccompanying = uniqueIds.stream()
                .anyMatch(id -> id.startsWith(ACCOMPANYING_OPTION_PREFIX));
        if (hasAccompanying && (request.accompanyingPersons() == null || request.accompanyingPersons().isEmpty())) {
            throw new BusinessException(ErrorCode.ACCOMPANYING_NAME_REQUIRED);
        }

        // 전시자 등록 옵션이 선택된 경우 전시자 이름 필수
        boolean hasExhibitor = uniqueIds.stream()
                .anyMatch(id -> id.contains("-EXH"));
        if (hasExhibitor && (request.exhibitorBadges() == null || request.exhibitorBadges().isEmpty())) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Exhibitor badge names are required.");
        }

        // 초청장(비자) 옵션이 선택된 경우 여권 정보 필수 검증
        boolean needsVisa = uniqueIds.contains("OPT-VISA");
        if (needsVisa) {
            if (request.passportFirstName() == null || request.passportFirstName().isBlank() ||
                request.passportLastName() == null || request.passportLastName().isBlank() ||
                request.passportNumber() == null || request.passportNumber().isBlank() ||
                request.birthDate() == null) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, "Passport details are required for visa invitation letter.");
            }
        }

        // 입력 문자열 크기 검증 (DB Truncation 오류 사전 방지)
        if (request.iabseId() != null && request.iabseId().length() > 100) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "IABSE ID cannot exceed 100 characters.");
        }
        if (request.appliedDiscountCode() != null && request.appliedDiscountCode().length() > 30) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Discount code cannot exceed 30 characters.");
        }
        if (request.passportFirstName() != null && request.passportFirstName().length() > 100) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Passport First Name cannot exceed 100 characters.");
        }
        if (request.passportLastName() != null && request.passportLastName().length() > 100) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Passport Last Name cannot exceed 100 characters.");
        }
        if (request.passportNumber() != null && request.passportNumber().length() > 100) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Passport Number cannot exceed 100 characters.");
        }

        List<String> waitlistedIds = request.waitlistedOptionIds() != null ? request.waitlistedOptionIds() : List.of();

        List<ConferenceOption> activeOptions = options.stream()
                .filter(o -> !waitlistedIds.contains(o.getId()))
                .toList();

        List<ConferenceOption> waitlistedOptions = options.stream()
                .filter(o -> waitlistedIds.contains(o.getId()))
                .toList();

        Map<String, Integer> quantities = request.quantities() != null ? request.quantities() : Map.of();

        // 정원 초과 검증
        for (ConferenceOption option : activeOptions) {
            int qty = quantities.getOrDefault(option.getId(), 1);
            if (option.getMaxCapacity() != null
                    && option.getCurrentCount() + qty > option.getMaxCapacity()) {
                log.warn("[PAYMENT] Capacity exceeded — option={} current={} requested={}",
                        option.getNameEn(), option.getCurrentCount(), qty);
                throw new BusinessException(ErrorCode.OPTION_CAPACITY_EXCEEDED,
                        option.getNameEn() + " has exceeded the available capacity.");
            }
        }

        // 가격 계산 (대기자 신청한 옵션의 비용 제외)
        long subtotal = activeOptions.stream()
                .mapToLong(o -> o.getPrice() * quantities.getOrDefault(o.getId(), 1))
                .sum();
        long tax = 0;

        // 할인 적용 계산
        String appliedCode = null;
        long discountReg = 0;
        long discountGala = 0;
        long discountAccomp = 0;
        long discountTour = 0;
        long discountTotal = 0;
        DiscountCode appliedDiscount = null;

        if (request.appliedDiscountCode() != null && !request.appliedDiscountCode().isBlank()) {
            appliedDiscount = discountCodeService.verifyDiscountCode(request.appliedDiscountCode());
            appliedCode = appliedDiscount.getCode();

            // 1. 등록비 할인 계산
            ConferenceOption regOpt = activeOptions.stream()
                    .filter(o -> o.getCategory() == com.roo.payment.domain.option.entity.OptionCategory.REGISTRATION)
                    .findFirst()
                    .orElse(null);

            if (regOpt != null) {
                int rate = 0;
                boolean isMemberOption = regOpt.getId().contains("-MEMBER") && !regOpt.getId().contains("-NONMEMBER") && !regOpt.getId().contains("-NMP");
                if (isMemberOption) {
                    rate = appliedDiscount.getIabseMemberDiscountRate();
                } else {
                    rate = appliedDiscount.getNonIabseMemberDiscountRate();
                }

                if (rate > 0) {
                    discountReg = (regOpt.getPrice() * rate) / 100;
                }
            }

            // 2. 갈라 디너 할인 계산
            if (appliedDiscount.isGalaDinnerFree()) {
                ConferenceOption galaOpt = activeOptions.stream()
                        .filter(o -> o.getId().equals("OPT-GALA-DINNER"))
                        .findFirst()
                        .orElse(null);
                if (galaOpt != null) {
                    discountGala = galaOpt.getPrice() * quantities.getOrDefault(galaOpt.getId(), 1);
                }
            }

            // 3. 동반인 할인 계산 (1명 무료)
            if (appliedDiscount.isAccompanyingPersonFree()) {
                ConferenceOption accompOpt = activeOptions.stream()
                        .filter(o -> o.getId().startsWith("OPT-ACCOMP-"))
                        .findFirst()
                        .orElse(null);
                if (accompOpt != null) {
                    discountAccomp = accompOpt.getPrice();
                }
            }

            // 4. 기술투어 할인 계산 (무료)
            if (appliedDiscount.isTechnicalTourFree()) {
                ConferenceOption tourOpt = activeOptions.stream()
                        .filter(o -> o.getId().startsWith("OPT-TECH-TOUR-"))
                        .findFirst()
                        .orElse(null);
                if (tourOpt != null) {
                    discountTour = tourOpt.getPrice() * quantities.getOrDefault(tourOpt.getId(), 1);
                }
            }

            discountTotal = discountReg + discountGala + discountAccomp + discountTour;
            discountTotal = Math.min(discountTotal, subtotal + tax);
        }

        // Update user's memberType and profile details (iabseId, birthDate) based on registration selection
        for (String optId : uniqueIds) {
            if (optId.contains("-MEMBER")) {
                user.updateMemberType(com.roo.payment.domain.user.entity.MemberType.MEMBER);
            } else if (optId.contains("-YE")) {
                user.updateMemberType(com.roo.payment.domain.user.entity.MemberType.YOUNG_ENGINEER);
            } else if (optId.contains("-NMP") || optId.contains("-NONMEMBER-PLUS")) {
                user.updateMemberType(com.roo.payment.domain.user.entity.MemberType.NON_MEMBER_PLUS);
            } else if (optId.contains("-NM") || optId.contains("-NONMEMBER")) {
                user.updateMemberType(com.roo.payment.domain.user.entity.MemberType.NON_MEMBER);
            }
        }
        if (request.iabseId() != null && !request.iabseId().isBlank()) {
            user.setIabseId(request.iabseId());
        }
        if (request.birthDate() != null) {
            user.updateProfile(user.getFirstName(), user.getLastName(), user.getAffiliation(),
                               user.getCountry(), user.getPosition(), user.getPhone(), request.birthDate());
        }
        if (request.passportFirstName() != null && !request.passportFirstName().isBlank()) {
            user.setPassportFirstName(request.passportFirstName().trim());
        }
        if (request.passportLastName() != null && !request.passportLastName().isBlank()) {
            user.setPassportLastName(request.passportLastName().trim());
        }
        if (request.passportNumber() != null && !request.passportNumber().isBlank()) {
            user.setPassportNumber(request.passportNumber().trim());
        }
        userRepository.save(user);

        String regNumber = generateRegistrationNumber();

        Payment payment = new Payment(
                regNumber, user, user.getMemberType(),
                request.paymentMethod(), subtotal, tax, options);

        if (appliedCode != null) {
            payment.applyDiscount(appliedCode, discountTotal, discountReg, discountGala, discountAccomp, discountTour);
        }

        // 동반자 정보 저장 (cascade로 결제와 함께 영속화)
        if (hasAccompanying && request.accompanyingPersons() != null) {
            for (var ap : request.accompanyingPersons()) {
                payment.addAccompanyingPerson(ap.lastName(), ap.firstName());
            }
        }

        // 전시자 정보 저장 (cascade로 결제와 함께 영속화)
        if (hasExhibitor && request.exhibitorBadges() != null) {
            for (var eb : request.exhibitorBadges()) {
                payment.addExhibitorBadge(eb.lastName(), eb.firstName());
            }
        }

        // 대기자 정보 저장
        if (!waitlistedOptions.isEmpty()) {
            for (var opt : waitlistedOptions) {
                OptionWaitlist waitlist = new OptionWaitlist(payment, opt);
                optionWaitlistRepository.save(waitlist);
            }
        }

        paymentRepository.save(payment);

        log.info("[PAYMENT] Payment initiated — email={} regNo={} amount={}",
                maskEmail(email), regNumber, payment.getTotalAmount());

        return PaymentResponse.from(payment);
    }

    @Transactional
    public PaymentResponse completePayment(String email, CompletePaymentRequest request) {
        log.info("[PAYMENT] Completing payment — email={} regNo={} tid={}",
                maskEmail(email), request.registrationNumber(), request.tid());

        Payment payment = paymentRepository.findByRegistrationNumber(request.registrationNumber())
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_INPUT, "Payment not found."));

        // 멱등성 처리
        if (payment.getStatus() == PaymentStatus.COMPLETED) {
            log.info("[PAYMENT] Payment already completed — regNo={}", request.registrationNumber());
            return PaymentResponse.from(payment);
        }

        // 실결제 금액이 있을 때만 verify
        if (payment.getTotalAmount() > 0) {
            verifyPaygateTransaction(request.tid(), request.replycode(), email);
        } else {
            log.info("[PAYMENT] Bypassing PG verification — regNo={} totalAmount={}", request.registrationNumber(), payment.getTotalAmount());
        }

        payment.storeTid(request.tid());
        payment.complete();

        // 할인 코드 사용 완료 플래그 갱신
        if (payment.getAppliedDiscountCode() != null && !payment.getAppliedDiscountCode().isBlank()) {
            DiscountCode discount = discountCodeService.verifyDiscountCode(payment.getAppliedDiscountCode());
            discount.markAsUsed();
        }

        // 활성 옵션 정원 카운터 증가
        payment.getSelectedOptions().forEach(o -> {
            o.increaseCount();
        });

        paymentRepository.save(payment);

        // 컨펌 메일 발송
        try {
            User user = payment.getUser();
            emailService.sendPaymentConfirmation(
                    user.getEmail(), user.getFullName(), payment.getRegistrationNumber(),
                    payment.getTotalAmount(),
                    payment.getPaidAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
        } catch (Exception e) {
            log.error("[PAYMENT] Confirmation email failed — regNo={} error={}",
                    payment.getRegistrationNumber(), e.getMessage());
        }

        return PaymentResponse.from(payment);
    }

    @Transactional
    public void handlePaygateCallback(String tid, String mbSerialNo, String replycode) {
        log.info("[PAYMENT_CALLBACK] PayGate callback received — tid={} mbSerialNo={} replycode={}",
                tid, mbSerialNo, replycode);

        Payment payment = paymentRepository.findByRegistrationNumber(mbSerialNo)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_INPUT, "Payment not found for callback."));

        if (payment.getStatus() == PaymentStatus.COMPLETED) {
            log.info("[PAYMENT_CALLBACK] Payment already completed — mbSerialNo={}", mbSerialNo);
            return;
        }

        if ("0000".equals(replycode) || "NPS000".equals(replycode) || "NPS016".equals(replycode)) {
            // 실결제 금액이 있을 때만 verify
            if (payment.getTotalAmount() > 0) {
                verifyPaygateTransaction(tid, replycode, payment.getUser().getEmail());
            }

            payment.storeTid(tid);
            payment.complete();

            if (payment.getAppliedDiscountCode() != null && !payment.getAppliedDiscountCode().isBlank()) {
                DiscountCode discount = discountCodeService.verifyDiscountCode(payment.getAppliedDiscountCode());
                discount.markAsUsed();
            }

            payment.getSelectedOptions().forEach(o -> {
                o.increaseCount();
            });

            paymentRepository.save(payment);

            try {
                User user = payment.getUser();
                emailService.sendPaymentConfirmation(
                        user.getEmail(), user.getFullName(), payment.getRegistrationNumber(),
                        payment.getTotalAmount(),
                        payment.getPaidAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
            } catch (Exception e) {
                log.error("[PAYMENT_CALLBACK] Confirmation email failed — regNo={} error={}",
                        payment.getRegistrationNumber(), e.getMessage());
            }
        } else {
            log.warn("[PAYMENT_CALLBACK] Callback replycode was failure — replycode={}", replycode);
            payment.fail();
            paymentRepository.save(payment);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 내 결제 내역 조회
    // ─────────────────────────────────────────────────────────────────────────

    public List<PaymentResponse> getMyPayments(String email) {
        User user = userRepository.findByEmailAndActiveTrue(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        return paymentRepository.findByUserWithOptions(user)
                .stream().map(PaymentResponse::from).toList();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PayGate 결제 검증 (verifyReceived.jsp)
    // PayGate 문서: HTTP 200 응답 = 검증 성공
    // replycode 1차 검증 후 서버 HTTP 상태 코드로 최종 확인
    // ─────────────────────────────────────────────────────────────────────────

    private void verifyPaygateTransaction(String tid, String replycode, String email) {
        // 1단계: replycode 유효성 체크
        if (!"0000".equals(replycode) && !"NPS016".equals(replycode) && !"NPS000".equals(replycode)) {
            log.warn("[PAYMENT] PG replycode invalid — email={} replycode={}", maskEmail(email), replycode);
            throw new BusinessException(ErrorCode.PAYGATE_VERIFICATION_FAILED,
                    "Invalid payment replycode: " + replycode);
        }

        // 2단계: verifyReceived.jsp HTTP 200 확인 (PayGate 문서 기준)
        try {
            String verifyUrl = String.format(appProperties.getPaygate().getVerifyUrl(), tid);
            HttpURLConnection conn = (HttpURLConnection) new URL(verifyUrl).openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);

            int httpStatus = conn.getResponseCode();
            if (httpStatus != 200) {
                log.error("[PAYMENT] PG verify API non-200 — tid={} httpStatus={}", tid, httpStatus);
                throw new BusinessException(ErrorCode.PAYGATE_VERIFICATION_FAILED,
                        "PG verification API returned HTTP " + httpStatus);
            }

            log.info("[PAYMENT] PG verification passed — email={} tid={}", maskEmail(email), tid);

        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("[PAYMENT] PG verify API communication error — tid={} error={}", tid, e.getMessage());
            throw new BusinessException(ErrorCode.PAYGATE_VERIFICATION_FAILED,
                    "PG API Communication Error: " + e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 헬퍼 메서드
    // ─────────────────────────────────────────────────────────────────────────

    private String generateRegistrationNumber() {
        int seq = ThreadLocalRandom.current().nextInt(10_000_000, 99_999_999);
        String candidate = REG_NUMBER_PREFIX + seq;
        while (paymentRepository.findByRegistrationNumber(candidate).isPresent()) {
            seq = ThreadLocalRandom.current().nextInt(10_000_000, 99_999_999);
            candidate = REG_NUMBER_PREFIX + seq;
        }
        return candidate;
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@"))
            return "***";
        String[] parts = email.split("@", 2);
        String local = parts[0];
        if (local.length() <= 1)
            return local + "@" + parts[1];
        return local.charAt(0) + "*".repeat(local.length() - 1) + "@" + parts[1];
    }
}
