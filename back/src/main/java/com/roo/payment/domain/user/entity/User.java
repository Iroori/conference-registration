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

    @Column(columnDefinition = "NVARCHAR(200)")
    private String affiliation;

    @Column(columnDefinition = "NVARCHAR(100)")
    private String position;

    @Column(columnDefinition = "NVARCHAR(100)")
    private String country;

    @Column(columnDefinition = "NVARCHAR(50)")
    private String phone;

    @Column(nullable = true)
    private LocalDate birthDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MemberType memberType;

    /** 식단 요구사항 (회원가입 시 수집) */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private DietaryRequirement dietaryRequirement;

    /** 식단 요구사항이 OTHER 인 경우의 상세 내용 */
    @Column(length = 200)
    private String dietaryNote;

    @Column(nullable = false)
    private boolean emailVerified = false;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false)
    private boolean presenter = false;

    @Column(nullable = false)
    private boolean author = false;

    @Column(name = "paper_info", length = 300, columnDefinition = "nvarchar(300)")
    private String paperInfo;

    /** 관리자 여부. true 시 JWT의 role 클레임에 ADMIN 부여. */
    @Column(nullable = false)
    private boolean admin = false;

    @Column(name = "iabse_id", length = 100)
    private String iabseId;

    @Column(name = "billing_university", length = 200, columnDefinition = "nvarchar(200)")
    private String billingUniversity;

    @Column(name = "billing_vat", length = 100)
    private String billingVat;

    @Column(name = "billing_po_number", length = 100)
    private String billingPoNumber;

    @Column(name = "billing_street", length = 300, columnDefinition = "nvarchar(300)")
    private String billingStreet;

    @Column(name = "billing_additional_info", length = 300, columnDefinition = "nvarchar(300)")
    private String billingAdditionalInfo;

    @Column(name = "billing_po_box", length = 50, columnDefinition = "nvarchar(50)")
    private String billingPoBox;

    @Column(name = "billing_postcode", length = 50)
    private String billingPostcode;

    @Column(name = "billing_city", length = 100, columnDefinition = "nvarchar(100)")
    private String billingCity;

    @Column(name = "billing_country", length = 100, columnDefinition = "nvarchar(100)")
    private String billingCountry;

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
     * Young Engineer 여부 — 가입 시점 나이 판정 결과(memberType)를 기준으로 함.
     * 가입 후 나이가 바뀌어도 회원 유형은 불변.
     */
    public boolean isYoungEngineer() {
        return this.memberType == MemberType.YOUNG_ENGINEER;
    }

    public void verifyEmail() {
        this.emailVerified = true;
    }

    /** 식단 요구사항 등록 — OTHER 가 아니면 상세 내용은 보관하지 않는다. */
    public void assignDietaryRequirement(DietaryRequirement requirement, String note) {
        this.dietaryRequirement = requirement;
        this.dietaryNote = requirement == DietaryRequirement.OTHER ? note : null;
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
    public DietaryRequirement getDietaryRequirement() { return dietaryRequirement; }
    public String getDietaryNote() { return dietaryNote; }
    public boolean isEmailVerified() { return emailVerified; }
    public boolean isActive() { return active; }
    public boolean isPresenter() { return presenter; }
    public boolean isAuthor() { return author; }
    public void setAuthor(boolean author) { this.author = author; }
    public String getPaperInfo() { return paperInfo; }
    public void assignPaperInfo(String paperInfo) { this.paperInfo = paperInfo; }
    public boolean isAdmin() { return admin; }
    public void promoteToAdmin() { this.admin = true; }
    public void updateMemberType(MemberType memberType) { this.memberType = memberType; }

    public String getIabseId() { return iabseId; }
    public void setIabseId(String iabseId) { this.iabseId = iabseId; }

    public String getBillingUniversity() { return billingUniversity; }
    public String getBillingVat() { return billingVat; }
    public String getBillingPoNumber() { return billingPoNumber; }
    public String getBillingStreet() { return billingStreet; }
    public String getBillingAdditionalInfo() { return billingAdditionalInfo; }
    public String getBillingPoBox() { return billingPoBox; }
    public String getBillingPostcode() { return billingPostcode; }
    public String getBillingCity() { return billingCity; }
    public String getBillingCountry() { return billingCountry; }

    public void assignBillingAddress(String billingUniversity, String billingVat, String billingPoNumber,
                                     String billingStreet, String billingAdditionalInfo, String billingPoBox,
                                     String billingPostcode, String billingCity, String billingCountry) {
        this.billingUniversity = billingUniversity;
        this.billingVat = billingVat;
        this.billingPoNumber = billingPoNumber;
        this.billingStreet = billingStreet;
        this.billingAdditionalInfo = billingAdditionalInfo;
        this.billingPoBox = billingPoBox;
        this.billingPostcode = billingPostcode;
        this.billingCity = billingCity;
        this.billingCountry = billingCountry;
    }

    public void updateProfile(String firstName, String lastName, String affiliation, String country, String position, String phone, LocalDate birthDate) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.affiliation = affiliation;
        this.country = country;
        this.position = position;
        this.phone = phone;
        this.birthDate = birthDate;
    }
}
