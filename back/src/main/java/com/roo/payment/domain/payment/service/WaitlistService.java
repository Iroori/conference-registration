package com.roo.payment.domain.payment.service;

import com.roo.payment.common.exception.BusinessException;
import com.roo.payment.common.exception.ErrorCode;
import com.roo.payment.config.AppProperties;
import com.roo.payment.domain.option.entity.ConferenceOption;
import com.roo.payment.domain.option.repository.ConferenceOptionRepository;
import com.roo.payment.domain.payment.dto.WaitlistEntryResponse;
import com.roo.payment.domain.payment.dto.WaitlistOfferResponse;
import com.roo.payment.domain.payment.dto.WaitlistOptionDetail;
import com.roo.payment.domain.payment.dto.WaitlistSummaryResponse;
import com.roo.payment.domain.payment.entity.OptionWaitlist;
import com.roo.payment.domain.payment.entity.OptionWaitlist.WaitlistStatus;
import com.roo.payment.domain.payment.repository.OptionWaitlistRepository;
import com.roo.payment.domain.user.entity.User;
import com.roo.payment.domain.user.repository.UserRepository;
import com.roo.payment.domain.user.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * 대기자(Waitlist) 오퍼 관리 서비스.
 *
 * 설계 원칙:
 *  - 오퍼 생성/조회 시 마감이 지난 OFFERED 건을 그 자리에서 EXPIRED 처리 (지연 만료, 배치 없음)
 *  - 잔여 좌석 = maxCapacity - currentCount - (미결제 OFFERED 오퍼 수량의 합).
 *    오퍼는 지정된 수량만큼 좌석을 예약한다.
 *  - 초과 오퍼(요청 수량 > 잔여)는 force=true 로 관리자가 명시적으로 승인해야 허용 → 수량 제한 없이 개방 가능
 *  - 정원 경합 방지를 위해 오퍼 확정 시 옵션 행에 비관적 락
 */
@Service
@Transactional(readOnly = true)
public class WaitlistService {

    private static final Logger log = LoggerFactory.getLogger(WaitlistService.class);
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final OptionWaitlistRepository waitlistRepository;
    private final ConferenceOptionRepository optionRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final AppProperties appProperties;

    public WaitlistService(OptionWaitlistRepository waitlistRepository,
                           ConferenceOptionRepository optionRepository,
                           UserRepository userRepository,
                           EmailService emailService,
                           AppProperties appProperties) {
        this.waitlistRepository = waitlistRepository;
        this.optionRepository = optionRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.appProperties = appProperties;
    }

    // ── 관리자 조회 ──────────────────────────────────────────────────────────

    /** 대기자가 존재하는 옵션별 요약. */
    @Transactional
    public List<WaitlistSummaryResponse> summary() {
        List<WaitlistSummaryResponse> result = new ArrayList<>();
        for (String optionId : waitlistRepository.findDistinctOptionIds()) {
            sweepExpired(optionId);
            ConferenceOption opt = optionRepository.findById(optionId).orElse(null);
            if (opt == null) continue;
            long waiting = waitlistRepository.countByOptionIdAndStatus(optionId, WaitlistStatus.WAITING);
            long offered = waitlistRepository.countByOptionIdAndStatus(optionId, WaitlistStatus.OFFERED);
            result.add(new WaitlistSummaryResponse(
                    optionId, opt.getNameEn(), opt.getMaxCapacity(), opt.getCurrentCount(),
                    availableSeats(opt), waiting, offered));
        }
        return result;
    }

    /** 옵션별 상세 — FIFO 대기자 목록 + 좌석 현황. */
    @Transactional
    public WaitlistOptionDetail listByOption(String optionId) {
        sweepExpired(optionId);
        ConferenceOption opt = optionRepository.findById(optionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.OPTION_NOT_FOUND));

        List<OptionWaitlist> entries = waitlistRepository.findByOptionIdWithUser(optionId);

