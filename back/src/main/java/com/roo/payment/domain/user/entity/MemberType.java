package com.roo.payment.domain.user.entity;

public enum MemberType {
    /** IABSE 등록 회원 */
    MEMBER,
    /** 비회원 - 일반 (만 36세 이상, 기본) */
    NON_MEMBER,
    /** 비회원 - 특수 (관리자 지정 또는 기관 단체, 추가 혜택 포함) */
    NON_MEMBER_PLUS,
    /** 비회원 - Young Engineer (만 35세 이하) */
    YOUNG_ENGINEER
}
