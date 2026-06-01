package com.roo.payment.domain.payment.entity;

import com.roo.payment.common.entity.BaseEntity;
import com.roo.payment.domain.option.entity.ConferenceOption;
import jakarta.persistence.*;

/**
 * 매진된 프로그램 옵션에 대한 대기자 명단 엔티티.
 */
@Entity
@Table(name = "option_waitlists")
public class OptionWaitlist extends BaseEntity {

    public enum WaitlistStatus {
        WAITING, COMPLETED, CANCELLED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id", nullable = false)
    private Payment payment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "option_id", nullable = false)
    private ConferenceOption option;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WaitlistStatus status = WaitlistStatus.WAITING;

    protected OptionWaitlist() {
    }

    public OptionWaitlist(Payment payment, ConferenceOption option) {
        this.payment = payment;
        this.option = option;
        this.status = WaitlistStatus.WAITING;
    }

    public Long getId() {
        return id;
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

    public void approve() {
        this.status = WaitlistStatus.COMPLETED;
    }

    public void cancel() {
        this.status = WaitlistStatus.CANCELLED;
    }
}