        List<WaitlistEntryResponse> dtos = new ArrayList<>();
        int position = 0;
        for (OptionWaitlist w : entries) {
            position++;
            dtos.add(toEntryResponse(w, position));
        }
        return new WaitlistOptionDetail(optionId, opt.getNameEn(), opt.getMaxCapacity(),
                opt.getCurrentCount(), availableSeats(opt), opt.getPrice(), dtos);
    }

    // ── 관리자 오퍼 ──────────────────────────────────────────────────────────

    /**
     * 대기자에게 좌석 오퍼. WAITING/EXPIRED 대상만 가능.
     * 요청 수량이 잔여 좌석을 초과하면 force=true 여야 초과 오퍼가 허용된다 (수량 제한 없이 개방).
     */
    @Transactional
    public void offer(Long waitlistId, int quantity, boolean force) {
        int qty = Math.max(1, quantity);

        OptionWaitlist w = waitlistRepository.findById(waitlistId)
                .orElseThrow(() -> new BusinessException(ErrorCode.WAITLIST_NOT_FOUND));

        if (w.getStatus() != WaitlistStatus.WAITING && w.getStatus() != WaitlistStatus.EXPIRED) {
            throw new BusinessException(ErrorCode.WAITLIST_NOT_OFFERED,
                    "Only waiting entries can be offered.");
        }

        String optionId = w.getOption().getId();

        // 정원 경합 방지 — 옵션 행 락 후 잔여 계산
        ConferenceOption opt = optionRepository.findByIdForUpdate(optionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.OPTION_NOT_FOUND));
        sweepExpired(optionId);
        int available = availableSeats(opt);

        if (qty > available && !force) {
            log.info("[WAITLIST] Offer blocked (insufficient seats) — waitlistId={} optionId={} qty={} available={}",
                    waitlistId, optionId, qty, available);
            throw new BusinessException(ErrorCode.WAITLIST_CAPACITY_FULL);
        }

        LocalDateTime expiresAt = LocalDateTime.now()
                .plusHours(appProperties.getWaitlist().getOfferWindowHours());
        w.offer(expiresAt, qty);
        waitlistRepository.save(w);

        log.info("[WAITLIST] Offer sent — waitlistId={} optionId={} qty={} force={} expiresAt={}",
                waitlistId, optionId, qty, force, expiresAt);

        sendOfferEmail(w, expiresAt);
    }

    /**
     * 관리자 직접 오퍼 — 대기 신청 여부·등록 결제 이력과 무관하게, 회원가입한 유저에게
     * 특정 옵션 결제 권한을 바로 열어준다 (예: 실결제됐으나 DB 누락 건 보정).
     * 새 OptionWaitlist를 OFFERED 상태로 생성한다. payment는 null(직접 오퍼).
     */
    @Transactional
    public void grantAndOffer(String email, String optionId, int quantity, boolean force) {
        int qty = Math.max(1, quantity);

        User user = userRepository.findByEmailAndActiveTrue(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 정원 경합 방지 — 옵션 행 락 후 잔여 계산
        ConferenceOption opt = optionRepository.findByIdForUpdate(optionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.OPTION_NOT_FOUND));
        sweepExpired(optionId);
        int available = availableSeats(opt);
        if (qty > available && !force) {
            log.info("[WAITLIST] Direct grant blocked (insufficient seats) — optionId={} qty={} available={}",
                    optionId, qty, available);
            throw new BusinessException(ErrorCode.WAITLIST_CAPACITY_FULL);
        }

        OptionWaitlist w = new OptionWaitlist(user, opt);
        LocalDateTime expiresAt = LocalDateTime.now()
                .plusHours(appProperties.getWaitlist().getOfferWindowHours());
        w.offer(expiresAt, qty);
        waitlistRepository.save(w);

        log.info("[WAITLIST] Direct grant offered — optionId={} qty={} force={} expiresAt={}",
                optionId, qty, force, expiresAt);

        sendOfferEmail(w, expiresAt);
    }

    /** 오퍼 회수 — OFFERED를 다시 WAITING으로. */
    @Transactional
    public void revoke(Long waitlistId) {
        OptionWaitlist w = waitlistRepository.findById(waitlistId)
                .orElseThrow(() -> new BusinessException(ErrorCode.WAITLIST_NOT_FOUND));
        if (w.getStatus() == WaitlistStatus.OFFERED) {
            w.revokeToWaiting();
            waitlistRepository.save(w);
            log.info("[WAITLIST] Offer revoked — waitlistId={}", waitlistId);
        }
    }

    // ── 유저 조회 ──────────────────────────────────────────────────────────

    /** 로그인 유저가 받은 유효(미만료) 오퍼 목록. */
    @Transactional
    public List<WaitlistOfferResponse> myOffers(String email) {
        List<OptionWaitlist> offers = waitlistRepository.findByUserEmailAndStatus(email, WaitlistStatus.OFFERED);
        List<WaitlistOfferResponse> result = new ArrayList<>();
        for (OptionWaitlist w : offers) {
            if (w.isOfferExpired()) {
                w.expire();
                waitlistRepository.save(w);
                continue;
            }
            long price = w.getOption().getPrice();
            int qty = w.getOfferedQuantity();
            result.add(new WaitlistOfferResponse(
                    w.getId(), w.getOption().getId(), w.getOption().getNameEn(),
                    price, qty, price * qty,
                    w.getOfferExpiresAt() != null ? w.getOfferExpiresAt().format(FMT) : null));
        }
        return result;
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /** 특정 옵션의 마감 지난 OFFERED 건을 EXPIRED로 정리 (지연 만료). */
    private void sweepExpired(String optionId) {
        List<OptionWaitlist> offered = waitlistRepository
                .findByOptionIdAndStatusOrderByCreatedAtAsc(optionId, WaitlistStatus.OFFERED);
        for (OptionWaitlist w : offered) {
            if (w.isOfferExpired()) {
                w.expire();
                waitlistRepository.save(w);
                log.info("[WAITLIST] Offer expired (swept) — waitlistId={} optionId={}", w.getId(), optionId);
            }
        }
    }

    /** 잔여 좌석 = maxCapacity - currentCount - 미결제 오퍼 수량 합 (무제한이면 MAX_VALUE). */
    private int availableSeats(ConferenceOption opt) {
        if (opt.getMaxCapacity() == null) return Integer.MAX_VALUE;
        long reserved = waitlistRepository
                .sumOfferedQuantityByOptionIdAndStatus(opt.getId(), WaitlistStatus.OFFERED);
        return opt.getMaxCapacity() - opt.getCurrentCount() - (int) reserved;
    }

    private WaitlistEntryResponse toEntryResponse(OptionWaitlist w, int position) {
        User user = w.getUser();
        // 직접 오퍼(payment=null)는 연결된 등록 결제가 없으므로 "NONE"으로 표시
        String parentStatus = w.getPayment() != null ? w.getPayment().getStatus().name() : "NONE";
        return new WaitlistEntryResponse(
                w.getId(), position,
                user.getEmail(), user.getFullName(),
                w.getCreatedAt() != null ? w.getCreatedAt().format(FMT) : null,
                w.getStatus().name(),
                parentStatus,
                w.getOfferedQuantity(),
                w.getOfferedAt() != null ? w.getOfferedAt().format(FMT) : null,
                w.getOfferExpiresAt() != null ? w.getOfferExpiresAt().format(FMT) : null,
                w.isOfferExpired());
    }

    private void sendOfferEmail(OptionWaitlist w, LocalDateTime expiresAt) {
        try {
            User user = w.getUser();
            emailService.sendWaitlistOffer(
                    user.getEmail(), user.getFullName(),
                    w.getOption().getNameEn(), w.getOption().getPrice(), w.getOfferedQuantity(),
                    expiresAt.format(FMT));
        } catch (Exception e) {
            log.error("[WAITLIST] Offer email failed — waitlistId={} error={}", w.getId(), e.getMessage());
        }
    }
}
