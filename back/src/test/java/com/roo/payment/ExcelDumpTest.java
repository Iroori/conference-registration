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
            for (int i = 0; i < Math.min(5, sheet.getPhysicalNumberOfRows()); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                StringBuilder sb = new StringBuilder();
                for (int j = 0; j < row.getLastCellNum(); j++) {
                    Cell cell = row.getCell(j, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
                    String val = "null";
                    if (cell != null) {
                        val = switch (cell.getCellType()) {
                            case STRING -> cell.getStringCellValue();
                            case NUMERIC -> String.valueOf(cell.getNumericCellValue());
                            default -> cell.getCellType().toString();
                        };
                    }
                    sb.append(val).append(" | ");
                }
                System.out.println("Row " + i + ": " + sb.toString());
            }
        }
    }
}
