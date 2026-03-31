package com.roo.payment.domain.payment.repository;

import com.roo.payment.domain.payment.entity.Payment;
import com.roo.payment.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByRegistrationNumber(String registrationNumber);

    @Query("SELECT p FROM Payment p JOIN FETCH p.selectedOptions WHERE p.user = :user ORDER BY p.createdAt DESC")
    List<Payment> findByUserWithOptions(@Param("user") User user);
}
