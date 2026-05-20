package com.roo.payment.domain.user.service;

import com.roo.payment.common.exception.BusinessException;
import com.roo.payment.common.exception.ErrorCode;
import com.roo.payment.domain.iasbse.entity.IasbseMember;
import com.roo.payment.domain.iasbse.repository.IasbseMemberRepository;
import com.roo.payment.domain.user.dto.AdminUserResponse;
import com.roo.payment.domain.user.entity.MemberType;
import com.roo.payment.domain.user.entity.User;
import com.roo.payment.domain.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class AdminUserService {

    private static final Logger log = LoggerFactory.getLogger(AdminUserService.class);

    private final UserRepository userRepository;
    private final IasbseMemberRepository iasbseMemberRepository;

    public AdminUserService(UserRepository userRepository, IasbseMemberRepository iasbseMemberRepository) {
        this.userRepository = userRepository;
        this.iasbseMemberRepository = iasbseMemberRepository;
    }

    /**
     * 전체 가입 유저 리스트 조회
     */
    public List<AdminUserResponse> getAllUsers() {
        log.info("[ADMIN] Request to fetch all registered users");
        return userRepository.findAll()
                .stream()
                .map(AdminUserResponse::from)
                .toList();
    }

    /**
     * 특정 유저의 회원 유형 수동 조정
     */
    @Transactional
    public void changeMemberType(Long userId, MemberType memberType) {
        log.info("[ADMIN] Changing memberType of userId={} to {}", userId, memberType);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        
        user.updateMemberType(memberType);
        userRepository.save(user);
    }

    /**
     * IABSE 엑셀 로드 정회원 전체 조회
     */
    public List<IasbseMember> getAllIasbseMembers() {
        log.info("[ADMIN] Request to fetch all IABSE members");
        return iasbseMemberRepository.findAll();
    }
}
