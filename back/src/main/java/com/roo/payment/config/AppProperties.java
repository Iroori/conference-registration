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
    private boolean devMode = false;

    public Jwt getJwt() { return jwt; }
    public EmailVerification getEmailVerification() { return emailVerification; }
    public Cors getCors() { return cors; }
    public Admin getAdmin() { return admin; }
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
}
