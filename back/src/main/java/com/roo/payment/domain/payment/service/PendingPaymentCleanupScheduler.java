package com.roo.payment.domain.payment.service;

import com.roo.payment.domain.payment.entity.Payment;
import com.roo.payment.domain.payment.entity.PaymentStatus;
import com.roo.payment.domain.payment.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * PENDING 상태로 방치된 결제를 자동으로 FAILED 처리하는 스케줄러.
 * AsyncConfig 또는 Application 클래스에 @EnableScheduling 가 필요합니다.
 *
 * 대상: 생성 후 24시간 이상 경과한 PENDING 결제
 */
@Component
public class PendingPaymentCleanupScheduler {

    private static final Logger log = LoggerFactory.getLogger(PendingPaymentCleanupScheduler.class);

    /** PENDING 결제가 이 시간(시간 단위)을 초과하면 FAILED로 처리 */
    private static final int EXPIRY_HOURS = 24;

    private final PaymentRepository paymentRepository;

    public PendingPaymentCleanupScheduler(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    /**
     * 매시간 정각 실행
     * cron: 0 0 * * * * = 매 시간 0분 0초
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void cleanupExpiredPendingPayments() {
        LocalDateTime expireBefore = LocalDateTime.now().minusHours(EXPIRY_HOURS);

        List<Payment> expired = paymentRepository.findByStatusAndCreatedAtBefore(
                PaymentStatus.PENDING, expireBefore);

        if (expired.isEmpty()) {
            log.debug("[CLEANUP] 만료된 PENDING 결제 없음");
            return;
        }

        expired.forEach(payment -> {
            payment.fail();
            log.warn("[CLEANUP] PENDING → FAILED 처리 — id={} regNo={} createdAt={}",
                    payment.getId(), payment.getRegistrationNumber(), payment.getCreatedAt());
        });

        log.info("[CLEANUP] PENDING 결제 정리 완료 — {}건 FAILED 처리", expired.size());
    }
}
