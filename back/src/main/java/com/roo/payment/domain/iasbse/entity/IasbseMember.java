package com.roo.payment.domain.iasbse.entity;

import com.roo.payment.common.entity.BaseEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "iasbse_members", indexes = {
        @Index(name = "idx_iasbse_email", columnList = "email", unique = true)
})
public class IasbseMember extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(length = 100)
    private String nameKr;

    @Column(length = 100)
    private String nameEn;

    @Column(length = 200)
    private String affiliation;

    @Column(length = 50)
    private String memberNo;   // IASBSE 회원 번호 (있는 경우)

    @Column(nullable = false)
    private boolean active = true;

    protected IasbseMember() {}

    public IasbseMember(String email, String nameKr, String nameEn, String affiliation, String memberNo) {
        this.email = email.toLowerCase().trim();
        this.nameKr = nameKr;
        this.nameEn = nameEn;
        this.affiliation = affiliation;
        this.memberNo = memberNo;
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getNameKr() { return nameKr; }
    public String getNameEn() { return nameEn; }
    public String getAffiliation() { return affiliation; }
    public String getMemberNo() { return memberNo; }
    public boolean isActive() { return active; }

    public void deactivate() { this.active = false; }
    public void activate() { this.active = true; }

    public void update(String nameKr, String nameEn, String affiliation, String memberNo) {
        if (nameKr != null) this.nameKr = nameKr;
        if (nameEn != null) this.nameEn = nameEn;
        if (affiliation != null) this.affiliation = affiliation;
        if (memberNo != null) this.memberNo = memberNo;
    }
}
