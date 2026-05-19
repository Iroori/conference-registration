package com.roo.payment.domain.iasbse.entity;

import com.roo.payment.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
    name = "iasbse_members",
    indexes = {
        @Index(name = "idx_iasbse_member_name_company", columnList = "first_name, last_name, company")
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class IasbseMember extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(name = "company", nullable = false, length = 200)
    private String company;

    @Column(name = "status", length = 50)
    private String status;

    public IasbseMember(String firstName, String lastName, String company, String status) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.company = company;
        this.status = status;
    }

    public void update(String status) {
        this.status = status;
    }
}
