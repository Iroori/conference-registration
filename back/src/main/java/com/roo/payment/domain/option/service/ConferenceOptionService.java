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
                .map(AdminConferenceOptionResponse::from)
                .toList();
    }
}
