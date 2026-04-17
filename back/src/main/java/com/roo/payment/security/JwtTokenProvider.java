package com.roo.payment.security;

import com.roo.payment.config.AppProperties;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);

    private static final String ISSUER      = "kssc2026";
    private static final String CLAIM_TYPE  = "tokenType";
    private static final String TYPE_ACCESS = "access";

    private final SecretKey secretKey;
    private final long expirationMs;

    public JwtTokenProvider(AppProperties appProperties) {
        String secret = appProperties.getJwt().getSecret();
        this.secretKey  = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = appProperties.getJwt().getExpirationMs();
    }

    // ─── Token generation ────────────────────────────────────────────────────

    /** Access JWT (short-lived, used in Authorization header) */
    public String generateToken(String email, String memberType) {
        return generateToken(email, memberType, false);
    }

    public String generateToken(String email, String memberType, boolean admin) {
        Date now = new Date();
        return Jwts.builder()
                .issuer(ISSUER)
                .subject(email)
                .claim("memberType", memberType)
                .claim("admin", admin)
                .claim(CLAIM_TYPE, TYPE_ACCESS)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(secretKey)
                .compact();
    }

    // ─── Claim extraction ────────────────────────────────────────────────────

    public String getEmail(String token) {
        return parseClaims(token).getSubject();
    }

    public String getMemberType(String token) {
        return parseClaims(token).get("memberType", String.class);
    }

    public boolean isAdmin(String token) {
        Boolean v = parseClaims(token).get("admin", Boolean.class);
        return Boolean.TRUE.equals(v);
    }

    // ─── Validation ──────────────────────────────────────────────────────────

    /**
     * Access token 검증 — JwtAuthFilter 에서 사용.
     * 만료·변조·서명 오류는 WARN 레벨로 기록하고 false 반환.
     */
    public boolean validateAccessToken(String token) {
        try {
            Claims claims = parseClaims(token);
            if (!TYPE_ACCESS.equals(claims.get(CLAIM_TYPE, String.class))) {
                log.warn("[JWT] Wrong token type — expected access");
                return false;
            }
            return true;
        } catch (ExpiredJwtException e) {
            log.warn("[JWT] Access token expired for subject={}", e.getClaims().getSubject());
        } catch (MalformedJwtException e) {
            log.warn("[JWT] Malformed access token");
        } catch (SignatureException e) {
            log.warn("[JWT] Invalid JWT signature");
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("[JWT] Invalid access token: {}", e.getMessage());
        }
        return false;
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
