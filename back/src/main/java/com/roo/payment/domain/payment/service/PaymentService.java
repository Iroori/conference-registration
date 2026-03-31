package com.roo.payment.domain.payment.service;

import com.roo.payment.common.exception.BusinessException;
import com.roo.payment.common.exception.ErrorCode;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@Service
@Transactional(readOnly = true)
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final ConferenceOptionRepository optionRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    public PaymentService(PaymentRepository paymentRepository,
                          ConferenceOptionRepository optionRepository,
                          UserRepository userRepository,
                          EmailService emailService) {
        this.paymentRepository = paymentRepository;
        this.optionRepository = optionRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    /**
     * 결제 생성 → 완료 처리
     * 실제 PG사 연동 전 단계: 결제 생성 후 즉시 COMPLETED 처리
     */
    @Transactional
    public PaymentResponse createPayment(String email, PaymentRequest request) {
        User user = userRepository.findByEmailAndActiveTrue(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 선택한 옵션 조회 및 검증
        List<ConferenceOption> options = optionRepository.findAllById(request.selectedOptionIds());
        if (options.size() != request.selectedOptionIds().size()) {
            throw new BusinessException(ErrorCode.OPTION_NOT_FOUND);
        }

        // 정원 초과 검증
        for (ConferenceOption option : options) {
            if (!option.hasCapacity()) {
                throw new BusinessException(ErrorCode.OPTION_CAPACITY_EXCEEDED,
                        option.getNameKr() + "의 정원이 초과되었습니다.");
            }
        }

        // 가격 계산
        long subtotal = options.stream().mapToLong(ConferenceOption::getPrice).sum();
        long tax = Math.round(subtotal * 0.1);

        // 등록번호 생성
        String regNumber = generateRegistrationNumber();

        Payment payment = new Payment(
                regNumber,
                user,
                user.getMemberType(),
                request.paymentMethod(),
                subtotal,
                tax,
                options
        );

        // 정원 차감
        options.forEach(ConferenceOption::increaseCount);

        // 결제 완료 처리 (PG 연동 후 콜백으로 변경 예정)
        payment.complete();
        paymentRepository.save(payment);

        // 결제 완료 이메일 발송 (비동기)
        emailService.sendPaymentConfirmation(
                user.getEmail(),
                user.getNameKr(),
                regNumber,
                payment.getTotalAmount(),
                payment.getPaidAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
        );

        return PaymentResponse.from(payment);
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
        User user = userRepository.findByEmailAndActiveTrue(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        Payment payment = paymentRepository
                .findByRegistrationNumber(request.registrationNumber())
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_REGISTRATION_NUMBER));

        // 본인 확인
        if (!payment.getUser().getId().equals(user.getId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        if (payment.getStatus() == PaymentStatus.CANCELLED) {
            throw new BusinessException(ErrorCode.PAYMENT_ALREADY_CANCELLED);
        }
        if (payment.getStatus() != PaymentStatus.COMPLETED) {
            throw new BusinessException(ErrorCode.PAYMENT_CANCEL_NOT_ALLOWED);
        }

        // 정원 복구
        payment.getSelectedOptions().forEach(ConferenceOption::decreaseCount);

        payment.cancel(request.reason());

        // 취소 확인 이메일
        emailService.sendCancellationConfirmation(
                user.getEmail(),
                user.getNameKr(),
                request.registrationNumber(),
                payment.getTotalAmount()
        );

        return Map.of(
                "success", true,
                "refundAmount", payment.getTotalAmount(),
                "message", "취소 요청이 정상적으로 접수되었습니다. 환불은 3~5 영업일 이내 처리됩니다."
        );
    }

    private String generateRegistrationNumber() {
        int seq = ThreadLocalRandom.current().nextInt(10_000, 99_999);
        String candidate = "KSSC-2026-" + seq;
        // 중복 시 재생성 (확률 매우 낮음)
        while (paymentRepository.findByRegistrationNumber(candidate).isPresent()) {
            seq = ThreadLocalRandom.current().nextInt(10_000, 99_999);
            candidate = "KSSC-2026-" + seq;
        }
        return candidate;
    }
}
