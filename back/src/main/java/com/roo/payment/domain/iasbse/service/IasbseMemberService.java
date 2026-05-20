package com.roo.payment.domain.iasbse.service;

import com.roo.payment.domain.iasbse.entity.IasbseMember;
import com.roo.payment.domain.iasbse.repository.IasbseMemberRepository;
import org.apache.poi.ss.usermodel.*;
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
     * 이름과 소속으로 IASBSE 회원 여부 확인
     */
    public boolean isIasbseMember(String firstName, String lastName, String company) {
        if (firstName == null || lastName == null) return false;
        
        // 1) First name + Last name + Company exact match (case-insensitive)
        if (company != null && !company.trim().isEmpty()) {
            boolean exactMatch = iasbseMemberRepository.existsByFirstNameIgnoreCaseAndLastNameIgnoreCaseAndCompanyIgnoreCase(
                    firstName.trim(), lastName.trim(), company.trim());
            if (exactMatch) return true;
        }
        
        // 2) If no exact match, check if there's a seeded member with same name but empty company ""
        return iasbseMemberRepository.existsByFirstNameIgnoreCaseAndLastNameIgnoreCaseAndCompanyIgnoreCase(
                firstName.trim(), lastName.trim(), "");
    }

    public List<String> getDistinctCompanies() {
        return iasbseMemberRepository.findDistinctCompanies();
    }

    /**
     * 로컬 파일 경로로부터 직접 IABSE 회원 데이터를 일괄 적재 (서버 기동 시 사용)
     */
    @Transactional
    public int importFromLocalFile(String filePath) {
        java.io.File file = new java.io.File(filePath);
        if (!file.exists() || !file.canRead()) {
            return 0;
        }

        List<IasbseMember> toSave = new ArrayList<>();
        try (java.io.FileInputStream fis = new java.io.FileInputStream(file);
             Workbook workbook = WorkbookFactory.create(fis)) {
            Sheet sheet = workbook.getSheetAt(0);

            // 1행은 헤더 → 2행부터 처리
            for (int rowIdx = 1; rowIdx <= sheet.getLastRowNum(); rowIdx++) {
                Row row = sheet.getRow(rowIdx);
                if (row == null) continue;

                String firstName = getCellString(row, 0);
                String lastName = getCellString(row, 1);
                String company = getCellString(row, 2);
                String status = getCellString(row, 6);

                if (firstName == null || firstName.isBlank() || 
                    lastName == null || lastName.isBlank()) {
                    continue;
                }

                if (company == null) {
                    company = "";
                }

                toSave.add(new IasbseMember(firstName.trim(), lastName.trim(), company.trim(), status));
            }

            if (!toSave.isEmpty()) {
                iasbseMemberRepository.deleteAll(); // Truncate existing data
                iasbseMemberRepository.saveAll(toSave);
            }
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(IasbseMemberService.class)
                    .error("Failed to seed IABSE members from local excel: " + filePath, e);
        }

        return toSave.size();
    }

    /**
     * 엑셀 파일로 IASBSE 회원 데이터 일괄 업로드 (Truncate and Insert)
     * 컬럼 순서: First name | Last name | Company | Country | Fellowship | Membership level | Membership status
     */
    @Transactional
    public int importFromExcel(MultipartFile file) throws IOException {
        List<IasbseMember> toSave = new ArrayList<>();

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);

            // 1행은 헤더 → 2행부터 처리
            for (int rowIdx = 1; rowIdx <= sheet.getLastRowNum(); rowIdx++) {
                Row row = sheet.getRow(rowIdx);
                if (row == null) continue;

                String firstName = getCellString(row, 0);
                String lastName = getCellString(row, 1);
                String company = getCellString(row, 2);
                String status = getCellString(row, 6);

                if (firstName == null || firstName.isBlank() || 
                    lastName == null || lastName.isBlank()) {
                    continue;
                }

                if (company == null) {
                    company = "";
                }

                toSave.add(new IasbseMember(firstName.trim(), lastName.trim(), company.trim(), status));
            }

            if (!toSave.isEmpty()) {
                iasbseMemberRepository.deleteAll(); // Truncate existing data
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
