package com.roo.payment.domain.user.service;

import com.roo.payment.common.exception.BusinessException;
import com.roo.payment.common.exception.ErrorCode;
import com.roo.payment.domain.iasbse.dto.AddIasbseMemberRequest;
import com.roo.payment.domain.iasbse.entity.IasbseMember;
import com.roo.payment.domain.iasbse.repository.IasbseMemberRepository;
import com.roo.payment.domain.payment.entity.OptionWaitlist;
import com.roo.payment.domain.payment.entity.Payment;
import com.roo.payment.domain.payment.entity.PaymentStatus;
import com.roo.payment.domain.payment.entity.PaymentType;
import com.roo.payment.domain.payment.repository.OptionWaitlistRepository;
import com.roo.payment.domain.payment.repository.PaymentRepository;
import com.roo.payment.domain.user.dto.AdminUserResponse;
import com.roo.payment.domain.user.dto.PaginatedUserResponse;
import com.roo.payment.domain.user.entity.MemberType;
import com.roo.payment.domain.user.entity.User;
import com.roo.payment.domain.user.repository.EmailVerificationRepository;
import com.roo.payment.domain.user.repository.RefreshTokenRepository;
import com.roo.payment.domain.user.repository.UserRepository;
import com.roo.payment.security.SecurityAuditService;
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
    private final PaymentRepository paymentRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final OptionWaitlistRepository optionWaitlistRepository;
    private final SecurityAuditService auditService;

    public AdminUserService(UserRepository userRepository,
                            IasbseMemberRepository iasbseMemberRepository,
                            PaymentRepository paymentRepository,
                            RefreshTokenRepository refreshTokenRepository,
                            EmailVerificationRepository emailVerificationRepository,
                            OptionWaitlistRepository optionWaitlistRepository,
                            SecurityAuditService auditService) {
        this.userRepository = userRepository;
        this.iasbseMemberRepository = iasbseMemberRepository;
        this.paymentRepository = paymentRepository;
        this.optionWaitlistRepository = optionWaitlistRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.emailVerificationRepository = emailVerificationRepository;
        this.auditService = auditService;
    }

    /**
     * 가입 유저 리스트 페이징 및 검색 조회
     */
    public PaginatedUserResponse getPaginatedUsers(int page, int size, String search) {
        log.info("[ADMIN] Request to fetch paginated users — page={}, size={}, search={}", page, size, search);
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        org.springframework.data.domain.Page<User> userPage;

        if (search == null || search.trim().isEmpty()) {
            userPage = userRepository.findByActiveTrue(pageable);
        } else {
            userPage = userRepository.searchActiveUsers(search.trim(), pageable);
        }

        List<AdminUserResponse> userList = userPage.getContent().stream()
                .map(AdminUserResponse::from)
                .toList();

        return new PaginatedUserResponse(
                userList,
                userPage.getTotalElements(),
                userPage.getTotalPages(),
                userPage.getNumber(),
                userPage.getSize()
        );
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
        return getAllIasbseMembers(null);
    }

    /**
     * IABSE 엑셀 로드 정회원 조회 및 검색
     */
    public List<IasbseMember> getAllIasbseMembers(String search) {
        log.info("[ADMIN] Request to fetch all IABSE members with search={}", search);
        if (search == null || search.trim().isEmpty()) {
            return iasbseMemberRepository.findAll();
        }
        return iasbseMemberRepository.searchMembers(search.trim());
    }

    /**
     * 회원 및 관련 정보 강제 삭제 (결제 연쇄 제거 & 티켓 정원 복원)
     */
    @Transactional
    public void deleteUser(Long userId) {
        log.info("[ADMIN] Deleting user with id={}", userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (user.isAdmin()) {
            throw new BusinessException(ErrorCode.ADMIN_CANNOT_BE_DELETED);
        }

        String userEmail = user.getEmail();

        // 1. 유저의 결제 내역 조회 및 연쇄 삭제 + 티켓 정원 복원
        List<Payment> payments = paymentRepository.findByUserWithOptions(user);
        for (Payment payment : payments) {
            log.info("[ADMIN] Deleting payment regNo={} for userEmail={}", payment.getRegistrationNumber(), userEmail);

            // COMPLETED 상태인 결제에 대해서만 옵션 티켓 복원
            if (payment.getStatus() == PaymentStatus.COMPLETED) {
                if (payment.getPaymentType() == PaymentType.WAITLIST) {
                    // WAITLIST 결제 — 오퍼 수량만큼 복원하고 대기건을 다시 대기열로 되돌림
                    optionWaitlistRepository.findByFulfilledPaymentId(payment.getId()).ifPresent(w -> {
                        w.getOption().decreaseCount(w.getOfferedQuantity());
                        w.revertFulfillment();
                        optionWaitlistRepository.save(w);
                        log.info("[ADMIN] Reverted waitlist fulfillment id={} for userEmail={}", w.getId(), userEmail);
                    });
                } else {
                    payment.getSelectedOptions().forEach(o -> {
                        o.decreaseCount();
                        log.info("[ADMIN] Decreased count of option={} for userEmail={}", o.getNameEn(), userEmail);
                    });
                }
            }

            // 이 결제에 매달린 대기자(intake) 행 삭제 — option_waitlists.payment_id FK 무결성 보장
            List<OptionWaitlist> intakeWaitlists = optionWaitlistRepository.findByPaymentId(payment.getId());
            if (!intakeWaitlists.isEmpty()) {
                optionWaitlistRepository.deleteAll(intakeWaitlists);
                log.info("[ADMIN] Deleted {} waitlist intake row(s) for payment regNo={}", intakeWaitlists.size(), payment.getRegistrationNumber());
            }

            // ManyToMany payment_options 조인테이블 데이터 관계 해제
            payment.getSelectedOptions().clear();

            // Payment 삭제 (AccompanyingPerson은 cascade ALL로 자동 orphanRemoval 처리됨)
            paymentRepository.delete(payment);
        }

        // 2. 유저에게 남은 대기자/오퍼 행 삭제 (관리자 직접 오퍼 등 결제 없이 user_id만 연결된 행 포함)
        //    — option_waitlists.user_id FK 무결성 보장 (하드 딜리트 시 500 에러 원인)
        List<OptionWaitlist> remainingWaitlists = optionWaitlistRepository.findByUserId(userId);
        if (!remainingWaitlists.isEmpty()) {
            optionWaitlistRepository.deleteAll(remainingWaitlists);
            log.info("[ADMIN] Deleted {} remaining waitlist row(s) for userId={}", remainingWaitlists.size(), userId);
        }

        // 3. 리프레시 토큰 청소
        refreshTokenRepository.deleteByUserEmail(userEmail);
        log.info("[ADMIN] Deleted refresh tokens for userEmail={}", userEmail);

        // 4. 이메일 인증 내역 청소
        emailVerificationRepository.deleteByEmail(userEmail);
        log.info("[ADMIN] Deleted email verifications for userEmail={}", userEmail);

        // 5. 유저 하드 딜리트
        userRepository.delete(user);
        log.info("[ADMIN] Hard deleted user account id={}, userEmail={}", userId, userEmail);

        // 6. 감사 로그 작성
        String deletedRegs = payments.stream()
                .map(Payment::getRegistrationNumber)
                .collect(java.util.stream.Collectors.joining(", "));
        auditService.log("USER_DELETED_BY_ADMIN", userEmail, 
                String.format("Deleted user id=%d, removed payments=[%s]", userId, deletedRegs));
    }

    /**
     * IABSE 회원 수기 추가
     */
    @Transactional
    public IasbseMember addIasbseMember(AddIasbseMemberRequest request) {
        log.info("[ADMIN] Request to add manual IABSE member: {}", request);
        if (iasbseMemberRepository.existsByIabseIdIgnoreCase(request.iabseId())) {
            throw new BusinessException(ErrorCode.IABSE_ID_ALREADY_EXISTS);
        }
        IasbseMember member = new IasbseMember(request.iabseId(), request.firstName(), request.lastName());
        return iasbseMemberRepository.save(member);
    }

    /**
     * IABSE 회원 수기 삭제
     */
    @Transactional
    public void deleteIasbseMember(Long id) {
        log.info("[ADMIN] Request to delete manual IABSE member: id={}", id);
        if (!iasbseMemberRepository.existsById(id)) {
            throw new BusinessException(ErrorCode.IABSE_MEMBER_NOT_FOUND);
        }
        iasbseMemberRepository.deleteById(id);
    }
}
