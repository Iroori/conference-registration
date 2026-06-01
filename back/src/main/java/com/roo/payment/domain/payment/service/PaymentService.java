package com.roo.payment.domain.payment.service;

import com.roo.payment.common.exception.BusinessException;
import com.roo.payment.common.exception.ErrorCode;
import com.roo.payment.config.AppProperties;
import com.roo.payment.domain.option.entity.ConferenceOption;
import com.roo.payment.domain.option.repository.ConferenceOptionRepository;
import com.roo.payment.domain.payment.dto.PaymentRequest;
import com.roo.payment.domain.payment.dto.PaymentResponse;
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

    public PaymentService(PaymentRepository paymentRepository,
            ConferenceOptionRepository optionRepository,
            OptionWaitlistRepository optionWaitlistRepository,
            UserRepository userRepository,
            EmailService emailService,
            AppProperties appProperties) {
        this.paymentRepository = paymentRepository;
        this.optionRepository = optionRepository;
        this.optionWaitlistRepository = optionWaitlistRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.appProperties = appProperties;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 결제 생성
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public PaymentResponse createPayment(String email, PaymentRequest request) {
        log.info("[PAYMENT] Attempting payment — email={} options={} method={}",
                maskEmail(email), request.selectedOptionIds(), request.paymentMethod());

        User user = userRepository.findByEmailAndActiveTrue(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 중복 결제 방지: COMPLETED 결제가 이미 있으면 차단
        if (paymentRepository.existsByUserAndStatus(user, PaymentStatus.COMPLETED)) {
            log.warn("[PAYMENT] Duplicate payment blocked — email={}", maskEmail(email));
            throw new BusinessException(ErrorCode.PAYMENT_ALREADY_EXISTS);
        }

        // PayGate 거래 검증 (tid가 있는 경우)
        if (request.tid() != null && !request.tid().isBlank()) {
            verifyPaygateTransaction(request.tid(), request.replycode(), email);
        } else {
            log.warn("[PAYMENT] No PG tid in request — email={} replycode={}",
                    maskEmail(email), request.replycode());
        }

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
        userRepository.save(user);

        String regNumber = generateRegistrationNumber();

        Payment payment = new Payment(
                regNumber, user, user.getMemberType(),
                request.paymentMethod(), subtotal, tax, options);

        activeOptions.forEach(o -> {
            int qty = quantities.getOrDefault(o.getId(), 1);
            for (int i = 0; i < qty; i++)
                o.increaseCount();
        });

        // PayGate TID 저장 — 거래 식별/조회용
        if (request.tid() != null && !request.tid().isBlank()) {
            payment.storeTid(request.tid());
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

        payment.complete();
        paymentRepository.save(payment);

        log.info("[PAYMENT] Payment completed — email={} regNo={} amount={}",
                maskEmail(email), regNumber, payment.getTotalAmount());

        try {
            emailService.sendPaymentConfirmation(
                    user.getEmail(), user.getFullName(), regNumber,
                    payment.getTotalAmount(),
                    payment.getPaidAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
        } catch (Exception e) {
            log.error("[PAYMENT] Confirmation email failed — email={} regNo={} error={}",
                    maskEmail(email), regNumber, e.getMessage());
        }

        return PaymentResponse.from(payment);
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
        int seq = ThreadLocalRandom.current().nextInt(10_000, 99_999);
        String candidate = REG_NUMBER_PREFIX + seq;
        while (paymentRepository.findByRegistrationNumber(candidate).isPresent()) {
            seq = ThreadLocalRandom.current().nextInt(10_000, 99_999);
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
