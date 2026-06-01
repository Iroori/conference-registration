package com.roo.payment.domain.payment.entity;

import com.roo.payment.common.entity.BaseEntity;
import jakarta.persistence.*;

/**
 * 전시자 배지(Exhibitor Badge) 정보.
 * 각 결제 건에 여러 개의 전시자 배지 이름(Last Name / First Name)이 연결된다.
 */
@Entity
@Table(name = "exhibitor_badges")
public class ExhibitorBadge extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id", nullable = false)
    private Payment payment;

    @Column(nullable = false, length = 100)
    private String lastName;

    @Column(nullable = false, length = 100)
    private String firstName;

    protected ExhibitorBadge() {
    }

    public ExhibitorBadge(Payment payment, String lastName, String firstName) {
        this.payment = payment;
        this.lastName = lastName;
        this.firstName = firstName;
    }

    public Long getId() {
        return id;
    }

    public Payment getPayment() {
        return payment;
    }

    public String getLastName() {
        return lastName;
    }

    public String getFirstName() {
        return firstName;
    }
}
