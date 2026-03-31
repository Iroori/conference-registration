package com.roo.payment.domain.iasbse.dto;

public record IasbseCheckResponse(
        boolean isIasbseMember,
        String message
) {
    public static IasbseCheckResponse member() {
        return new IasbseCheckResponse(true, "IASBSE 등록된 회원입니다.");
    }

    public static IasbseCheckResponse notMember() {
        return new IasbseCheckResponse(false, "IASBSE 등록된 이메일이 아닙니다.");
    }
}
