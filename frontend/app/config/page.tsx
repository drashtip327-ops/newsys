'use client';
import { useState, type FormEvent } from 'react';
import { useAuth } from '../../components/auth/AuthProvider';
import { apiRequest } from '../../lib/api';
import type { WorkflowConfig } from '../../../shared/access.types';
import Icon from '../../components/common/Icon';
function ConfigForm({ initial }: { initial: WorkflowConfig }) {
  const { refresh } = useAuth(); const [config, setConfig] = useState(initial);
  const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function save(e: FormEvent) { e.preventDefault(); setBusy(true); setError(''); setMessage(''); try { await apiRequest('/settings/config', config); await refresh(); setMessage('Configuration saved. It applies to the next payment action.'); } catch (e) { setError(e instanceof Error ? e.message : 'Save failed.'); } finally { setBusy(false); } }
  return <form className="payment-form" onSubmit={save}>
    <label>MD approval threshold (₹)<input type="number" min="0" max="1000000000" step="any" required value={Number.isNaN(config.mdApprovalThreshold) ? '' : config.mdApprovalThreshold} onChange={e => setConfig({ ...config, mdApprovalThreshold: e.target.value === '' ? NaN : Number(e.target.value) })} /></label>
    <label>Allowed resubmissions (fail/retry count)<input type="number" min="0" max="10" required value={Number.isNaN(config.maxResubmissions) ? '' : config.maxResubmissions} onChange={e => setConfig({ ...config, maxResubmissions: e.target.value === '' ? NaN : Number(e.target.value) })} /></label>
    <label>Minimum rejection comment length<input type="number" min="1" max="2000" required value={Number.isNaN(config.minRejectionCommentLength) ? '' : config.minRejectionCommentLength} onChange={e => setConfig({ ...config, minRejectionCommentLength: e.target.value === '' ? NaN : Number(e.target.value) })} /></label>
    <p className="muted">Amounts equal to the threshold do not need MD approval. Setting resubmissions to 0 disables retries. Existing statuses and history stay unchanged; changing the limit can make an existing rejected request eligible or ineligible.</p>
    {error && <p className="notice error" role="alert">{error}</p>}{message && <p className="notice success" role="status">{message}</p>}<button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save configuration'}</button>
  </form>;
}
export default function ConfigPage() { const { session } = useAuth(); return session ? <main className="settings-page"><p className="eyebrow">ADMINISTRATION / CONFIGURATION</p><h1>Workflow configuration</h1><p className="muted">Set the rules that guide every payment review.</p><section className="settings-card"><div className="settings-section-heading"><span className="panel-icon"><Icon name="settings" /></span><div><h2>Approval &amp; resubmission rules</h2><p>Changes apply to the next action. Existing history is preserved.</p></div><span className="role-chip role-md">MD only</span></div><ConfigForm initial={session.config} /></section></main> : null; }
