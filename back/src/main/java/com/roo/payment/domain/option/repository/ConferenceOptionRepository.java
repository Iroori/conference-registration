package com.roo.payment.domain.option.repository;

import com.roo.payment.domain.option.entity.ConferenceOption;
import com.roo.payment.domain.user.entity.MemberType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConferenceOptionRepository extends JpaRepository<ConferenceOption, String> {

    /**
     * 정원 경합 방지를 위한 비관적 락 조회.
     * 대기자 오퍼 생성 시 잔여 좌석을 안전하게 계산·확정하는 데 사용.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM ConferenceOption o WHERE o.id = :id")
    Optional<ConferenceOption> findByIdForUpdate(@Param("id") String id);

    /**
     * 회원 유형에 따른 활성 옵션 조회
     * - allowedMemberType이 null(모든 유형 허용) 또는 해당 유형과 일치하는 옵션
     */
    @Query("SELECT o FROM ConferenceOption o WHERE o.active = true " +
           "AND (o.allowedMemberType IS NULL OR o.allowedMemberType = :memberType) " +
           "ORDER BY o.category, o.id")
    List<ConferenceOption> findActiveByMemberType(@Param("memberType") MemberType memberType);
}
