import { statuses } from '../../types/payment';
import { vendors } from '../../lib/payments';
import { emptyFilters, filterError, type Filters } from '../../../shared/filters';
import { roles } from '../../../shared/access.types';
import { statusLabel } from './PaymentTable';
import Icon from '../common/Icon';
export default function FilterBar({ view, filters, onChange }: { view: 'payments' | 'audit'; filters: Filters; onChange: (filters: Filters) => void }) {
  const set = (key: keyof Filters, value: string | boolean) => onChange({ ...filters, [key]: value });
  const active = Object.entries(filters).filter(([key, value]) => key !== 'sort' && value !== '' && value !== false).length;
  const error = filterError(filters);
  return <div className="filter-area">
    <div className="filters">
      <label className="search">Search {view === 'audit' ? 'audit entries' : 'requests'}<span className="input-icon"><Icon name="search" /><input placeholder={view === 'audit' ? 'Request, vendor, invoice or comment…' : 'Request ID, vendor, invoice or purpose…'} value={filters.search} onChange={e => set('search', e.target.value)} /></span></label>
      <label>{view === 'audit' ? 'To status' : 'Status'}<select value={filters.status} onChange={e => set('status', e.target.value)}><option value="">All statuses</option>{statuses.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></label>
      <label>Vendor<select value={filters.vendor} onChange={e => set('vendor', e.target.value)}><option value="">All vendors</option>{vendors.map(v => <option key={v}>{v}</option>)}</select></label>
      <label>Sort by<select value={filters.sort} onChange={e => set('sort', e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option>{view === 'payments' && <><option value="amount-high">Amount: high to low</option><option value="amount-low">Amount: low to high</option></>}</select></label>
    </div>
    <details className="advanced-filters"><summary><Icon name="filter" /> More filters {active > 0 && <span className="count-pill">{active} active</span>}</summary><div className="filter-grid">
      <label>{view === 'audit' ? 'Event date from' : 'Request date from'}<input type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={e => set('dateFrom', e.target.value)} /></label>
      <label>{view === 'audit' ? 'Event date to' : 'Request date to'}<input type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={e => set('dateTo', e.target.value)} /></label>
      {view === 'payments' ? <>
        <label>Minimum amount (₹)<input type="number" min="0" step="any" placeholder="No minimum" value={filters.minAmount} onChange={e => set('minAmount', e.target.value)} /></label>
        <label>Maximum amount (₹)<input type="number" min="0" step="any" placeholder="No maximum" value={filters.maxAmount} onChange={e => set('maxAmount', e.target.value)} /></label>
        <label>Submission<select value={filters.attempts} onChange={e => set('attempts', e.target.value)}><option value="">All submissions</option><option value="first">First submission</option><option value="resubmitted">Resubmitted</option></select></label>
        <label className="checkbox-label"><input type="checkbox" checked={filters.actionable} onChange={e => set('actionable', e.target.checked)} /> Ready for my action</label>
      </> : <>
        <label>Action by<select value={filters.role} onChange={e => set('role', e.target.value)}><option value="">All roles</option>{roles.map(role => <option key={role}>{role}</option>)}</select></label>
        <label>From status<select value={filters.fromStatus} onChange={e => set('fromStatus', e.target.value)}><option value="">All previous statuses</option><option value="Created">Created (new request)</option>{statuses.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></label>
      </>}
    </div></details>
    <div className="filter-bottom"><span>{view === 'audit' ? 'Dates use event time · Vendor reflects the current request' : 'Filters refine the list · Overview totals include all requests'}</span><button className="text-button" disabled={!active && filters.sort === 'newest'} onClick={() => onChange({ ...emptyFilters })}><Icon name="reset" size={14} /> Clear filters</button></div>
    {error && <p className="notice error" role="alert">{error}</p>}
  </div>;
}
