import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyFilters, filterAudit, filterError, filterPayments, localDate } from '../shared/filters';
import { createSeedState, auditCsv } from '../shared/payment-utils';
import { createPayment } from '../backend/src/modules/payments/services/payment-rules';

test('payment filters combine search, vendor, status, inclusive dates and amount bounds', () => {
  const { payments } = createSeedState();
  const result = filterPayments(payments, { ...emptyFilters, search: ' festival ', vendor: 'Ambica Traders', status: 'Pending_Manager', dateFrom: '2026-07-06', dateTo: '2026-07-06', minAmount: '50000', maxAmount: '50000' }, 'Manager', 1);
  assert.deepEqual(result.map(p => p.req_id), ['PR-006']);
  assert.equal(filterPayments(payments, { ...emptyFilters, search: 'does not exist' }, 'Employee', 1).length, 0);
});
test('payment actionable and submission filters respect current role and configured retry allowance', () => {
  const { payments } = createSeedState();
  assert.deepEqual(filterPayments(payments, { ...emptyFilters, actionable: true }, 'MD', 1).map(p => p.req_id), ['PR-002']);
  assert.equal(filterPayments(payments, { ...emptyFilters, actionable: true }, 'Employee', 0).length, 0);
  assert.deepEqual(filterPayments(payments, { ...emptyFilters, attempts: 'resubmitted' }, 'Employee', 1).map(p => p.req_id), ['PR-009']);
  assert.equal(filterPayments(payments, { ...emptyFilters, actionable: true }, 'Manager', 1).length, 6);
});
test('sorting returns new arrays without changing the seed', () => {
  const { payments } = createSeedState(); const before = JSON.stringify(payments);
  assert.equal(filterPayments(payments, { ...emptyFilters, sort: 'amount-high' }, 'Employee', 1)[0].amount, 88000);
  assert.equal(filterPayments(payments, { ...emptyFilters, sort: 'amount-low' }, 'Employee', 1)[0].amount, 9200);
  assert.equal(filterPayments(payments, { ...emptyFilters, sort: 'oldest' }, 'Employee', 1)[0].req_id, 'PR-001');
  assert.equal(JSON.stringify(payments), before);
});
test('invalid ranges produce clear errors and no misleading filter results', () => {
  assert.ok(filterError({ ...emptyFilters, minAmount: '100', maxAmount: '10' }));
  assert.ok(filterError({ ...emptyFilters, minAmount: '-1' }));
  assert.ok(filterError({ ...emptyFilters, maxAmount: 'NaN' }));
  const invalid = { ...emptyFilters, dateFrom: '2026-07-10', dateTo: '2026-07-01' };
  const state = createSeedState();
  assert.ok(filterError(invalid));
  assert.equal(filterAudit(state.auditLogs, state.payments, invalid).length, 0);
  assert.equal(filterPayments(state.payments, invalid, 'Employee', 1).length, 0);
});
test('audit filters join vendor and invoice, actor, from/to status, and inclusive event dates', () => {
  const state = createSeedState();
  const result = filterAudit(state.auditLogs, state.payments, { ...emptyFilters, vendor: 'Gokul Dairy Supplies', role: 'Employee', fromStatus: 'Rejected', status: 'Pending_Manager', dateFrom: '2026-07-09', dateTo: '2026-07-09', search: 'gd/78' });
  assert.equal(result.length, 1);
  assert.equal(result[0].comment, 'Corrected invoice attached');
  assert.equal(filterAudit(state.auditLogs, state.payments, { ...emptyFilters, search: 'verified against po' }).length, 1);
  const exported = auditCsv(result);
  assert.ok(exported.includes('Corrected invoice attached'));
  assert.ok(!exported.includes('Invoice month mismatch'));
});
test('audit created filter, ordering, and clear defaults', () => {
  const state = createPayment(createSeedState(), 'Employee', { vendor: 'Ambica Traders', amount: 10, purpose: 'Filters', invoice_no: 'F/1', request_date: '2026-01-01' });
  const result = filterAudit(state.auditLogs, state.payments, { ...emptyFilters, fromStatus: 'Created' });
  assert.equal(result.length, 1); assert.equal(result[0].from_status, null);
  const sorted = filterAudit(state.auditLogs, state.payments, { ...emptyFilters, sort: 'oldest' });
  assert.ok(sorted.every((log, index) => index === 0 || Date.parse(sorted[index - 1].timestamp) <= Date.parse(log.timestamp)));
  assert.equal(filterAudit(state.auditLogs, state.payments, emptyFilters).length, state.auditLogs.length);
  assert.equal(localDate('2026-07-09T23:00:00'), '2026-07-09');
});
