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
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    // 등록번호 prefix — IABSE 브랜딩 적용
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

    /**
     * 결제 생성 → 완료 처리
     */
    @Transactional
    public PaymentResponse createPayment(String email, PaymentRequest request) {
        log.info("[PAYMENT] 결제 시도 — email={} optionIds={} method={}",
                maskEmail(email), request.selectedOptionIds(), request.paymentMethod());

        User user = userRepository.findByEmailAndActiveTrue(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // ── 중복 결제 방지: 이미 COMPLETED 결제가 있으면 차단
        if (paymentRepository.existsByUserAndStatus(user, PaymentStatus.COMPLETED)) {
            log.warn("[PAYMENT] 중복 결제 시도 차단 — email={}", maskEmail(email));
            throw new BusinessException(ErrorCode.PAYMENT_ALREADY_EXISTS);
        }

        // ── PG 거래 검증 (tid가 있는 경우 — 실제 PayGate 결제)
        if (request.tid() != null && !request.tid().isBlank()) {
            verifyPaygateTransaction(request.tid(), request.replycode(), email);
        } else {
            // tid 없이 호출된 경우 — 내부/개발 모드 등
            log.warn("[PAYMENT] PG tid 없이 결제 요청됨 — email={} replycode={}",
                    maskEmail(email), request.replycode());
        }

        // ── 옵션 조회 및 검증
        List<String> uniqueIds = request.selectedOptionIds().stream().distinct().toList();
        List<ConferenceOption> options = optionRepository.findAllById(uniqueIds);
        if (options.size() != uniqueIds.size()) {
            throw new BusinessException(ErrorCode.OPTION_NOT_FOUND);
        }

        Map<String, Integer> quantities = request.quantities() != null ? request.quantities() : Map.of();

        // ── 정원 초과 검증
        for (ConferenceOption option : options) {
            int qty = quantities.getOrDefault(option.getId(), 1);
            if (option.getMaxCapacity() != null
                    && option.getCurrentCount() + qty > option.getMaxCapacity()) {
                log.warn("[PAYMENT] 정원 초과 — option={} current={} requested={}",
                        option.getNameEn(), option.getCurrentCount(), qty);
                throw new BusinessException(ErrorCode.OPTION_CAPACITY_EXCEEDED,
                        option.getNameEn() + " has exceeded the available capacity.");
            }
        }

        // ── 가격 계산
        long subtotal = options.stream()
                .mapToLong(o -> o.getPrice() * quantities.getOrDefault(o.getId(), 1))
                .sum();
        long tax = Math.round(subtotal * 0.1);

        // ── 등록번호 생성 및 결제 엔티티 생성
        String regNumber = generateRegistrationNumber();

        Payment payment = new Payment(
                regNumber,
                user,
                user.getMemberType(),
                request.paymentMethod(),
                subtotal,
                tax,
                options);

        // ── 정원 차감 (수량 반영)
        options.forEach(o -> {
            int qty = quantities.getOrDefault(o.getId(), 1);
            for (int i = 0; i < qty; i++)
                o.increaseCount();
        });

        payment.complete();
        paymentRepository.save(payment);

        log.info("[PAYMENT] 결제 완료 — email={} regNo={} amount={}",
                maskEmail(email), regNumber, payment.getTotalAmount());

        // ── 결제 완료 이메일 발송 (비동기)
        try {
            emailService.sendPaymentConfirmation(
                    user.getEmail(),
                    user.getNameKr(),
                    regNumber,
                    payment.getTotalAmount(),
                    payment.getPaidAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
        } catch (Exception e) {
            // 이메일 발송 실패는 결제 트랜잭션에 영향 없음 — 로그만 남김
            log.error("[PAYMENT] 결제 완료 이메일 발송 실패 — email={} regNo={} error={}",
                    maskEmail(email), regNumber, e.getMessage());
        }

        return PaymentResponse.from(payment);
    }

    /**
     * PayGate 거래 검증 — HTTP 200 + Body 내용 파싱
     */
    private void verifyPaygateTransaction(String tid, String replycode, String email) {
        // 1단계: replycode 유효성 체크
        if (!"0000".equals(replycode) && !"NPS016".equals(replycode) && !"NPS000".equals(replycode)) {
            log.warn("[PAYMENT] PG replycode 검증 실패 — email={} replycode={}", maskEmail(email), replycode);
            throw new BusinessException(ErrorCode.PAYGATE_VERIFICATION_FAILED,
                    "Invalid payment replycode: " + replycode);
        }

        // 2단계: verifyReceived.jsp 호출 및 본문 파싱
        try {
            String verifyUrl = String.format(appProperties.getPaygate().getVerifyUrl(), tid);
            HttpURLConnection conn = (HttpURLConnection) new URL(verifyUrl).openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);

            int httpStatus = conn.getResponseCode();
            if (httpStatus != 200) {
                log.error("[PAYMENT] PG 검증 API HTTP 오류 — tid={} httpStatus={}", tid, httpStatus);
                throw new BusinessException(ErrorCode.PAYGATE_VERIFICATION_FAILED,
                        "PG API returned HTTP " + httpStatus);
            }

            // 응답 본문 읽기
            String body;
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                body = reader.lines().collect(Collectors.joining("\n"));
            }

            log.debug("[PAYMENT] PG 검증 응답 본문 — tid={} body={}", tid, body);

            // PayGate 검증 API는 "verifiedResult=true" 또는 유사 형태로 응답
            // 본문이 비어있거나 실패 마커가 포함된 경우 차단
            if (body == null || body.isBlank()) {
                log.error("[PAYMENT] PG 검증 응답 본문 없음 — tid={}", tid);
                throw new BusinessException(ErrorCode.PAYGATE_BODY_INVALID,
                        "PG API returned empty verification body for tid=" + tid);
            }

            // 명시적 실패 응답 체크 (PayGate 응답 형식에 따라 조정 가능)
            String bodyLower = body.toLowerCase();
            if (bodyLower.contains("false") || bodyLower.contains("fail") || bodyLower.contains("error")) {
                log.error("[PAYMENT] PG 본문 검증 실패 — tid={} body={}", tid, body);
                throw new BusinessException(ErrorCode.PAYGATE_BODY_INVALID,
                        "PG verification body indicates failure for tid=" + tid);
            }

            log.info("[PAYMENT] PG 검증 성공 — email={} tid={}", maskEmail(email), tid);

        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("[PAYMENT] PG API 통신 오류 — tid={} error={}", tid, e.getMessage());
            throw new BusinessException(ErrorCode.PAYGATE_VERIFICATION_FAILED,
                    "PG API Communication Error: " + e.getMessage());
        }
    }

    /**
     * 내 결제 내역 조회
     */
    public List<PaymentResponse> getMyPayments(String email) {
        User user = userRepository.findByEmailAndActiveTrue(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        return paymentRepository.findByUserWithOptions(user)
                .stream()
                .map(PaymentResponse::from)
                .toList();
    }

    /**
     * 결제 취소
     */
    @Transactional
    public Map<String, Object> cancelPayment(String email, CancelRequest request) {
        log.info("[PAYMENT] 취소 요청 — email={} regNo={}", maskEmail(email), request.registrationNumber());

        User user = userRepository.findByEmailAndActiveTrue(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        Payment payment = paymentRepository
                .findByRegistrationNumber(request.registrationNumber())
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_REGISTRATION_NUMBER));

        // 본인 확인
        if (!payment.getUser().getId().equals(user.getId())) {
            log.warn("[PAYMENT] 타인 결제 취소 시도 — requestEmail={} paymentOwner={}",
                    maskEmail(email), maskEmail(payment.getUser().getEmail()));
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        if (payment.getStatus() == PaymentStatus.CANCELLED) {
            throw new BusinessException(ErrorCode.PAYMENT_ALREADY_CANCELLED);
        }
        if (payment.getStatus() != PaymentStatus.COMPLETED) {
            throw new BusinessException(ErrorCode.PAYMENT_CANCEL_NOT_ALLOWED);
        }

        // ── 정원 복구 (수량 반영) — 구매 수량만큼 정확히 차감
        payment.getSelectedOptions().forEach(ConferenceOption::decreaseCount);

        payment.cancel(request.reason());

        log.info("[PAYMENT] 취소 완료 — email={} regNo={} amount={}",
                maskEmail(email), request.registrationNumber(), payment.getTotalAmount());

        // 취소 확인 이메일
        try {
            emailService.sendCancellationConfirmation(
                    user.getEmail(),
                    user.getNameKr(),
                    request.registrationNumber(),
                    payment.getTotalAmount());
        } catch (Exception e) {
            log.error("[PAYMENT] 취소 이메일 발송 실패 — email={} regNo={} error={}",
                    maskEmail(email), request.registrationNumber(), e.getMessage());
        }

        return Map.of(
                "success", true,
                "refundAmount", payment.getTotalAmount(),
                "message", "취소 요청이 정상적으로 접수되었습니다. 환불은 3~5 영업일 이내 처리됩니다.");
    }

    private String generateRegistrationNumber() {
        int seq = ThreadLocalRandom.current().nextInt(10_000, 99_999);
        String candidate = REG_NUMBER_PREFIX + seq;
        while (paymentRepository.findByRegistrationNumber(candidate).isPresent()) {
            seq = ThreadLocalRandom.current().nextInt(10_000, 99_999);
            candidate = REG_NUMBER_PREFIX + seq;
        }
        return candidate;
    }

    /** 이메일 마스킹 — 로그 보안 */
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
