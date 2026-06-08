package com.roo.payment.domain.payment.repository;

import com.roo.payment.domain.payment.entity.DiscountCode;
import com.roo.payment.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DiscountCodeRepository extends JpaRepository<DiscountCode, Long> {
    Optional<DiscountCode> findByCode(String code);
    Optional<DiscountCode> findByCodeAndActiveTrue(String code);
    List<DiscountCode> findByUser(User user);
    boolean existsByCode(String code);
}
