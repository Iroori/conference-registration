package com.roo.payment.domain.payment.service;

import com.roo.payment.domain.payment.entity.Payment;
import com.roo.payment.domain.payment.entity.PaymentStatus;
import com.roo.payment.domain.payment.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * PENDING 상태로 방치된 결제를 자동으로 FAILED 처리하는 스케줄러.
 * prod 프로파일에서만 활성화 — dev에서는 비활성 (테스트 데이터 보호).
 *
 * 대상: 생성 후 24시간 이상 경과한 PENDING 결제
 */
@Component
@Profile("prod")
public class PendingPaymentCleanupScheduler {

    private static final Logger log = LoggerFactory.getLogger(PendingPaymentCleanupScheduler.class);

    private static final int EXPIRY_HOURS = 24;

    private final PaymentRepository paymentRepository;

    public PendingPaymentCleanupScheduler(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    /** 매시간 정각 실행 — cron: 0 0 * * * * */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void cleanupExpiredPendingPayments() {
        LocalDateTime expireBefore = LocalDateTime.now().minusHours(EXPIRY_HOURS);

        List<Payment> expired = paymentRepository.findByStatusAndCreatedAtBefore(
                PaymentStatus.PENDING, expireBefore);

        if (expired.isEmpty()) {
            log.debug("[CLEANUP] No expired PENDING payments found");
            return;
        }

        expired.forEach(payment -> {
            payment.fail();
            log.warn("[CLEANUP] PENDING → FAILED — id={} regNo={} createdAt={}",
                    payment.getId(), payment.getRegistrationNumber(), payment.getCreatedAt());
        });

        log.info("[CLEANUP] Cleanup completed — {} payment(s) marked as FAILED", expired.size());
    }
}
