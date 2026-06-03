package com.roo.payment.domain.iasbse.service;

import com.roo.payment.domain.iasbse.entity.IasbseMember;
import com.roo.payment.domain.iasbse.repository.IasbseMemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
public class IasbseMemberServiceTest {

    @Autowired
    private IasbseMemberService iasbseMemberService;

    @Autowired
    private IasbseMemberRepository iasbseMemberRepository;

    @BeforeEach
    public void setUp() {
        iasbseMemberRepository.deleteAll();
        iasbseMemberRepository.save(new IasbseMember("1001", "Brindarica", "Bose"));
        iasbseMemberRepository.save(new IasbseMember("1002", "Jessa", "Brady"));
        iasbseMemberRepository.save(new IasbseMember("1003", "Firat", "Cicek"));
    }

    @Test
    public void testIsIasbseMember_exactMatch() {
        boolean result = iasbseMemberService.isIasbseMember("Brindarica", "Bose", "IABSE");
        assertThat(result).isTrue();
    }

    @Test
    public void testIsIasbseMember_caseInsensitive() {
        boolean result = iasbseMemberService.isIasbseMember("brindarica", "bose", "iabse");
        assertThat(result).isTrue();
    }

    @Test
    public void testIsIasbseMember_mismatch() {
        boolean result = iasbseMemberService.isIasbseMember("Brindarica", "NoMatch", "IABSE");
        assertThat(result).isFalse();
    }

    @Test
    public void testGetDistinctCompanies() {
        List<String> companies = iasbseMemberService.getDistinctCompanies();
        assertThat(companies).isEmpty();
    }

    @Test
    public void testIsIasbseMember_emptyCompanySeeded() {
        iasbseMemberRepository.save(new IasbseMember("1004", "Ming", "Chen"));
        boolean resultCustomCompany = iasbseMemberService.isIasbseMember("Ming", "Chen", "Tsinghua University");
        assertThat(resultCustomCompany).isTrue();
    }

    @Test
    public void testImportFromLocalFile() {
        String testExcelPath = "/Users/roor2i/Desktop/sw/conference-registration/docs/payment/2026-06-02 Members IABSE.xls";
        int imported = iasbseMemberService.importFromLocalFile(testExcelPath);
        
        System.out.println("=== TEST IMPORT DIAGNOSTICS ===");
        System.out.println("Service returned imported count: " + imported);
        System.out.println("Repository.count() after import: " + iasbseMemberRepository.count());
        System.out.println("==================================");
        
        // Sheet 0 has 1795 rows and Sheet 1 has 113 rows.
        // Total count should be at least greater than 1795.
        assertThat(imported).isGreaterThan(1795);
        
        // Assert that a member from sheet 0 is imported
        boolean hasAzmi = iasbseMemberService.isIasbseMember("AZMI", "ABDUL AZIZ", "");
        assertThat(hasAzmi).isTrue();
        
        // Assert that a member from sheet 1 (Fellow) is imported
        boolean hasFellow = iasbseMemberService.isIasbseMember("Scott Thomas", "Smith", "");
        assertThat(hasFellow).isTrue();
        
        boolean validFellowId = iasbseMemberService.isValidIabseId("66811267");
        assertThat(validFellowId).isTrue();
    }
}
