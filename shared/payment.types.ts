export const statuses = ['Pending_Manager', 'Pending_MD', 'Approved', 'Rejected'] as const;
export type PaymentStatus = typeof statuses[number];
export type Role = 'Employee' | 'Manager' | 'MD';
export type Vendor = string;
export interface PaymentHistory {
  at: string; by_role: Role; from: PaymentStatus | null; to: PaymentStatus; comment: string;
}
export interface PaymentRequest {
  req_id: string; vendor: Vendor; invoice_no: string; amount: number; purpose: string;
  request_date: string; status: PaymentStatus; resubmit_count: number; history: PaymentHistory[];
}
export interface AuditLog {
  id: string; req_id: string; timestamp: string; role: Role;
  from_status: PaymentStatus | null; to_status: PaymentStatus; comment: string;
}
export type PaymentInput = Pick<PaymentRequest, 'vendor' | 'invoice_no' | 'amount' | 'purpose' | 'request_date'>;
export interface AppState { payments: PaymentRequest[]; auditLogs: AuditLog[] }
