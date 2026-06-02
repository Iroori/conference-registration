package com.roo.payment.domain.option.service;

import com.roo.payment.domain.option.dto.AdminConferenceOptionResponse;
import com.roo.payment.domain.option.dto.ConferenceOptionResponse;
import com.roo.payment.domain.option.repository.ConferenceOptionRepository;
import com.roo.payment.domain.user.entity.MemberType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class ConferenceOptionService {

    private final ConferenceOptionRepository optionRepository;

    public ConferenceOptionService(ConferenceOptionRepository optionRepository) {
        this.optionRepository = optionRepository;
    }

    /**
     * 회원 유형에 맞는 컨퍼런스 옵션 목록 조회
     */
    public List<ConferenceOptionResponse> getOptions(MemberType memberType) {
        return optionRepository.findActiveByMemberType(memberType)
                .stream()
                .map(ConferenceOptionResponse::from)
                .toList();
    }

    /** 관리자용 전체 옵션 조회 — 잔여 좌석 포함 */
    public List<AdminConferenceOptionResponse> getAllOptionsForAdmin() {
        return optionRepository.findAll().stream()
                .filter(com.roo.payment.domain.option.entity.ConferenceOption::isActive)
                .map(AdminConferenceOptionResponse::from)
                .toList();
    }

    @Transactional
    public void updateOptionCapacity(String optionId, Integer newCapacity) {
        com.roo.payment.domain.option.entity.ConferenceOption option = optionRepository.findById(optionId)
                .orElseThrow(() -> new com.roo.payment.common.exception.BusinessException(com.roo.payment.common.exception.ErrorCode.OPTION_NOT_FOUND));

        if (newCapacity != null && newCapacity < option.getCurrentCount()) {
            throw new com.roo.payment.common.exception.BusinessException(com.roo.payment.common.exception.ErrorCode.INVALID_INPUT,
                    "New capacity cannot be less than the current count of sold tickets.");
        }
        option.updateMaxCapacity(newCapacity);
        optionRepository.save(option);
    }
}
