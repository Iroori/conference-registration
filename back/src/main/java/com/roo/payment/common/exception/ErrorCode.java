package com.roo.payment.common.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    // Auth
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Invalid email or password."),
    TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "The token has expired."),
    TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "Invalid token."),
    EMAIL_NOT_VERIFIED(HttpStatus.FORBIDDEN, "Email verification is required."),
    EMAIL_ALREADY_VERIFIED(HttpStatus.BAD_REQUEST, "This email is already verified."),
    VERIFICATION_CODE_EXPIRED(HttpStatus.BAD_REQUEST, "The verification code has expired."),
    VERIFICATION_CODE_INVALID(HttpStatus.BAD_REQUEST, "Invalid verification code."),
    REFRESH_TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "Invalid refresh token."),
    REFRESH_TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "Refresh token expired. Please log in again."),
    VERIFICATION_CODE_COOLDOWN(HttpStatus.TOO_MANY_REQUESTS, "Please wait a moment before requesting another code."),

    // User
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "User not found."),
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "This email is already registered. Please sign in instead."),
    ADMIN_CANNOT_BE_DELETED(HttpStatus.BAD_REQUEST, "System administrators cannot be deleted."),

    // IASBSE
    IASBSE_MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "Email not found in IASBSE registry."),
    IABSE_MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "IABSE member not found."),
    IABSE_ID_ALREADY_EXISTS(HttpStatus.CONFLICT, "This IABSE ID is already registered."),

    // Payment
    PAYMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "Payment history not found."),
    PAYMENT_ALREADY_EXISTS(HttpStatus.CONFLICT, "A completed payment already exists."),
    PAYGATE_VERIFICATION_FAILED(HttpStatus.BAD_REQUEST, "Payment verification failed."),
    PAYGATE_BODY_INVALID(HttpStatus.BAD_REQUEST, "Invalid PG verification response."),
    PAYMENT_AMOUNT_MISMATCH(HttpStatus.BAD_REQUEST, "Payment amount does not match the calculated amount."),

    // Option
    OPTION_NOT_FOUND(HttpStatus.NOT_FOUND, "Selected option not found."),
    OPTION_CAPACITY_EXCEEDED(HttpStatus.BAD_REQUEST, "The selected program's capacity has been exceeded."),
    ACCOMPANYING_NAME_REQUIRED(HttpStatus.BAD_REQUEST, "Accompanying person's name (First/Last) is required."),

    // Waitlist
    WAITLIST_NOT_FOUND(HttpStatus.NOT_FOUND, "Waitlist entry not found."),
    WAITLIST_NOT_OFFERED(HttpStatus.BAD_REQUEST, "This waitlist item is not available for payment."),
    WAITLIST_OFFER_EXPIRED(HttpStatus.BAD_REQUEST, "This waitlist offer has expired."),
    WAITLIST_FORBIDDEN(HttpStatus.FORBIDDEN, "You do not have access to this waitlist offer."),
    WAITLIST_CAPACITY_FULL(HttpStatus.CONFLICT, "No seats available. Confirm the over-capacity offer to proceed."),

    // Discount Code
    DISCOUNT_CODE_NOT_FOUND(HttpStatus.NOT_FOUND, "Discount code not found or inactive."),
    DISCOUNT_CODE_ALREADY_USED(HttpStatus.BAD_REQUEST, "This discount code has already been used."),
    DISCOUNT_CODE_INVALID_USER(HttpStatus.FORBIDDEN, "This discount code is not assigned to your account."),

    // Common
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "Invalid input value."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "Access denied."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "An internal server error occurred.");

    private final HttpStatus status;
    private final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getMessage() {
        return message;
    }
}
