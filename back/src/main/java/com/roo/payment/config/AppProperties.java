package com.roo.payment.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private Jwt jwt = new Jwt();
    private EmailVerification emailVerification = new EmailVerification();
    private Cors cors = new Cors();
    private Admin admin = new Admin();
    private Registration registration = new Registration();
    private boolean devMode = false;

    public Jwt getJwt() { return jwt; }
    public EmailVerification getEmailVerification() { return emailVerification; }
    public Cors getCors() { return cors; }
    public Admin getAdmin() { return admin; }
    public Registration getRegistration() { return registration; }
    public boolean isDevMode() { return devMode; }
    public void setDevMode(boolean devMode) { this.devMode = devMode; }

    public static class Jwt {
        private String secret;
        private long expirationMs;
        private long refreshExpirationMs;

        public String getSecret() { return secret; }
        public void setSecret(String secret) { this.secret = secret; }
        public long getExpirationMs() { return expirationMs; }
        public void setExpirationMs(long expirationMs) { this.expirationMs = expirationMs; }
        public long getRefreshExpirationMs() { return refreshExpirationMs; }
        public void setRefreshExpirationMs(long refreshExpirationMs) { this.refreshExpirationMs = refreshExpirationMs; }
    }

    public static class EmailVerification {
        private int expirationMinutes;

        public int getExpirationMinutes() { return expirationMinutes; }
        public void setExpirationMinutes(int expirationMinutes) { this.expirationMinutes = expirationMinutes; }
    }

    public static class Cors {
        private String allowedOrigins;

        public String getAllowedOrigins() { return allowedOrigins; }
        public void setAllowedOrigins(String allowedOrigins) { this.allowedOrigins = allowedOrigins; }
        public String[] getAllowedOriginsArray() {
            return allowedOrigins != null ? allowedOrigins.split(",") : new String[]{};
        }
    }

    public static class Admin {
        private String secretKey;

        public String getSecretKey() { return secretKey; }
        public void setSecretKey(String secretKey) { this.secretKey = secretKey; }
    }

    /**
     * 등록 기간 설정 — Pre-Registration / Early Bird / Regular 각 티어의 종료일을 YAML로 관리.
     * 프론트가 /api/config/registration-periods 로 조회하여 현재 활성 티어를 판단.
     */
    public static class Registration {
        private Tier preRegistration = new Tier();
        private Tier earlyBird       = new Tier();
        private Tier regular         = new Tier();

        public Tier getPreRegistration() { return preRegistration; }
        public Tier getEarlyBird()       { return earlyBird; }
        public Tier getRegular()         { return regular; }

        public static class Tier {
            private String startDate;   // ISO-8601 (YYYY-MM-DD) — nullable (Pre-Registration 외엔 선택)
            private String endDate;     // ISO-8601 (YYYY-MM-DD)

            public String getStartDate() { return startDate; }
            public void setStartDate(String startDate) { this.startDate = startDate; }
            public String getEndDate() { return endDate; }
            public void setEndDate(String endDate) { this.endDate = endDate; }
        }
    }
}
