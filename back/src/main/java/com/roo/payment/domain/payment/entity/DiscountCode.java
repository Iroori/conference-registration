package com.roo.payment.domain.payment.entity;

import com.roo.payment.common.entity.BaseEntity;
import com.roo.payment.domain.user.entity.User;
import jakarta.persistence.*;

@Entity
@Table(name = "discount_codes", indexes = {
        @Index(name = "idx_discount_codes_code", columnList = "code", unique = true)
})
public class DiscountCode extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 8)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private int iabseMemberDiscountRate; // 0, 50, 100

    @Column(nullable = false)
    private int nonIabseMemberDiscountRate; // 0, 50, 100

    @Column(nullable = false)
    private boolean galaDinnerFree;

    @Column(nullable = false)
    private boolean accompanyingPersonFree;

    @Column(nullable = false)
    private boolean technicalTourFree;

    @Column(nullable = false)
    private boolean used = false;

    @Column(nullable = false)
    private boolean active = true;

    protected DiscountCode() {}

    public DiscountCode(String code, User user, int iabseMemberDiscountRate, int nonIabseMemberDiscountRate,
                        boolean galaDinnerFree, boolean accompanyingPersonFree, boolean technicalTourFree) {
        this.code = code.toUpperCase().trim();
        this.user = user;
        this.iabseMemberDiscountRate = iabseMemberDiscountRate;
        this.nonIabseMemberDiscountRate = nonIabseMemberDiscountRate;
        this.galaDinnerFree = galaDinnerFree;
        this.accompanyingPersonFree = accompanyingPersonFree;
        this.technicalTourFree = technicalTourFree;
    }

    public void markAsUsed() {
        this.used = true;
    }

    public void markAsUnused() {
        this.used = false;
    }

    public void deactivate() {
        this.active = false;
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public User getUser() { return user; }
    public int getIabseMemberDiscountRate() { return iabseMemberDiscountRate; }
    public int getNonIabseMemberDiscountRate() { return nonIabseMemberDiscountRate; }
    public boolean isGalaDinnerFree() { return galaDinnerFree; }
    public boolean isAccompanyingPersonFree() { return accompanyingPersonFree; }
    public boolean isTechnicalTourFree() { return technicalTourFree; }
    public boolean isUsed() { return used; }
    public boolean isActive() { return active; }
}
