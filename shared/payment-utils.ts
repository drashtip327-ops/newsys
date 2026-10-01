import seed from '../Section5_Seed_Data.json';
import { statuses, type AppState, type AuditLog, type PaymentRequest, type PaymentStatus, type Role } from './payment.types';

export const vendors = seed.vendors;
export const threshold = seed.md_approval_threshold;
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function createSeedState(): AppState {
  const payments = structuredClone(seed.requests) as PaymentRequest[];
  const auditLogs = payments.flatMap(p => p.history.map((h, i) => ({
    id: `${p.req_id}-seed-${i}`, req_id: p.req_id,
    // Seed timestamps have no timezone; interpret them as local wall-clock time.
    timestamp: new Date(h.at.replace(' ', 'T')).toISOString(), role: h.by_role,
    from_status: h.from, to_status: h.to, comment: h.comment,
  })));
  return { payments, auditLogs };
}
export function canReview(role: Role, payment: PaymentRequest) {
  return (role === 'Manager' && payment.status === 'Pending_Manager') || (role === 'MD' && payment.status === 'Pending_MD');
}
export function canResubmit(role: Role, payment: PaymentRequest, maxResubmissions = 1) {
  return role === 'Employee' && payment.status === 'Rejected' && payment.resubmit_count < maxResubmissions;
}
export function calculateSummary(payments: PaymentRequest[]) {
  const counts = { Pending_Manager: 0, Pending_MD: 0, Approved: 0, Rejected: 0 };
  let pending = 0, approved = 0;
  for (const p of payments) {
    counts[p.status]++;
    if (p.status === 'Pending_Manager' || p.status === 'Pending_MD') pending += p.amount;
    if (p.status === 'Approved') approved += p.amount;
  }
  return { counts, pending, approved };
}
export function duplicateInvoice(payments: PaymentRequest[], invoice: string, excludeId?: string) {
  return invoice.trim() !== '' && payments.some(p => p.req_id !== excludeId && p.invoice_no.trim().toLowerCase() === invoice.trim().toLowerCase());
}
export function newestLogs(logs: AuditLog[]) {
  return [...logs].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}
export function auditCsv(logs: AuditLog[]) {
  const escape = (value: string) => `"${(/^[=+\-@\t\r]/.test(value) ? "'" : '') + value.replaceAll('"', '""')}"`;
  return ['timestamp,role,from_status,to_status,comment', ...newestLogs(logs).map(l => [l.timestamp, l.role, l.from_status ?? '', l.to_status, l.comment].map(escape).join(','))].join('\r\n');
}
// Validate persisted data before it reaches the UI. This is integrity checking, not authentication.
export function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') return false;
  const s = value as AppState;
  const validStatus = (v: unknown) => statuses.includes(v as PaymentStatus);
  const validRole = (v: unknown) => ['Employee', 'Manager', 'MD'].includes(v as string);
  return Array.isArray(s.payments) && Array.isArray(s.auditLogs) &&
    s.payments.every(p => p && typeof p.req_id === 'string' && vendors.includes(p.vendor) && Number.isFinite(p.amount) && p.amount > 0 && typeof p.purpose === 'string' && typeof p.invoice_no === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.request_date) && validStatus(p.status) && Number.isInteger(p.resubmit_count) && p.resubmit_count >= 0 && Array.isArray(p.history) && p.history.every(h => h && typeof h.at === 'string' && validRole(h.by_role) && (h.from === null || validStatus(h.from)) && validStatus(h.to) && typeof h.comment === 'string')) &&
    new Set(s.payments.map(p => p.req_id)).size === s.payments.length &&
    s.auditLogs.every(l => l && typeof l.id === 'string' && s.payments.some(p => p.req_id === l.req_id) && Number.isFinite(Date.parse(l.timestamp)) && validRole(l.role) && (l.from_status === null || validStatus(l.from_status)) && validStatus(l.to_status) && typeof l.comment === 'string');
}
