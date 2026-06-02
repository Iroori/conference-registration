package com.roo.payment.domain.iasbse.repository;

import com.roo.payment.domain.iasbse.entity.IasbseMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface IasbseMemberRepository extends JpaRepository<IasbseMember, Long> {

    boolean existsByIabseIdIgnoreCase(String iabseId);

    long countByIabseIdNotNull();

    boolean existsByFirstNameIgnoreCaseAndLastNameIgnoreCase(String firstName, String lastName);

    @Query("SELECT m FROM IasbseMember m WHERE " +
           "LOWER(m.iabseId) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(m.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(m.lastName) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<IasbseMember> searchMembers(String search);
}
