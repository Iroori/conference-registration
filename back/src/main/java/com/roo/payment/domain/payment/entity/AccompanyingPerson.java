package com.roo.payment.domain.payment.entity;

import com.roo.payment.common.entity.BaseEntity;
import jakarta.persistence.*;

/**
 * 동반자(Accompanying Person) 정보.
 * 동반자 등록 옵션을 선택한 결제 건에 1:1로 연결되며, 이름은 결제와 별도 테이블에 보관한다.
 */
@Entity
@Table(name = "accompanying_persons")
public class AccompanyingPerson extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id", nullable = false, unique = true)
    private Payment payment;

    @Column(nullable = false, length = 100)
    private String lastName;

    @Column(nullable = false, length = 100)
    private String firstName;

    protected AccompanyingPerson() {
    }

    public AccompanyingPerson(Payment payment, String lastName, String firstName) {
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
