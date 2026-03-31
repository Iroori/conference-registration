import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiFetchOptions,
  apiCreatePayment,
  apiFetchMyPayments,
  apiCancelPayment,
} from '../lib/api';
import type { MemberType, PaymentRequest, CancelRequest } from '../types';

export const QUERY_KEYS = {
  options: (memberType: MemberType) => ['options', memberType] as const,
  paymentHistory: ['payments', 'me'] as const,
};

export const useConferenceOptions = (memberType: MemberType | null) =>
  useQuery({
    queryKey: QUERY_KEYS.options(memberType ?? 'NON_MEMBER'),
    queryFn: () => apiFetchOptions(memberType ?? 'NON_MEMBER'),
    enabled: memberType !== null,
    staleTime: 5 * 60 * 1000,
  });

export const useCreatePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: PaymentRequest) => apiCreatePayment(req),
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

export const useCancelPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: CancelRequest) => apiCancelPayment(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.paymentHistory });
    },
  });
};
