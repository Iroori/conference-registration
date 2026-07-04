package com.roo.payment.domain.payment.controller;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pre-workshop")
public class PreWorkshopController {

    @GetMapping("/download/{fileName}")
    public ResponseEntity<Resource> downloadFile(@PathVariable String fileName) {
        // 경로 탐색 공격(Path Traversal) 방지를 위한 파일 이름 검증
        if (!"ForensicEngineeringPractice.pdf".equals(fileName) && !"StructuralHealthMonitoring.png".equals(fileName)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        try {
            ClassPathResource resource = new ClassPathResource("pre-workshop/" + fileName);
            if (!resource.exists()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            String contentType = fileName.endsWith(".pdf") ? "application/pdf" : "image/png";

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/download")
    public ResponseEntity<Resource> downloadFileQuery(@RequestParam("fileName") String fileName) {
        return downloadFile(fileName);
    }
}
