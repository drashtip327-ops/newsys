'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiRequest } from '../../lib/api';
import type { SessionInfo, PagePermission } from '../../../shared/access.types';
import Icon, { type IconName } from '../common/Icon';
const navIcons: Record<PagePermission, IconName> = { payments: 'grid', audit: 'history', config: 'settings', permissions: 'shield' };
interface AuthContextValue { session: SessionInfo | null; refresh: () => Promise<void>; login: (username: string, password: string) => Promise<void> }
const AuthContext = createContext<AuthContextValue | null>(null);
export const pageLinks: { page: PagePermission; href: string; label: string }[] = [
  { page: 'payments', href: '/', label: 'Payments' }, { page: 'audit', href: '/audit', label: 'Audit log' },
  { page: 'config', href: '/config', label: 'Configuration' }, { page: 'permissions', href: '/permissions', label: 'Roles & permissions' },
];
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider is required.'); return value; }
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const path = usePathname(); const router = useRouter();
  const refresh = useCallback(async () => {
    try { setSession(await apiRequest<SessionInfo>('/auth/me')); setError(''); }
    catch (e) { setSession(null); setError(e instanceof Error ? e.message : 'Unable to load session.'); }
    finally { setReady(true); }
  }, []);
  useEffect(() => {
    // Hydrate the browser session from an asynchronous server request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const sync = () => { void refresh(); };
    window.addEventListener('focus', sync); window.addEventListener('session-refresh', sync);
    const timer = setInterval(sync, 15000);
    return () => { clearInterval(timer); window.removeEventListener('focus', sync); window.removeEventListener('session-refresh', sync); };
  }, [refresh]);
  useEffect(() => { if (ready && !session && path !== '/login') router.replace('/login'); }, [ready, session, path, router]);
  async function login(username: string, password: string) {
    const next = await apiRequest<SessionInfo>('/auth/login', { username, password });
    setSession(next); setReady(true); setError('');
    router.replace(pageLinks.find(link => next.permissions[next.user.role][link.page])?.href ?? '/');
  }
  async function logout() {
    try { await apiRequest('/auth/logout', {}); setSession(null); router.replace('/login'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to log out.'); }
  }
  const allowed = session ? pageLinks.filter(link => session.permissions[session.user.role][link.page]) : [];
  const required = pageLinks.find(link => link.href === path)?.page;
  return <AuthContext.Provider value={{ session, refresh, login }}>
    {path === '/login' ? children : !ready ? <main><div className="loading-card">Checking your session…</div></main> : !session ? <main><div className="loading-card"><p>{error || 'Please log in.'}</p><Link href="/login">Go to login</Link></div></main> : <div className="app-shell">
      <aside className="sidebar"><div className="brand-lockup"><span className="brand-mark"><Icon name="shield" size={23} /></span><span>Payment Approval<span className="brand-caption">FINANCE WORKSPACE</span></span></div><p className="nav-label">WORKSPACE</p><nav aria-label="Main navigation">{allowed.map(link => <Link aria-current={path === link.href ? 'page' : undefined} key={link.page} href={link.href}><Icon name={navIcons[link.page]} size={18} />{link.label}</Link>)}</nav><div className="sidebar-bottom"><div className="sidebar-tip"><Icon name="shield" size={20} /><strong>Clear decisions. Full history.</strong><p>Keep each request and approval easy to follow.</p></div><div className="sidebar-footer">Payment Approval System</div></div></aside>
      <header className="topbar"><div className="topbar-title"><span>Workspace</span><Icon name="chevron" size={13} /><strong>{pageLinks.find(link => link.href === path)?.label ?? 'Overview'}</strong></div><div className="account-menu"><span className="avatar">{session.user.role === 'MD' ? 'MD' : session.user.username.slice(0, 2).toUpperCase()}</span><div className="account-detail"><strong>{session.user.username}</strong><small>{session.user.role} account</small></div><button className="logout-button" aria-label="Log out" onClick={logout}><Icon name="logout" size={17} /><span>Log out</span></button></div></header>
      {error && <p role="alert" className="notice error">{error}</p>}
      {required && !session.permissions[session.user.role][required] ? <main><h1>Access denied</h1><p>Your role does not have permission for this page. Contact the MD.</p></main> : children}
    </div>}
  </AuthContext.Provider>;
}
