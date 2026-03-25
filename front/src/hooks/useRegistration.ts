import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiVerifyMember,
  apiFetchOptions,
  apiCalculatePricing,
  apiSubmitPayment,
  apiFetchPaymentHistory,
  apiCancelPayment,
} from '../lib/api';
import type {
  MemberVerifyRequest,
  MemberType,
  PaymentRequest,
  CancelRequest,
} from '../types';

export const QUERY_KEYS = {
  memberVerify: (email: string) => ['member', 'verify', email] as const,
  options: (memberType: MemberType) => ['options', memberType] as const,
  pricing: (memberType: MemberType, optionIds: string[]) =>
    ['pricing', memberType, ...optionIds.sort()] as const,
  paymentHistory: ['payments', 'history'] as const,
};

export const useVerifyMember = () => {
  return useMutation({
    mutationFn: (req: MemberVerifyRequest) => apiVerifyMember(req),
  });
};

export const useConferenceOptions = (memberType: MemberType | null) => {
  return useQuery({
    queryKey: QUERY_KEYS.options(memberType ?? 'NON_MEMBER'),
    queryFn: () => apiFetchOptions(memberType ?? 'NON_MEMBER'),
    enabled: memberType !== null,
    staleTime: 1000 * 60 * 5,
  });
};

export const usePricing = (
  memberType: MemberType | null,
  selectedOptionIds: string[],
  enabled: boolean
) => {
  return useQuery({
    queryKey: QUERY_KEYS.pricing(memberType ?? 'NON_MEMBER', selectedOptionIds),
    queryFn: () => apiCalculatePricing(memberType ?? 'NON_MEMBER', selectedOptionIds),
    enabled: enabled && memberType !== null && selectedOptionIds.length > 0,
    staleTime: 0,
  });
};

export const useSubmitPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: PaymentRequest) => apiSubmitPayment(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.paymentHistory });
    },
  });
};

export const usePaymentHistory = () => {
  return useQuery({
    queryKey: QUERY_KEYS.paymentHistory,
    queryFn: () => apiFetchPaymentHistory(),
    staleTime: 1000 * 60,
  });
};

export const useCancelPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: CancelRequest) => apiCancelPayment(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.paymentHistory });
    },
  });
};
