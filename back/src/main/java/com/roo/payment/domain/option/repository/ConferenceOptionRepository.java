package com.roo.payment.domain.option.repository;

import com.roo.payment.domain.option.entity.ConferenceOption;
import com.roo.payment.domain.user.entity.MemberType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ConferenceOptionRepository extends JpaRepository<ConferenceOption, String> {

    /**
     * 회원 유형에 따른 활성 옵션 조회
     * - allowedMemberType이 null(모든 유형 허용) 또는 해당 유형과 일치하는 옵션
     */
    @Query("SELECT o FROM ConferenceOption o WHERE o.active = true " +
           "AND (o.allowedMemberType IS NULL OR o.allowedMemberType = :memberType) " +
           "ORDER BY o.category, o.id")
    List<ConferenceOption> findActiveByMemberType(@Param("memberType") MemberType memberType);
}
