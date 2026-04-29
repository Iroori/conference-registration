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

    @Column(name = "last_name", length = 100)
    private String lastName;

    @Column(name = "first_name", length = 100)
    private String firstName;

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

    public User(String email, String password, String lastName, String firstName,
                String affiliation, String position, String country, String phone,
                LocalDate birthDate, MemberType memberType) {
        this(email, password, lastName, firstName, affiliation, position, country, phone, birthDate, memberType, false);
    }

    public User(String email, String password, String lastName, String firstName,
                String affiliation, String position, String country, String phone,
                LocalDate birthDate, MemberType memberType, boolean presenter) {
        this.email = email.toLowerCase().trim();
        this.password = password;
        this.lastName = lastName;
        this.firstName = firstName;
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

    /** "First Last" 형태의 표시용 풀네임. null/빈 값은 안전하게 무시. */
    public String getFullName() {
        String f = firstName == null ? "" : firstName.trim();
        String l = lastName == null ? "" : lastName.trim();
        if (f.isEmpty()) return l;
        if (l.isEmpty()) return f;
        return f + " " + l;
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getPassword() { return password; }
    public String getLastName() { return lastName; }
    public String getFirstName() { return firstName; }
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
