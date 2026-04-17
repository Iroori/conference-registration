package com.roo.payment.domain.config.dto;

import com.roo.payment.config.AppProperties;

public record RegistrationPeriodsResponse(
        TierPeriod preRegistration,
        TierPeriod earlyBird,
        TierPeriod regular
) {
    public record TierPeriod(String startDate, String endDate) {
        static TierPeriod of(AppProperties.Registration.Tier t) {
            return new TierPeriod(t.getStartDate(), t.getEndDate());
        }
    }

    public static RegistrationPeriodsResponse from(AppProperties.Registration reg) {
        return new RegistrationPeriodsResponse(
                TierPeriod.of(reg.getPreRegistration()),
                TierPeriod.of(reg.getEarlyBird()),
                TierPeriod.of(reg.getRegular())
        );
    }
}
