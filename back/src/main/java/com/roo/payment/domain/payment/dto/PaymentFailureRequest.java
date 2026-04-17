package com.roo.payment.domain.payment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 프론트엔드 결제 실패 이벤트 수신 DTO.
 * PayGate 팝업에서 결제 실패 시 서버로 전송하여 감사 로그를 남김.
 */
public record PaymentFailureRequest(

        /** PayGate 응답 코드 (예: 0002, NPS001 등) */
        @NotBlank @Size(max = 20) String replycode,

        /** PayGate 응답 메시지 */
        @Size(max = 200) String replyMsg,

        /** 거래 ID (null 가능 — 결제 팝업 취소 시 없을 수 있음) */
        @Size(max = 100) String tid) {
}
