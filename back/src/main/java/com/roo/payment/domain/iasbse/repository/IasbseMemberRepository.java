package com.roo.payment.domain.iasbse.repository;

import com.roo.payment.domain.iasbse.entity.IasbseMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface IasbseMemberRepository extends JpaRepository<IasbseMember, Long> {

    boolean existsByFirstNameIgnoreCaseAndLastNameIgnoreCaseAndCompanyIgnoreCase(String firstName, String lastName, String company);

    @Query("SELECT m.company FROM IasbseMember m WHERE m.company IS NOT NULL AND m.company != '' GROUP BY m.company ORDER BY m.company ASC")
    List<String> findDistinctCompanies();
}
