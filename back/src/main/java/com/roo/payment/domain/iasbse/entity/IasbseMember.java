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
        @Index(name = "idx_iasbse_member_iabse_id", columnList = "iabse_id")
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class IasbseMember extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "iabse_id", nullable = false, columnDefinition = "NVARCHAR(50)")
    private String iabseId;

    @Column(name = "first_name", nullable = false, columnDefinition = "NVARCHAR(100)")
    private String firstName;
 
    @Column(name = "last_name", nullable = false, columnDefinition = "NVARCHAR(100)")
    private String lastName;

    public IasbseMember(String iabseId, String firstName, String lastName) {
        this.iabseId = iabseId;
        this.firstName = firstName;
        this.lastName = lastName;
    }
}
