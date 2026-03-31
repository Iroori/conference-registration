package com.roo.payment.domain.iasbse.repository;

import com.roo.payment.domain.iasbse.entity.IasbseMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface IasbseMemberRepository extends JpaRepository<IasbseMember, Long> {

    Optional<IasbseMember> findByEmailAndActiveTrue(String email);

    boolean existsByEmailAndActiveTrue(String email);
}
