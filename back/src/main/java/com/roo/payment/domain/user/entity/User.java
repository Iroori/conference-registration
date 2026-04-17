package com.roo.payment.domain.user.entity;

import com.roo.payment.common.entity.BaseEntity;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.Period;

@Entity
@Table(name = "users", indexes = {
        @Index(name = "idx_users_email", columnList = "email", unique = true)
})
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(length = 100)
    private String nameKr;

    @Column(length = 100)
    private String nameEn;

    @Column(length = 200)
    private String affiliation;

    @Column(length = 100)
    private String position;

    @Column(length = 100)
    private String country;

    @Column(length = 50)
    private String phone;

    @Column(nullable = false)
    private LocalDate birthDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MemberType memberType;

    @Column(nullable = false)
    private boolean emailVerified = false;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false)
    private boolean presenter = false;

    /** 관리자 여부. true 시 JWT의 role 클레임에 ADMIN 부여. */
    @Column(nullable = false)
    private boolean admin = false;

    protected User() {}

    public User(String email, String password, String nameKr, String nameEn,
                String affiliation, String position, String country, String phone,
                LocalDate birthDate, MemberType memberType) {
        this(email, password, nameKr, nameEn, affiliation, position, country, phone, birthDate, memberType, false);
    }

    public User(String email, String password, String nameKr, String nameEn,
                String affiliation, String position, String country, String phone,
                LocalDate birthDate, MemberType memberType, boolean presenter) {
        this.email = email.toLowerCase().trim();
        this.password = password;
        this.nameKr = nameKr;
        this.nameEn = nameEn;
        this.affiliation = affiliation;
        this.position = position;
        this.country = country;
        this.phone = phone;
        this.birthDate = birthDate;
        this.memberType = memberType;
        this.presenter = presenter;
    }

    /**
     * 만 나이 계산
     */
    public int getAge() {
        return Period.between(birthDate, LocalDate.now()).getYears();
    }

    /**
     * Young Engineer 여부 (만 35세 이하)
     */
    public boolean isYoungEngineer() {
        return getAge() <= 35;
    }

    public void verifyEmail() {
        this.emailVerified = true;
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getPassword() { return password; }
    public String getNameKr() { return nameKr; }
    public String getNameEn() { return nameEn; }
    public String getAffiliation() { return affiliation; }
    public String getPosition() { return position; }
    public String getCountry() { return country; }
    public String getPhone() { return phone; }
    public LocalDate getBirthDate() { return birthDate; }
    public MemberType getMemberType() { return memberType; }
    public boolean isEmailVerified() { return emailVerified; }
    public boolean isActive() { return active; }
    public boolean isPresenter() { return presenter; }
    public boolean isAdmin() { return admin; }
    public void promoteToAdmin() { this.admin = true; }
}
