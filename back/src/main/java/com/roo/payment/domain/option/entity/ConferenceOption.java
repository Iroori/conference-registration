package com.roo.payment.domain.option.entity;

import com.roo.payment.common.entity.BaseEntity;
import com.roo.payment.domain.user.entity.MemberType;
import jakarta.persistence.*;

@Entity
@Table(name = "conference_options")
public class ConferenceOption extends BaseEntity {

    @Id
    @Column(length = 30)
    private String id;         // ex: OPT-REG-MEMBER

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OptionCategory category;

    @Column(nullable = false, length = 200)
    private String nameKr;

    @Column(nullable = false, length = 200)
    private String nameEn;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    private long price;

    @Column(nullable = false)
    private boolean free;

    @Column(nullable = false)
    private boolean required;

    private boolean requiresUpload;

    /** null = 모든 회원 유형 허용 / 특정 값 = 해당 유형만 */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private MemberType allowedMemberType;

    /** 최대 정원 (null = 무제한) */
    private Integer maxCapacity;

    /** 현재 등록된 인원 */
    @Column(nullable = false)
    private int currentCount = 0;

    @Column(nullable = false)
    private boolean active = true;

    protected ConferenceOption() {}

    public ConferenceOption(String id, OptionCategory category, String nameKr, String nameEn,
                            String description, long price, boolean free, boolean required,
                            boolean requiresUpload, MemberType allowedMemberType, Integer maxCapacity) {
        this.id = id;
        this.category = category;
        this.nameKr = nameKr;
        this.nameEn = nameEn;
        this.description = description;
        this.price = price;
        this.free = free;
        this.required = required;
        this.requiresUpload = requiresUpload;
        this.allowedMemberType = allowedMemberType;
        this.maxCapacity = maxCapacity;
    }

    public boolean hasCapacity() {
        return maxCapacity == null || currentCount < maxCapacity;
    }

    public void deactivate() {
        this.active = false;
    }

    /**
     * 시드 데이터 동기화 — 가격·정원 등 편집 가능한 필드를 갱신한다.
     * 판매 이력에 해당하는 currentCount는 보존한다.
     */
    public void syncFrom(ConferenceOption source) {
        this.category = source.category;
        this.nameKr = source.nameKr;
        this.nameEn = source.nameEn;
        this.description = source.description;
        this.price = source.price;
        this.free = source.free;
        this.required = source.required;
        this.requiresUpload = source.requiresUpload;
        this.allowedMemberType = source.allowedMemberType;
        this.maxCapacity = source.maxCapacity;
        this.active = source.active;
    }

    public void increaseCount() {
        this.currentCount++;
    }

    public void decreaseCount() {
        if (this.currentCount > 0) this.currentCount--;
    }

    public String getId() { return id; }
    public OptionCategory getCategory() { return category; }
    public String getNameKr() { return nameKr; }
    public String getNameEn() { return nameEn; }
    public String getDescription() { return description; }
    public long getPrice() { return price; }
    public boolean isFree() { return free; }
    public boolean isRequired() { return required; }
    public boolean isRequiresUpload() { return requiresUpload; }
    public MemberType getAllowedMemberType() { return allowedMemberType; }
    public Integer getMaxCapacity() { return maxCapacity; }
    public int getCurrentCount() { return currentCount; }
    public boolean isActive() { return active; }
}
