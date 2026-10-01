import type { AuditLog, PaymentRequest, Role } from './payment.types';
import { canResubmit, canReview } from './payment-utils';
export interface Filters {
  search: string; status: string; vendor: string; dateFrom: string; dateTo: string;
  minAmount: string; maxAmount: string; attempts: string; actionable: boolean;
  role: string; fromStatus: string; sort: string;
}
export const emptyFilters: Filters = { search: '', status: '', vendor: '', dateFrom: '', dateTo: '', minAmount: '', maxAmount: '', attempts: '', actionable: false, role: '', fromStatus: '', sort: 'newest' };
export function filterError(f: Filters) {
  if (f.dateFrom && f.dateTo && f.dateFrom > f.dateTo) return 'The start date must be on or before the end date.';
  for (const value of [f.minAmount, f.maxAmount]) if (value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0)) return 'Amount filters must be zero or greater.';
  if (f.minAmount !== '' && f.maxAmount !== '' && Number(f.minAmount) > Number(f.maxAmount)) return 'Minimum amount must not exceed maximum amount.';
  return '';
}
function matchesDate(date: string, f: Filters) { return (!f.dateFrom || date >= f.dateFrom) && (!f.dateTo || date <= f.dateTo); }
export function localDate(timestamp: string) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function filterPayments(payments: PaymentRequest[], f: Filters, role: Role, maxResubmissions: number) {
  if (filterError(f)) return [];
  const search = f.search.trim().toLowerCase();
  return payments.filter(p =>
    (!f.status || p.status === f.status) && (!f.vendor || p.vendor === f.vendor) &&
    `${p.req_id} ${p.vendor} ${p.invoice_no} ${p.purpose}`.toLowerCase().includes(search) && matchesDate(p.request_date, f) &&
    (f.minAmount === '' || p.amount >= Number(f.minAmount)) && (f.maxAmount === '' || p.amount <= Number(f.maxAmount)) &&
    (!f.attempts || (f.attempts === 'first' ? p.resubmit_count === 0 : p.resubmit_count > 0)) &&
    (!f.actionable || canReview(role, p) || canResubmit(role, p, maxResubmissions))
  ).sort((a, b) => f.sort === 'amount-high' ? b.amount - a.amount : f.sort === 'amount-low' ? a.amount - b.amount : f.sort === 'oldest' ? a.request_date.localeCompare(b.request_date) || a.req_id.localeCompare(b.req_id) : b.request_date.localeCompare(a.request_date) || b.req_id.localeCompare(a.req_id));
}
export function filterAudit(logs: AuditLog[], payments: PaymentRequest[], f: Filters) {
  if (filterError(f)) return [];
  const paymentById = new Map(payments.map(p => [p.req_id, p]));
  const search = f.search.trim().toLowerCase();
  return logs.filter(log => {
    const p = paymentById.get(log.req_id);
    return (!f.status || log.to_status === f.status) && (!f.vendor || p?.vendor === f.vendor) &&
      (!f.role || log.role === f.role) && (!f.fromStatus || (f.fromStatus === 'Created' ? log.from_status === null : log.from_status === f.fromStatus)) &&
      matchesDate(localDate(log.timestamp), f) &&
      `${log.req_id} ${p?.vendor ?? ''} ${p?.invoice_no ?? ''} ${log.comment} ${log.role}`.toLowerCase().includes(search);
  }).sort((a, b) => f.sort === 'oldest' ? Date.parse(a.timestamp) - Date.parse(b.timestamp) : Date.parse(b.timestamp) - Date.parse(a.timestamp));
}
