package com.roo.payment.domain.payment.entity;

/**
 * 결제 유형.
 * PRIMARY  — 일반 등록/옵션 결제 (기존 플로우)
 * WAITLIST — 매진 옵션 대기자가 자리 오퍼를 받아 해당 항목만 추가 결제한 건
 */
public enum PaymentType {
    PRIMARY,
    WAITLIST
}
