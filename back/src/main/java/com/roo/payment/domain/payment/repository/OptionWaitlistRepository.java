package com.roo.payment.domain.payment.repository;

import com.roo.payment.domain.payment.entity.OptionWaitlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OptionWaitlistRepository extends JpaRepository<OptionWaitlist, Long> {
    List<OptionWaitlist> findByPaymentId(Long paymentId);
    List<OptionWaitlist> findByOptionIdAndStatusOrderByCreatedAtAsc(String optionId, OptionWaitlist.WaitlistStatus status);

    /** 관리자 리스트 — 옵션별 전체 대기자 (유저 fetch, 결제는 LEFT JOIN — 직접 오퍼는 결제 null 가능, FIFO 정렬) */
    @Query("SELECT w FROM OptionWaitlist w JOIN FETCH w.user LEFT JOIN FETCH w.payment " +
           "WHERE w.option.id = :optionId ORDER BY w.createdAt ASC")
    List<OptionWaitlist> findByOptionIdWithUser(@Param("optionId") String optionId);

    /** 특정 옵션의 특정 상태 건수 (요약 표시용) */
    long countByOptionIdAndStatus(String optionId, OptionWaitlist.WaitlistStatus status);

    /** 특정 옵션의 특정 상태 오퍼 수량 합계 (예약 좌석 계산 — 건수 아닌 수량 합) */
    @Query("SELECT COALESCE(SUM(w.offeredQuantity), 0) FROM OptionWaitlist w " +
           "WHERE w.option.id = :optionId AND w.status = :status")
    long sumOfferedQuantityByOptionIdAndStatus(@Param("optionId") String optionId,
                                               @Param("status") OptionWaitlist.WaitlistStatus status);

    /** 대기자가 존재하는 옵션 ID 목록 (요약 화면용) */
    @Query("SELECT DISTINCT w.option.id FROM OptionWaitlist w")
    List<String> findDistinctOptionIds();

    /** 유저의 특정 상태 대기건 (옵션 fetch, 결제 LEFT JOIN — 직접 오퍼는 결제 null 가능) */
    @Query("SELECT w FROM OptionWaitlist w JOIN FETCH w.option LEFT JOIN FETCH w.payment " +
           "WHERE w.user.email = :email AND w.status = :status ORDER BY w.offerExpiresAt ASC")
    List<OptionWaitlist> findByUserEmailAndStatus(@Param("email") String email,
                                                  @Param("status") OptionWaitlist.WaitlistStatus status);

    /** WAITLIST 결제로 충족된 대기건 조회 (결제 삭제 시 되돌림) */
    Optional<OptionWaitlist> findByFulfilledPaymentId(Long fulfilledPaymentId);
}
