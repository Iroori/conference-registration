package com.roo.payment;

import org.apache.poi.ss.usermodel.*;
import org.junit.jupiter.api.Test;
import java.io.File;
import java.io.FileInputStream;

public class ExcelDumpTest {
    @Test
    public void dumpExcel() throws Exception {
        File file = new File("/Users/roor2i/Desktop/sw/conference-registration/docs/payment/2026-04-28 Members IABSE (1).xls");
        try (FileInputStream fis = new FileInputStream(file);
             Workbook workbook = WorkbookFactory.create(fis)) {
            Sheet sheet = workbook.getSheetAt(0);
            int lastRowNum = sheet.getLastRowNum();
            int totalPhysical = sheet.getPhysicalNumberOfRows();
            int validCount = 0;
            java.util.Set<String> uniqueKeys = new java.util.HashSet<>();
            int activeCount = 0;
            java.util.Map<String, Integer> statusCounts = new java.util.HashMap<>();

            java.util.Set<String> activeUniqueKeys = new java.util.HashSet<>();
            for (int i = 1; i <= lastRowNum; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                String firstName = getCellString(row, 0);
                String lastName = getCellString(row, 1);
                String company = getCellString(row, 2);
                String status = getCellString(row, 6);

                if (firstName == null || firstName.isBlank() || 
                    lastName == null || lastName.isBlank() || 
                    company == null || company.isBlank()) {
                    continue;
                }

                validCount++;
                
                String uniqueKey = (firstName.trim() + "|" + lastName.trim() + "|" + company.trim()).toLowerCase();
                uniqueKeys.add(uniqueKey);

                if (status != null) {
                    String trimmedStatus = status.trim();
                    statusCounts.put(trimmedStatus, statusCounts.getOrDefault(trimmedStatus, 0) + 1);
                    if ("Active".equalsIgnoreCase(trimmedStatus)) {
                        activeCount++;
                        activeUniqueKeys.add(uniqueKey);
                    }
                } else {
                    statusCounts.put("NULL/Blank", statusCounts.getOrDefault("NULL/Blank", 0) + 1);
                }
            }

            System.out.println("=== EXCEL EXACT SERVICE PARSE STATISTICS ===");
            System.out.println("Total Physical Rows: " + totalPhysical);
            System.out.println("Last Row Index: " + lastRowNum);
            System.out.println("Valid Service Parsed Rows: " + validCount);
            System.out.println("Unique Combinations (First+Last+Company): " + uniqueKeys.size());
            System.out.println("Active Status Rows: " + activeCount);
            System.out.println("Unique Active Combinations: " + activeUniqueKeys.size());
            System.out.println("Status breakdown:");
            statusCounts.forEach((k, v) -> System.out.println("  - " + k + ": " + v));
            System.out.println("============================================");
        }
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
