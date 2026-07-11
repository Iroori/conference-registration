import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiFetchOptions,
  apiInitiatePayment,
  apiCompletePayment,
  apiFetchMyPayments,
  apiFetchRegistrationPeriods,
} from '../lib/api';
import type { MemberType, PaymentRequest, CompletePaymentRequest } from '../types';

export const QUERY_KEYS = {
  options: (memberType: MemberType) => ['options', memberType] as const,
  paymentHistory: ['payments', 'me'] as const,
  registrationPeriods: ['config', 'registration-periods'] as const,
};

export const useRegistrationPeriods = () =>
  useQuery({
    queryKey: QUERY_KEYS.registrationPeriods,
    queryFn: apiFetchRegistrationPeriods,
    staleTime: 10 * 60 * 1000,
  });

export const useConferenceOptions = (memberType: MemberType | null) =>
  useQuery({
    queryKey: QUERY_KEYS.options(memberType ?? 'NON_MEMBER'),
    queryFn: () => apiFetchOptions(memberType ?? 'NON_MEMBER'),
    enabled: memberType !== null,
    staleTime: 5 * 60 * 1000,
  });

export const useInitiatePayment = () => {
  return useMutation({
    mutationFn: (req: PaymentRequest) => apiInitiatePayment(req),
  });
};

export const useCompletePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: CompletePaymentRequest) => apiCompletePayment(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.paymentHistory });
    },
  });
};

export const usePaymentHistory = () =>
  useQuery({
    queryKey: QUERY_KEYS.paymentHistory,
    queryFn: apiFetchMyPayments,
    staleTime: 60 * 1000,
  });
