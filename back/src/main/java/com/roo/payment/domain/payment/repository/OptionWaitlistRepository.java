package com.roo.payment.domain.payment.repository;

import com.roo.payment.domain.payment.entity.OptionWaitlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OptionWaitlistRepository extends JpaRepository<OptionWaitlist, Long> {
    List<OptionWaitlist> findByPaymentId(Long paymentId);
    List<OptionWaitlist> findByOptionIdAndStatusOrderByCreatedAtAsc(String optionId, OptionWaitlist.WaitlistStatus status);
}
