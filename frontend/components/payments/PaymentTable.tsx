import type { PaymentRequest, PaymentStatus, Role } from '../../types/payment';
import { canResubmit, canReview } from '../../lib/payments';
import Icon from '../common/Icon';
export const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
export const statusLabel = (status: PaymentStatus) => status.replace('_', ' ');
export function Badge({ status }: { status: PaymentStatus }) { return <span className={`badge ${status.toLowerCase()}`}>{statusLabel(status)}</span>; }
export default function PaymentTable({ payments, role, onApprove, onReject, onEdit, busy, maxResubmissions }: { maxResubmissions: number; busy: boolean; payments: PaymentRequest[]; role: Role; onApprove: (id: string) => void; onReject: (payment: PaymentRequest) => void; onEdit: (payment: PaymentRequest) => void }) {
  return <div className="table-scroll"><table><thead><tr>{['ID', 'Vendor / Invoice', 'Amount', 'Purpose', 'Request date', 'Status', 'Resubmits', 'Actions'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>
    {payments.map(p => <tr key={p.req_id}><td className="request-id">{p.req_id}</td><td><strong>{p.vendor}</strong><small>{p.invoice_no}</small></td><td className="amount">{money(p.amount)}</td><td className="purpose">{p.purpose}</td><td className="nowrap">{p.request_date}</td><td><Badge status={p.status} /></td><td>{p.resubmit_count} / {maxResubmissions}</td><td>
      {canReview(role, p) ? <div className="row-actions"><button disabled={busy} className="approve" onClick={() => onApprove(p.req_id)}>Approve</button><button disabled={busy} className="reject" onClick={() => onReject(p)}>Reject</button></div> : canResubmit(role, p, maxResubmissions) ? <button disabled={busy} onClick={() => onEdit(p)}>Edit &amp; Resubmit</button> : <span className="muted">{p.status === 'Rejected' && p.resubmit_count >= maxResubmissions ? 'Final rejection' : '—'}</span>}
    </td></tr>)}
    {!payments.length && <tr><td colSpan={8}><div className="empty"><Icon name="search" size={30} /><strong>No matching requests</strong><span>Adjust your filters or clear them to see all requests.</span></div></td></tr>}
  </tbody></table></div>;
}
