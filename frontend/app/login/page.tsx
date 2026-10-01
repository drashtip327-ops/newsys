'use client';
import { useState, type FormEvent } from 'react';
import { useAuth } from '../../components/auth/AuthProvider';
import Icon from '../../components/common/Icon';
export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('employee'); const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { await login(username, password); } catch (e) { setError(e instanceof Error ? e.message : 'Login failed.'); } finally { setBusy(false); }
  }
  return <div className="login-layout">
    <aside className="login-story"><div className="brand-lockup"><span className="brand-mark"><Icon name="shield" size={24} /></span><span>Payment Approval<span className="brand-caption">FINANCE WORKSPACE</span></span></div><div className="login-story-content"><span className="story-tag">A clearer way to manage payments</span><h1>Every request.<br />The right approval.</h1><p>Bring requests, decisions, and accountability together in one organized workspace.</p><div className="workflow-preview"><p className="eyebrow">A SIMPLE, TRACEABLE WORKFLOW</p>{[{ icon: 'document' as const, title: 'Request', text: 'Employees submit payment details.' }, { icon: 'shield' as const, title: 'Review', text: 'Managers and MD review eligible payments.' }, { icon: 'check' as const, title: 'Record', text: 'Every decision stays in the audit trail.' }].map((step, i) => <div className="workflow-step" key={step.title}><span><Icon name={step.icon} size={20} /></span><div><strong>{step.title}</strong><small>{step.text}</small></div><em>0{i + 1}</em></div>)}</div></div><p className="story-footer">Built for a clear, accountable approval process.</p></aside>
    <main className="login-page"><section className="login-card"><span className="login-icon"><Icon name="shield" size={24} /></span><p className="eyebrow">WELCOME BACK</p><h1>Sign in to your workspace</h1><p className="muted">Choose your account to continue.</p><form onSubmit={submit} className="payment-form">
      <label>Account<select autoComplete="username" disabled={busy} value={username} onChange={e => { setUsername(e.target.value); setPassword(''); setVisible(false); setError(''); }}><option value="employee">Employee</option><option value="manager">Manager</option><option value="md">MD</option></select></label>
      <div className="password-field"><label htmlFor="login-password">Password</label><div className="password-input"><input id="login-password" type={visible ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" disabled={busy} value={password} onChange={e => setPassword(e.target.value)} required /><button type="button" className="password-toggle" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} aria-controls="login-password" onClick={() => setVisible(!visible)}><Icon name={visible ? 'eyeOff' : 'eye'} size={20} /></button></div></div>
      {error && <p className="notice error" role="alert">{error}</p>}<button className="primary login-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}<Icon name="arrow" /></button>
    </form><div className="login-help"><Icon name="shield" size={15} /><span>Your account determines which pages and actions you can access.</span></div></section><p className="login-footer">Payment Approval System · Local workspace</p></main>
  </div>;
}
