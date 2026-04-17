package com.roo.payment.common.exception;

import com.roo.payment.common.response.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException e) {
        ErrorCode code = e.getErrorCode();

        // 결제 / 보안 관련 예외는 ERROR 레벨로 로깅
        if (isPaymentOrSecurityError(code)) {
            log.error("[ERROR] Business exception — code={} message={}", code.name(), e.getMessage());
        } else {
            log.warn("[WARN] Business exception — code={} message={}", code.name(), e.getMessage());
        }

        return ResponseEntity
                .status(code.getStatus())
                .body(ApiResponse.fail(e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining(", "));
        log.warn("[WARN] Validation failed — {}", message);
        return ResponseEntity
                .badRequest()
                .body(ApiResponse.fail(message));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolation(ConstraintViolationException e) {
        log.warn("[WARN] Constraint violation — {}", e.getMessage());
        return ResponseEntity
                .badRequest()
                .body(ApiResponse.fail(e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneral(Exception e) {
        // 예상치 못한 에러 — 스택 트레이스를 포함하여 기록
        log.error("[ERROR] Unhandled exception — {}: {}", e.getClass().getSimpleName(), e.getMessage(), e);
        return ResponseEntity
                .internalServerError()
                .body(ApiResponse.fail(ErrorCode.INTERNAL_SERVER_ERROR.getMessage()));
    }

    /**
     * 결제/보안 관련 에러코드 여부 판별 — ERROR 레벨 로깅 대상
     */
    private boolean isPaymentOrSecurityError(ErrorCode code) {
        return switch (code) {
            case PAYGATE_VERIFICATION_FAILED,
                    PAYGATE_BODY_INVALID,
                    PAYMENT_ALREADY_EXISTS,
                    PAYMENT_AMOUNT_MISMATCH,
                    TOKEN_INVALID,
                    TOKEN_EXPIRED,
                    REFRESH_TOKEN_INVALID ->
                true;
            default -> false;
        };
    }
}
