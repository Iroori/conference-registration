package com.roo.payment.domain.payment.repository;

import com.roo.payment.domain.payment.entity.Payment;
import com.roo.payment.domain.payment.entity.PaymentStatus;
import com.roo.payment.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByRegistrationNumber(String registrationNumber);

    @Query("SELECT p FROM Payment p JOIN FETCH p.selectedOptions WHERE p.user = :user ORDER BY p.createdAt DESC")
    List<Payment> findByUserWithOptions(@Param("user") User user);

    /** 중복 결제 방지: 특정 사용자가 이미 해당 상태의 결제를 보유하는지 확인 */
    boolean existsByUserAndStatus(User user, PaymentStatus status);

    /** PENDING 상태 정리 스케줄러 — 특정 시각 이전에 생성된 PENDING 결제 조회 */
    List<Payment> findByStatusAndCreatedAtBefore(PaymentStatus status, LocalDateTime before);

    /** 어드민 페이징 조회 및 N+1 방지 */
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"user"})
    org.springframework.data.domain.Page<Payment> findAll(org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"user"})
    @Query("SELECT p FROM Payment p WHERE " +
           "LOWER(p.registrationNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.user.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.user.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.user.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.user.affiliation) LIKE LOWER(CONCAT('%', :search, '%'))")
    org.springframework.data.domain.Page<Payment> searchPayments(@Param("search") String search, org.springframework.data.domain.Pageable pageable);

    /** 관리자 전체 결제 조회 (selectedOptions fetch join) */
    @Query("SELECT p FROM Payment p JOIN FETCH p.selectedOptions ORDER BY p.createdAt DESC")
    List<Payment> findAllWithOptions();
}
