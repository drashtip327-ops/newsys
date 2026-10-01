import type { AuditLog, PaymentRequest } from '../../types/payment';
import { Badge } from './PaymentTable';
import Icon from '../common/Icon';
export default function AuditTable({ logs, payments }: { logs: AuditLog[]; payments: PaymentRequest[] }) {
  const byId = new Map(payments.map(p => [p.req_id, p]));
  return <div className="table-scroll"><table><thead><tr>{['Date & time', 'Request / vendor', 'Action by', 'Status change', 'Comment'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>
    {logs.map(log => <tr key={log.id}>
      <td className="nowrap"><time dateTime={log.timestamp}>{new Date(log.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}<small>{new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</small></time></td>
      <td><span className="request-id">{log.req_id}</span><small>{byId.get(log.req_id)?.vendor ?? '—'}</small></td>
      <td><span className={`role-chip role-${log.role.toLowerCase()}`}>{log.role}</span></td>
      <td><div className="status-transition">{log.from_status ? <Badge status={log.from_status} /> : <span className="badge created">Created</span>}<Icon name="arrow" size={14} /><Badge status={log.to_status} /></div></td>
      <td className="audit-comment">{log.comment}</td>
    </tr>)}
    {!logs.length && <tr><td colSpan={5}><div className="empty"><Icon name="history" size={30} /><strong>No matching audit entries</strong><span>Try a different search or clear your filters.</span></div></td></tr>}
  </tbody></table></div>;
}
