package com.roo.payment.domain.iasbse.service;

import com.roo.payment.domain.iasbse.entity.IasbseMember;
import com.roo.payment.domain.iasbse.repository.IasbseMemberRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class IasbseMemberService {

    private final IasbseMemberRepository iasbseMemberRepository;

    public IasbseMemberService(IasbseMemberRepository iasbseMemberRepository) {
        this.iasbseMemberRepository = iasbseMemberRepository;
    }

    /**
     * 이메일로 IASBSE 회원 여부 확인
     */
    public boolean isIasbseMember(String email) {
        return iasbseMemberRepository.existsByEmailAndActiveTrue(email.toLowerCase().trim());
    }

    /**
     * 엑셀 파일로 IASBSE 회원 데이터 일괄 업로드 (upsert)
     * 컬럼 순서: email | nameKr | nameEn | affiliation | memberNo
     */
    @Transactional
    public int importFromExcel(MultipartFile file) throws IOException {
        List<IasbseMember> toSave = new ArrayList<>();

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);

            // 1행은 헤더 → 2행부터 처리
            for (int rowIdx = 1; rowIdx <= sheet.getLastRowNum(); rowIdx++) {
                Row row = sheet.getRow(rowIdx);
                if (row == null) continue;

                String email = getCellString(row, 0);
                if (email == null || email.isBlank()) continue;

                String nameKr = getCellString(row, 1);
                String nameEn = getCellString(row, 2);
                String affiliation = getCellString(row, 3);
                String memberNo = getCellString(row, 4);

                // 기존 회원이면 업데이트, 없으면 신규 추가
                iasbseMemberRepository.findByEmailAndActiveTrue(email.toLowerCase().trim())
                        .ifPresentOrElse(
                                existing -> existing.update(nameKr, nameEn, affiliation, memberNo),
                                () -> toSave.add(new IasbseMember(email, nameKr, nameEn, affiliation, memberNo))
                        );
            }

            if (!toSave.isEmpty()) {
                iasbseMemberRepository.saveAll(toSave);
            }
        }

        return toSave.size();
    }

    private String getCellString(Row row, int colIdx) {
        Cell cell = row.getCell(colIdx, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            default -> null;
        };
    }
}
