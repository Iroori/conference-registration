package com.roo.payment.domain.payment.entity;

import com.roo.payment.common.entity.BaseEntity;
import com.roo.payment.domain.option.entity.ConferenceOption;
import com.roo.payment.domain.user.entity.MemberType;
import com.roo.payment.domain.user.entity.User;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "payments", indexes = {
        @Index(name = "idx_payment_reg_no", columnList = "registrationNumber", unique = true),
        @Index(name = "idx_payment_user", columnList = "user_id")
})
public class Payment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String registrationNumber; // KSSC-2026-XXXXX

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MemberType memberType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentMethod paymentMethod;

    /** 결제 유형 — 기본 PRIMARY, 대기자 오퍼 추가 결제는 WAITLIST */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentType paymentType = PaymentType.PRIMARY;

    /** WAITLIST 결제일 때, 충족하는 대기자(offer) ID */
    @Column(name = "waitlist_id")
    private Long waitlistId;

    /** WAITLIST 결제일 때, 원 등록 결제의 등록번호 (표시용) */
    @Column(name = "origin_registration_number", length = 30)
    private String originRegistrationNumber;

    @Column(nullable = false)
    private long subtotal;

    @Column(nullable = false)
    private long tax;

    @Column(nullable = false)
    private long totalAmount;

    private LocalDateTime paidAt;
    private LocalDateTime cancelledAt;

    @Column(length = 500)
    private String cancelReason;

    /** PayGate 거래 ID (TID) — 취소/환불 API 호출에 사용 */
    @Column(length = 100)
    private String tid;

    @Column(name = "applied_discount_code", length = 30)
    private String appliedDiscountCode;

    @Column(name = "discount_total_amount")
    private Long discountTotalAmount = 0L;

    @Column(name = "discount_reg_amount")
    private Long discountRegAmount = 0L;

    @Column(name = "discount_gala_amount")
    private Long discountGalaAmount = 0L;

    @Column(name = "discount_accomp_amount")
    private Long discountAccompAmount = 0L;

    @Column(name = "discount_tour_amount")
    private Long discountTourAmount = 0L;

    @ManyToMany
    @JoinTable(name = "payment_options", joinColumns = @JoinColumn(name = "payment_id"), inverseJoinColumns = @JoinColumn(name = "option_id"))
    private List<ConferenceOption> selectedOptions = new ArrayList<>();

    @OneToMany(mappedBy = "payment", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AccompanyingPerson> accompanyingPersons = new ArrayList<>();

    @OneToMany(mappedBy = "payment", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ExhibitorBadge> exhibitorBadges = new ArrayList<>();

    protected Payment() {
    }

    public Payment(String registrationNumber, User user, MemberType memberType,
            PaymentMethod paymentMethod, long subtotal, long tax,
            List<ConferenceOption> selectedOptions) {
        this.registrationNumber = registrationNumber;
        this.user = user;
        this.memberType = memberType;
        this.paymentMethod = paymentMethod;
        this.subtotal = subtotal;
        this.tax = tax;
        this.totalAmount = subtotal + tax;
        this.status = PaymentStatus.PENDING;
        this.selectedOptions = selectedOptions != null ? new ArrayList<>(selectedOptions) : new ArrayList<>();
    }

    public void complete() {
        this.status = PaymentStatus.COMPLETED;
        this.paidAt = LocalDateTime.now();
    }

    /** PayGate TID 저장 — 결제 완료 시 호출 */
    public void storeTid(String tid) {
        this.tid = tid;
    }

    public void applyDiscount(String code, long totalDiscount, long regDiscount, long galaDiscount, long accompDiscount, long tourDiscount) {
        this.appliedDiscountCode = code;
        this.discountTotalAmount = totalDiscount;
        this.discountRegAmount = regDiscount;
        this.discountGalaAmount = galaDiscount;
        this.discountAccompAmount = accompDiscount;
        this.discountTourAmount = tourDiscount;
        this.totalAmount = this.subtotal + this.tax - totalDiscount;
    }

    public void cancel(String reason) {
        this.status = PaymentStatus.CANCELLED;
        this.cancelledAt = LocalDateTime.now();
        this.cancelReason = reason;
    }

    public void fail() {
        this.status = PaymentStatus.FAILED;
    }

    /** 이 결제를 대기자 오퍼 추가 결제(WAITLIST)로 표시한다. */
    public void markAsWaitlist(Long waitlistId, String originRegistrationNumber) {
        this.paymentType = PaymentType.WAITLIST;
        this.waitlistId = waitlistId;
        this.originRegistrationNumber = originRegistrationNumber;
    }

    public void addAccompanyingPerson(String lastName, String firstName) {
        this.accompanyingPersons.add(new AccompanyingPerson(this, lastName, firstName));
    }

    public void addExhibitorBadge(String lastName, String firstName) {
        this.exhibitorBadges.add(new ExhibitorBadge(this, lastName, firstName));
    }

    public Long getId() {
        return id;
    }

    public String getRegistrationNumber() {
        return registrationNumber;
    }

    public User getUser() {
        return user;
    }

    public MemberType getMemberType() {
        return memberType;
    }

    public PaymentStatus getStatus() {
        return status;
    }

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public long getSubtotal() {
        return subtotal;
    }

    public long getTax() {
        return tax;
    }

    public long getTotalAmount() {
        return totalAmount;
    }

    public String getTid() {
        return tid;
    }

    public LocalDateTime getPaidAt() {
        return paidAt;
    }

    public LocalDateTime getCancelledAt() {
        return cancelledAt;
    }

    public String getCancelReason() {
        return cancelReason;
    }

    public List<ConferenceOption> getSelectedOptions() {
        return selectedOptions;
    }

    public List<AccompanyingPerson> getAccompanyingPersons() {
        return accompanyingPersons;
    }

    public List<ExhibitorBadge> getExhibitorBadges() {
        return exhibitorBadges;
    }

    public PaymentType getPaymentType() { return paymentType; }
    public Long getWaitlistId() { return waitlistId; }
    public String getOriginRegistrationNumber() { return originRegistrationNumber; }

    public String getAppliedDiscountCode() { return appliedDiscountCode; }
    public long getDiscountTotalAmount() { return discountTotalAmount != null ? discountTotalAmount : 0L; }
    public long getDiscountRegAmount() { return discountRegAmount != null ? discountRegAmount : 0L; }
    public long getDiscountGalaAmount() { return discountGalaAmount != null ? discountGalaAmount : 0L; }
    public long getDiscountAccompAmount() { return discountAccompAmount != null ? discountAccompAmount : 0L; }
    public long getDiscountTourAmount() { return discountTourAmount != null ? discountTourAmount : 0L; }
}
