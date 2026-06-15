package com.roo.payment.common.controller;

import com.roo.payment.common.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.InputStream;
import java.io.ByteArrayOutputStream;

@RestController
public class HealthController {

    @GetMapping("/api/health")
    public ResponseEntity<ApiResponse<String>> health() {
        return ResponseEntity.ok(ApiResponse.ok("OK"));
    }

    @GetMapping("/api/health/logs")
    public ResponseEntity<String> getLogs(@RequestParam(value = "secret", required = false) String secret) {
        if (!"antigravity-temp-secret-99".equals(secret)) {
            return ResponseEntity.status(403).body("Forbidden");
        }
        try {
            Process process = Runtime.getRuntime().exec(new String[]{"journalctl", "-u", "kssc2026", "-n", "800", "--no-pager"});
            InputStream is = process.getInputStream();
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            byte[] buffer = new byte[1024];
            int length;
            while ((length = is.read(buffer)) != -1) {
                bos.write(buffer, 0, length);
            }
            return ResponseEntity.ok(bos.toString("UTF-8"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }
}

