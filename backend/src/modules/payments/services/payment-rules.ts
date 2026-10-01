import type { AppState, AuditLog, PaymentInput, PaymentRequest, PaymentStatus, Role } from '../../../../../shared/payment.types';
import { vendors, today, canReview, canResubmit } from '../../../../../shared/payment-utils';
import { defaultConfig, type WorkflowConfig } from '../../../../../shared/access.types';
export function validatePayment(input: PaymentInput): PaymentInput {
  if (!vendors.includes(input.vendor)) throw new Error('Vendor must be selected from the vendor list.');
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('Amount must be greater than 0.');
  if (!input.purpose.trim()) throw new Error('Purpose is required.');
  if (!input.invoice_no.trim()) throw new Error('Invoice number is required.');
  const parsed = new Date(`${input.request_date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.request_date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== input.request_date) throw new Error('A valid request date is required.');
  if (input.request_date > today()) throw new Error('Request date cannot be in the future.');
  return { ...input, purpose: input.purpose.trim(), invoice_no: input.invoice_no.trim() };
}
export function createAuditLog(req_id: string, role: Role, from_status: PaymentStatus | null, to_status: PaymentStatus, comment: string): AuditLog {
  return { id: crypto.randomUUID(), req_id, timestamp: new Date().toISOString(), role, from_status, to_status, comment };
}
function getPayment(state: AppState, id: string) {
  const payment = state.payments.find(p => p.req_id === id);
  if (!payment) throw new Error('Payment request was not found.');
  return payment;
}
function transition(state: AppState, payment: PaymentRequest, role: Role, status: PaymentStatus, comment: string, from: PaymentStatus | null): AppState {
  const log = createAuditLog(payment.req_id, role, from, status, comment);
  const updated = { ...payment, status, history: [...payment.history, { at: log.timestamp, by_role: role, from, to: status, comment }] };
  return {
    payments: state.payments.some(p => p.req_id === payment.req_id) ? state.payments.map(p => p.req_id === payment.req_id ? updated : p) : [...state.payments, updated],
    auditLogs: [log, ...state.auditLogs],
  };
}
export function createPayment(state: AppState, role: Role, input: PaymentInput) {
  if (role !== 'Employee') throw new Error('You are not authorized to perform this action.');
  const fields = validatePayment(input);
  const next = Math.max(0, ...state.payments.map(p => Number(p.req_id.replace('PR-', '')) || 0)) + 1;
  const payment: PaymentRequest = { ...fields, req_id: `PR-${String(next).padStart(3, '0')}`, status: 'Pending_Manager', resubmit_count: 0, history: [] };
  return transition(state, payment, role, 'Pending_Manager', 'Payment request created', null);
}
export function approvePayment(state: AppState, role: Role, id: string, config: WorkflowConfig = defaultConfig) {
  const p = getPayment(state, id);
  if (!canReview(role, p)) throw new Error('You are not authorized to perform this action.');
  return transition(state, p, role, role === 'Manager' && p.amount > config.mdApprovalThreshold ? 'Pending_MD' : 'Approved', `Approved by ${role}`, p.status);
}
export function rejectPayment(state: AppState, role: Role, id: string, comment: string, config: WorkflowConfig = defaultConfig) {
  const p = getPayment(state, id);
  if (!canReview(role, p)) throw new Error('You are not authorized to perform this action.');
  if (comment.trim().length < config.minRejectionCommentLength) throw new Error(`Rejection comment must be at least ${config.minRejectionCommentLength} characters.`);
  return transition(state, p, role, 'Rejected', comment.trim(), p.status);
}
export function resubmitPayment(state: AppState, role: Role, id: string, input: PaymentInput, config: WorkflowConfig = defaultConfig) {
  const p = getPayment(state, id);
  if (role !== 'Employee') throw new Error('You are not authorized to perform this action.');
  if (!canResubmit(role, p, config.maxResubmissions)) throw new Error('You cannot resubmit this request again.');
  return transition(state, { ...p, ...validatePayment(input), resubmit_count: p.resubmit_count + 1 }, role, 'Pending_Manager', 'Edited and resubmitted by Employee', 'Rejected');
}
