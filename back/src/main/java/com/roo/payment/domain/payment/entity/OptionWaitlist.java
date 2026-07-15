package com.roo.payment.domain.payment.entity;

import com.roo.payment.common.entity.BaseEntity;
import com.roo.payment.domain.option.entity.ConferenceOption;
import com.roo.payment.domain.user.entity.User;
import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * 매진된 프로그램 옵션에 대한 대기자 명단 엔티티.
 *
 * 라이프사이클:
 *   WAITING ──[관리자 오퍼]──► OFFERED ──[추가 결제 완료]──► COMPLETED
 *                                │
 *                                ├─[마감 경과]──► EXPIRED
 *                                └─[관리자 회수]─► WAITING (다시 대기열로)
 */
@Entity
@Table(name = "option_waitlists")
public class OptionWaitlist extends BaseEntity {

    public enum WaitlistStatus {
        WAITING, OFFERED, COMPLETED, EXPIRED, CANCELLED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 대기/오퍼 대상 유저. 항상 존재한다 (일반 대기건은 결제의 유저, 직접 오퍼는 지정 유저). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * 이 대기건이 유래한 등록 결제.
     * 일반 대기 신청(intake)은 해당 결제를 참조하지만,
     * 관리자 직접 오퍼(등록 결제 이력이 없는 유저)는 null 이 될 수 있다.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id")
    private Payment payment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "option_id", nullable = false)
    private ConferenceOption option;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WaitlistStatus status = WaitlistStatus.WAITING;

    /** 관리자가 오퍼를 보낸 시각 */
    @Column(name = "offered_at")
    private LocalDateTime offeredAt;

    /** 오퍼 결제 마감 시각 (이후 지연 만료 처리) */
    @Column(name = "offer_expires_at")
    private LocalDateTime offerExpiresAt;

    /** 오퍼를 충족한 WAITLIST 결제의 ID (전환 완료 시 기록) */
    @Column(name = "fulfilled_payment_id")
    private Long fulfilledPaymentId;

    /** 오퍼된 수량 (관리자 지정, 기본 1). 초과 오퍼 시 예약 좌석 수 및 결제 금액에 반영 */
    @Column(name = "offered_quantity", nullable = false)
    private int offeredQuantity = 1;

    protected OptionWaitlist() {
    }

    /** 일반 대기 신청(intake) — 결제와 그 결제의 유저에 연결. */
    public OptionWaitlist(Payment payment, ConferenceOption option) {
        this.payment = payment;
        this.user = payment.getUser();
        this.option = option;
        this.status = WaitlistStatus.WAITING;
    }

    /** 관리자 직접 오퍼 — 결제 이력 없이 유저에게 바로 연결 (payment=null). */
    public OptionWaitlist(User user, ConferenceOption option) {
        this.user = user;
        this.payment = null;
        this.option = option;
        this.status = WaitlistStatus.WAITING;
    }

    // ── 상태 전이 ──────────────────────────────────────────────────────────

    /** 관리자 오퍼 — WAITING/EXPIRED 상태에서 OFFERED로 전환하고 수량·마감 시각을 설정한다. */
    public void offer(LocalDateTime expiresAt, int quantity) {
        this.status = WaitlistStatus.OFFERED;
        this.offeredAt = LocalDateTime.now();
        this.offerExpiresAt = expiresAt;
        this.offeredQuantity = Math.max(1, quantity);
        this.fulfilledPaymentId = null;
    }

    /** 추가 결제 완료 — OFFERED에서 COMPLETED로 전환하고 충족 결제 ID를 기록한다. */
    public void fulfill(Long paymentId) {
        this.status = WaitlistStatus.COMPLETED;
        this.fulfilledPaymentId = paymentId;
    }

    /** 오퍼 마감 만료 — 좌석 예약 회수. */
    public void expire() {
        this.status = WaitlistStatus.EXPIRED;
    }

    /** 관리자 오퍼 회수 — 다시 대기열로 되돌린다. */
    public void revokeToWaiting() {
        this.status = WaitlistStatus.WAITING;
        this.offeredAt = null;
        this.offerExpiresAt = null;
        this.fulfilledPaymentId = null;
    }

    public void cancel() {
        this.status = WaitlistStatus.CANCELLED;
    }

    /** 결제 삭제 등으로 충족을 되돌릴 때 — 다시 대기열로. */
    public void revertFulfillment() {
        this.status = WaitlistStatus.WAITING;
        this.offeredAt = null;
        this.offerExpiresAt = null;
        this.fulfilledPaymentId = null;
    }

    // ── 조회 ───────────────────────────────────────────────────────────────

    /** 오퍼 마감이 지났는지 여부. */
    public boolean isOfferExpired() {
        return offerExpiresAt != null && LocalDateTime.now().isAfter(offerExpiresAt);
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public Payment getPayment() {
        return payment;
    }

    public ConferenceOption getOption() {
        return option;
    }

    public WaitlistStatus getStatus() {
        return status;
    }

    public LocalDateTime getOfferedAt() {
        return offeredAt;
    }

    public LocalDateTime getOfferExpiresAt() {
        return offerExpiresAt;
    }

    public Long getFulfilledPaymentId() {
        return fulfilledPaymentId;
    }

    public int getOfferedQuantity() {
        return offeredQuantity;
    }
}
