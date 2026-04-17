package com.roo.payment.domain.payment.service;

import com.roo.payment.common.exception.BusinessException;
import com.roo.payment.common.exception.ErrorCode;
import com.roo.payment.config.AppProperties;
import com.roo.payment.domain.option.entity.ConferenceOption;
import com.roo.payment.domain.option.repository.ConferenceOptionRepository;
import com.roo.payment.domain.payment.dto.CancelRequest;
import com.roo.payment.domain.payment.dto.PaymentRequest;
import com.roo.payment.domain.payment.dto.PaymentResponse;
import com.roo.payment.domain.payment.entity.Payment;
import com.roo.payment.domain.payment.entity.PaymentStatus;
import com.roo.payment.domain.payment.repository.PaymentRepository;
import com.roo.payment.domain.user.entity.User;
import com.roo.payment.domain.user.repository.UserRepository;
import com.roo.payment.domain.user.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    /** 등록번호 prefix — IABSE 브랜딩 */
    private static final String REG_NUMBER_PREFIX = "IABSE-2026-";

    private final PaymentRepository paymentRepository;
    private final ConferenceOptionRepository optionRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final AppProperties appProperties;

    public PaymentService(PaymentRepository paymentRepository,
            ConferenceOptionRepository optionRepository,
            UserRepository userRepository,
            EmailService emailService,
            AppProperties appProperties) {
        this.paymentRepository = paymentRepository;
        this.optionRepository = optionRepository;
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

        Map<String, Integer> quantities = request.quantities() != null ? request.quantities() : Map.of();

        // 정원 초과 검증
        for (ConferenceOption option : options) {
            int qty = quantities.getOrDefault(option.getId(), 1);
            if (option.getMaxCapacity() != null
                    && option.getCurrentCount() + qty > option.getMaxCapacity()) {
                log.warn("[PAYMENT] Capacity exceeded — option={} current={} requested={}",
                        option.getNameEn(), option.getCurrentCount(), qty);
                throw new BusinessException(ErrorCode.OPTION_CAPACITY_EXCEEDED,
                        option.getNameEn() + " has exceeded the available capacity.");
            }
        }

        // 가격 계산
        long subtotal = options.stream()
                .mapToLong(o -> o.getPrice() * quantities.getOrDefault(o.getId(), 1))
                .sum();
        long tax = Math.round(subtotal * 0.1);

        String regNumber = generateRegistrationNumber();

        Payment payment = new Payment(
                regNumber, user, user.getMemberType(),
                request.paymentMethod(), subtotal, tax, options);

        options.forEach(o -> {
            int qty = quantities.getOrDefault(o.getId(), 1);
            for (int i = 0; i < qty; i++)
                o.increaseCount();
        });

        payment.complete();
        paymentRepository.save(payment);

        log.info("[PAYMENT] Payment completed — email={} regNo={} amount={}",
                maskEmail(email), regNumber, payment.getTotalAmount());

        try {
            emailService.sendPaymentConfirmation(
                    user.getEmail(), user.getNameKr(), regNumber,
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
    // 결제 취소 — 부분 환불 정책 + PayGate Cancel API 연동
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> cancelPayment(String email, CancelRequest request) {
        log.info("[PAYMENT] Cancel requested — email={} regNo={}",
                maskEmail(email), request.registrationNumber());

        User user = userRepository.findByEmailAndActiveTrue(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        Payment payment = paymentRepository
                .findByRegistrationNumber(request.registrationNumber())
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_REGISTRATION_NUMBER));

        // 본인 확인
        if (!payment.getUser().getId().equals(user.getId())) {
            log.warn("[PAYMENT] Unauthorized cancel attempt — requestEmail={} paymentOwner={}",
                    maskEmail(email), maskEmail(payment.getUser().getEmail()));
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        if (payment.getStatus() == PaymentStatus.CANCELLED) {
            throw new BusinessException(ErrorCode.PAYMENT_ALREADY_CANCELLED);
        }
        if (payment.getStatus() != PaymentStatus.COMPLETED) {
            throw new BusinessException(ErrorCode.PAYMENT_CANCEL_NOT_ALLOWED);
        }

        // 부분 환불 금액 계산
        long refundAmount = calculateRefundAmount(payment.getTotalAmount());
        boolean isPartial = refundAmount < payment.getTotalAmount();

        log.info("[PAYMENT] Refund policy applied — total={} refund={} partial={}",
                payment.getTotalAmount(), refundAmount, isPartial);

        // PayGate Cancel API 호출 (tid가 있는 경우)
        String tid = payment.getTid();
        if (tid != null && !tid.isBlank()) {
            callPaygateCancelApi(tid, refundAmount, isPartial);
        } else {
            log.warn("[PAYMENT] No tid stored — skipping PayGate cancel API call. regNo={}",
                    request.registrationNumber());
        }

        // 정원 복구 및 상태 변경
        payment.getSelectedOptions().forEach(ConferenceOption::decreaseCount);
        payment.cancel(request.reason());

        log.info("[PAYMENT] Cancellation completed — email={} regNo={} refund={}",
                maskEmail(email), request.registrationNumber(), refundAmount);

        try {
            emailService.sendCancellationConfirmation(
                    user.getEmail(), user.getNameKr(),
                    request.registrationNumber(), refundAmount);
        } catch (Exception e) {
            log.error("[PAYMENT] Cancellation email failed — email={} error={}",
                    maskEmail(email), e.getMessage());
        }

        String policyMessage = isPartial
                ? "Cancellation request accepted. A 50% refund (" + refundAmount
                        + " KRW) will be processed within 3–5 business days."
                : "Cancellation request accepted. Full refund will be processed within 3–5 business days.";

        return Map.of(
                "success", true,
                "refundAmount", refundAmount,
                "message", policyMessage);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 부분 환불 금액 계산
    // 행사 30일 초과 전: 100% 환불
    // 행사 8~30일 전: 50% 환불
    // 행사 7일 이내: 0원 환불 (No Refund)
    // ─────────────────────────────────────────────────────────────────────────

    long calculateRefundAmount(long totalAmount) {
        LocalDate today = LocalDate.now();
        LocalDate eventDate;
        try {
            eventDate = LocalDate.parse(appProperties.getPaygate().getEventDate());
        } catch (Exception e) {
            log.error("[PAYMENT] Invalid eventDate config — defaulting to full refund. error={}", e.getMessage());
            return totalAmount;
        }

        long daysUntilEvent = today.until(eventDate).getDays();

        if (daysUntilEvent > 30) {
            log.info("[PAYMENT] Refund: FULL ({}+ days before event)", daysUntilEvent);
            return totalAmount;
        } else if (daysUntilEvent >= 8) {
            long halfRefund = Math.round(totalAmount * 0.5);
            log.info("[PAYMENT] Refund: 50% ({} days before event) → {} KRW", daysUntilEvent, halfRefund);
            return halfRefund;
        } else {
            log.info("[PAYMENT] Refund: NONE ({} days before event or past event)", daysUntilEvent);
            return 0L;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PayGate Cancel API 호출
    // amount = "F" → 전액 환불
    // amount = 숫자 → 부분 환불 금액 (KRW)
    // ─────────────────────────────────────────────────────────────────────────

    private void callPaygateCancelApi(String tid, long refundAmount, boolean isPartial) {
        // mid 환경변수에서 읽기 (애플리케이션 yaml 미설정 시 null)
        String mid = System.getenv("VITE_PAYGATE_MID_DOMESTIC") != null
                ? System.getenv("VITE_PAYGATE_MID_DOMESTIC")
                : System.getenv("PAYGATE_MID_DOMESTIC");

        if (mid == null || mid.isBlank()) {
            log.warn(
                    "[PAYMENT] PAYGATE_MID_DOMESTIC env not set — skipping cancel API call (manual refund required). tid={}",
                    tid);
            return;
        }

        String amountParam = isPartial ? String.valueOf(refundAmount) : "F";

        try {
            String urlStr = String.format("%s?callback=callback&mid=%s&tid=%s&amount=%s",
                    appProperties.getPaygate().getCancelUrl(),
                    URLEncoder.encode(mid, StandardCharsets.UTF_8),
                    URLEncoder.encode(tid, StandardCharsets.UTF_8),
                    URLEncoder.encode(amountParam, StandardCharsets.UTF_8));

            HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            int httpStatus = conn.getResponseCode();
            String body;
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                body = reader.lines().collect(Collectors.joining("\n"));
            }

            log.info("[PAYMENT] PayGate Cancel API response — tid={} httpStatus={} body={}", tid, httpStatus, body);

            // PayGate Cancel API: replycode=0000 → 성공
            if (!body.contains("\"replycode\":\"0000\"") && !body.contains("replycode=0000")) {
                log.error("[PAYMENT] PayGate Cancel API returned failure — tid={} body={}", tid, body);
                throw new BusinessException(ErrorCode.PAYGATE_VERIFICATION_FAILED,
                        "PayGate cancel API returned failure for tid=" + tid);
            }

        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("[PAYMENT] PayGate Cancel API communication error — tid={} error={}", tid, e.getMessage());
            throw new BusinessException(ErrorCode.PAYGATE_VERIFICATION_FAILED,
                    "PayGate cancel API communication error: " + e.getMessage());
        }
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
