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
        iasbseMemberRepository.save(new IasbseMember("Brindarica", "Bose", "IABSE", "Active"));
        iasbseMemberRepository.save(new IasbseMember("Jessa Lee", "Brady", "IABSE", "Active"));
        iasbseMemberRepository.save(new IasbseMember("Firat", "Cicek", "Stanford University", "Active"));
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
        boolean result = iasbseMemberService.isIasbseMember("Brindarica", "Bose", "Stanford University");
        assertThat(result).isFalse();
    }

    @Test
    public void testGetDistinctCompanies() {
        List<String> companies = iasbseMemberService.getDistinctCompanies();
        assertThat(companies).hasSize(2);
        assertThat(companies).containsExactly("IABSE", "Stanford University");
    }

    @Test
    public void testImportFromLocalFile() {
        String testExcelPath = "/Users/roor2i/Desktop/sw/conference-registration/docs/payment/2026-04-28 Members IABSE (1).xls";
        int imported = iasbseMemberService.importFromLocalFile(testExcelPath);
        
        System.out.println("=== TEST IMPORT DIAGNOSTICS ===");
        System.out.println("Service returned imported count: " + imported);
        System.out.println("Repository.count() after import: " + iasbseMemberRepository.count());
        System.out.println("==================================");
        
        assertThat(imported).isGreaterThan(0);
        
        // Check that some seeded data exists
        boolean hasBose = iasbseMemberService.isIasbseMember("Brindarica", "Bose", "IABSE");
        assertThat(hasBose).isTrue();
        
        List<String> companies = iasbseMemberService.getDistinctCompanies();
        assertThat(companies).contains("IABSE");
    }
}
