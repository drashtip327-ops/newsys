'use client';
import { useState } from 'react';
import { usePayments } from '../../hooks/usePayments';
import { auditCsv, calculateSummary } from '../../lib/payments';
import { approvePayment, createPayment, rejectPayment, resubmitPayment } from '../../lib/payments-api';
import { statuses, type PaymentRequest, type PaymentInput } from '../../types/payment';
import { emptyFilters, filterPayments, filterAudit, type Filters } from '../../../shared/filters';
import Modal from '../common/Modal';
import Icon, { type IconName } from '../common/Icon';
import Pagination from '../common/Pagination';
import { useAuth } from '../auth/AuthProvider';
import PaymentForm from './PaymentForm';
import PaymentTable, { money, statusLabel } from './PaymentTable';
import AuditTable from './AuditTable';
import FilterBar from './FilterBar';

type Dialog = { kind: 'create' } | { kind: 'edit' | 'reject'; payment: PaymentRequest } | { kind: 'reset' } | null;
const statusIcons: IconName[] = ['clock', 'shield', 'check', 'close'];
export default function PaymentDashboard({ view = 'payments' }: { view?: 'payments' | 'audit' }) {
  const { state, warning, busy, commit, reset } = usePayments();
  const { session } = useAuth();
  const role = session!.user.role;
  const config = session!.config;
  const [filters, setFilters] = useState<Filters>({ ...emptyFilters });
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const close = () => { setDialog(null); setError(''); setComment(''); };
  const changeFilters = (next: Filters) => { setFilters(next); setPage(1); };
  const summary = state ? calculateSummary(state.payments) : null;
  const filtered = state ? filterPayments(state.payments, filters, role, config.maxResubmissions) : [];
  const logs = state ? filterAudit(state.auditLogs, state.payments, filters) : [];
  const total = view === 'payments' ? filtered.length : logs.length;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(total / size)));
  const start = (currentPage - 1) * size;
  async function approve(id: string) {
    try { await commit(s => approvePayment(s, id)); setMessage(`${id} approved by ${role}.`); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to approve request.'); }
  }
  async function submitPayment(input: PaymentInput) {
    if (dialog?.kind !== 'create' && dialog?.kind !== 'edit') return;
    await commit(s => dialog.kind === 'edit' ? resubmitPayment(s, dialog.payment.req_id, input) : createPayment(s, input));
    setMessage(dialog.kind === 'edit' ? 'Request resubmitted for Manager review.' : 'Request submitted for Manager review.');
    close();
  }
  function exportLogs() {
    const url = URL.createObjectURL(new Blob(['\uFEFF' + auditCsv(logs)], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = 'payment-audit-log.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(`Exported ${logs.length} matching audit entries, newest first.`);
  }
  return <main>
    <header className="page-heading"><div><p className="eyebrow">WORKSPACE / {view === 'payments' ? 'PAYMENTS' : 'ACTIVITY'}</p><h1>{view === 'payments' ? 'Payment requests' : 'Audit trail'}</h1><p className="muted">{view === 'payments' ? 'Manage requests and keep approvals moving.' : 'A clear record of every payment decision.'}</p></div><div className="header-actions">
      {view === 'payments' ? <><button className="subtle-button" disabled={!state || busy} onClick={() => setDialog({ kind: 'reset' })}><Icon name="reset" /> Reset data</button>{role === 'Employee' && <button disabled={!state || busy} className="primary" onClick={() => setDialog({ kind: 'create' })}><Icon name="plus" /> New request</button>}</> : <button className="primary" disabled={!logs.length} onClick={exportLogs}><Icon name="download" /> Export filtered CSV</button>}
    </div></header>
    {!state || !summary ? <div className="loading-card" role="status">Loading your workspace…</div> : <>
      <section className="summary" aria-label="Payment summary">{statuses.map((s, index) => <article className={`summary-card ${s.toLowerCase()}`} key={s}><div className="stat-heading"><span>{statusLabel(s)}</span><span className="stat-icon"><Icon name={statusIcons[index]} size={16} /></span></div><strong>{summary.counts[s]}</strong><small>payment requests</small></article>)}<article className="summary-card total"><div className="stat-heading"><span>Total pending</span><Icon name="clock" size={16} /></div><strong>{money(summary.pending)}</strong><small>Awaiting Manager or MD review</small></article><article className="summary-card total approved-total"><div className="stat-heading"><span>Total approved</span><Icon name="check" size={16} /></div><strong>{money(summary.approved)}</strong><small>All approved payments</small></article></section>
      {busy && <p role="status" className="notice">Saving your changes…</p>}{warning && <p className="notice warning" role="alert">{warning}</p>}{message && <p className="notice success dismissible" role="status"><span><Icon name="check" /> {message}</span><button aria-label="Dismiss notification" className="icon-button" onClick={() => setMessage('')}><Icon name="close" size={15} /></button></p>}{error && !dialog && <p className="notice error" role="alert">{error}</p>}
      <section className="panel"><div className="panel-top"><div className="panel-title"><span className="panel-icon"><Icon name={view === 'payments' ? 'document' : 'history'} /></span><div><h2>{view === 'payments' ? 'All requests' : 'Activity log'} <span className="count-pill">{view === 'payments' ? state.payments.length : state.auditLogs.length}</span></h2><p>{view === 'payments' ? 'Search, review, and track your payment requests.' : 'Filter the history by vendor, actor, status, or event date.'}</p></div></div><span className="local-tag"><span /> {view === 'payments' ? `${role} workspace` : 'Recorded transitions'}</span></div>
        <FilterBar view={view} filters={filters} onChange={changeFilters} />
        {view === 'payments' ? <PaymentTable maxResubmissions={config.maxResubmissions} busy={busy} payments={filtered.slice(start, start + size)} role={role} onApprove={approve} onReject={payment => { setError(''); setDialog({ kind: 'reject', payment }); }} onEdit={payment => setDialog({ kind: 'edit', payment })} /> : <AuditTable logs={logs.slice(start, start + size)} payments={state.payments} />}
        <Pagination total={total} all={view === 'payments' ? state.payments.length : state.auditLogs.length} page={currentPage} size={size} onPage={setPage} onSize={value => { setSize(value); setPage(1); }} noun={view === 'payments' ? 'requests' : 'entries'} />
      </section>
      <div className="workspace-note"><Icon name="shield" size={16} /><span>{view === 'payments' ? <>MD approval applies above <strong>{money(config.mdApprovalThreshold)}</strong> · Up to {config.maxResubmissions} resubmission(s)</> : 'CSV exports include every matching entry, not just the current page.'}</span><span className="storage-note">Payments saved in this browser</span></div>
    </>}
    {dialog && state && <Modal title={dialog.kind === 'create' ? 'New payment request' : dialog.kind === 'edit' ? `Edit & resubmit ${dialog.payment.req_id}` : dialog.kind === 'reject' ? `Reject ${dialog.payment.req_id}` : 'Reset payment data?'} onClose={() => { if (!busy) close(); }}>
      {(dialog.kind === 'create' || dialog.kind === 'edit') && <PaymentForm maxResubmissions={config.maxResubmissions} busy={busy} payment={dialog.kind === 'edit' ? dialog.payment : undefined} payments={state.payments} onCancel={close} onSubmit={submitPayment} />}
      {dialog.kind === 'reject' && <form className="payment-form" onSubmit={async event => { event.preventDefault(); try { await commit(s => rejectPayment(s, dialog.payment.req_id, comment)); setMessage(`${dialog.payment.req_id} rejected.`); close(); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to reject request.'); } }}><p className="muted">Explain what needs to be corrected so the request can be reviewed.</p><label>Rejection comment<textarea autoFocus rows={4} value={comment} onChange={e => setComment(e.target.value)} aria-describedby="comment-help" placeholder="For example, the invoice amount does not match the purchase order." /></label><small id="comment-help">At least {config.minRejectionCommentLength} characters, excluding surrounding spaces.</small>{error && <p className="notice error" role="alert">{error}</p>}<div className="modal-actions"><button disabled={busy} type="button" onClick={close}>Cancel</button><button disabled={busy} className="danger" type="submit">Reject request</button></div></form>}
      {dialog.kind === 'reset' && <>{error && <p className="notice error" role="alert">{error}</p>}<p>This restores the original 10 requests and their audit history. Your locally created requests and decisions will be removed. Configuration and permissions stay as they are.</p><div className="modal-actions"><button disabled={busy} onClick={close}>Cancel</button><button disabled={busy} className="danger" onClick={async () => { try { await reset(); changeFilters({ ...emptyFilters }); setMessage('Original seed data restored.'); close(); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to reset data.'); } }}>Reset data</button></div></>}
    </Modal>}
  </main>;
}
