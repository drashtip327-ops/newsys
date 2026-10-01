import type { AppState, PaymentInput } from '../types/payment';
import { apiRequest } from './api';
export const getSeed = () => apiRequest<AppState>('/payments/seed');
export const createPayment = (state: AppState, payment: PaymentInput) => apiRequest<AppState>('/payments', { state, payment });
export const approvePayment = (state: AppState, id: string) => apiRequest<AppState>(`/payments/${encodeURIComponent(id)}/approve`, { state });
export const rejectPayment = (state: AppState, id: string, comment: string) => apiRequest<AppState>(`/payments/${encodeURIComponent(id)}/reject`, { state, comment });
export const resubmitPayment = (state: AppState, id: string, payment: PaymentInput) => apiRequest<AppState>(`/payments/${encodeURIComponent(id)}/resubmit`, { state, payment });
