import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditCsv, calculateSummary, createSeedState, duplicateInvoice, isAppState, newestLogs } from '../shared/payment-utils';
import { approvePayment, createPayment, rejectPayment, resubmitPayment, validatePayment } from '../backend/src/modules/payments/services/payment-rules';
import { loadState, saveState } from '../frontend/lib/storage';
import type { PaymentInput, Role } from '../frontend/types/payment';
const input: PaymentInput = { vendor: 'Ambica Traders', invoice_no: 'TEST/1', amount: 40000, purpose: 'Test purchase', request_date: '2026-01-01' };

test('seed preserves all requests, history, second attempt and summary totals', () => {
  const state = createSeedState();
  assert.equal(state.payments.length, 10);
  assert.equal(state.auditLogs.length, 6);
  assert.equal(state.payments[8].resubmit_count, 1);
  assert.deepEqual(calculateSummary(state.payments), { counts: { Pending_Manager: 6, Pending_MD: 1, Approved: 2, Rejected: 1 }, pending: 295100, approved: 58500 });
  assert.ok(isAppState(state));
});
for (const amount of [40000, 50000, 60000]) test(`approval workflow for ${amount}`, () => {
  let state = createPayment(createSeedState(), 'Employee', { ...input, amount });
  assert.equal(state.payments.at(-1)?.status, 'Pending_Manager');
  state = approvePayment(state, 'Manager', 'PR-011');
  assert.equal(state.payments.at(-1)?.status, amount > 50000 ? 'Pending_MD' : 'Approved');
  if (amount > 50000) state = approvePayment(state, 'MD', 'PR-011');
  assert.equal(state.payments.at(-1)?.status, 'Approved');
  assert.equal(calculateSummary(state.payments).approved, 58500 + amount);
  assert.equal(calculateSummary(state.payments).pending, 295100);
  assert.equal(state.auditLogs.length, amount > 50000 ? 9 : 8);
});
test('invalid rejection is atomic; edit, resubmit, second rejection is final', () => {
  let state = createSeedState();
  const before = JSON.stringify(state);
  for (const comment of ['', 'Bad', '     ', '  Bad  ']) assert.throws(() => rejectPayment(state, 'Manager', 'PR-001', comment), /at least 5/);
  assert.equal(JSON.stringify(state), before);
  state = rejectPayment(state, 'Manager', 'PR-001', 'Invalid invoice');
  assert.equal(state.payments[0].status, 'Rejected');
  state = resubmitPayment(state, 'Employee', 'PR-001', { ...input, amount: 60000 });
  assert.equal(state.payments[0].resubmit_count, 1);
  assert.equal(state.payments[0].status, 'Pending_Manager');
  assert.equal(state.payments[0].amount, 60000);
  state = rejectPayment(state, 'Manager', 'PR-001', 'Still invalid');
  assert.throws(() => resubmitPayment(state, 'Employee', 'PR-001', input), /cannot resubmit/);
  assert.equal(state.auditLogs.length, 9);
  assert.equal(state.payments[0].history.length, 3);
});
test('service enforces all role and status restrictions', () => {
  const state = createSeedState();
  for (const [role, id] of [['Employee', 'PR-001'], ['Manager', 'PR-002'], ['MD', 'PR-001'], ['Manager', 'PR-003'], ['MD', 'PR-005']] as [Role, string][]) {
    assert.throws(() => approvePayment(state, role, id), /not authorized/);
    assert.throws(() => rejectPayment(state, role, id, 'Invalid invoice'), /not authorized/);
  }
  assert.throws(() => createPayment(state, 'Manager', input), /not authorized/);
  assert.throws(() => resubmitPayment(state, 'MD', 'PR-005', input), /not authorized/);
  assert.throws(() => resubmitPayment(state, 'Employee', 'PR-001', input), /cannot resubmit/);
  const rejected = rejectPayment(state, 'Manager', 'PR-009', 'Invalid invoice');
  assert.throws(() => resubmitPayment(rejected, 'Employee', 'PR-009', input), /cannot resubmit/);
  assert.equal(rejectPayment(state, 'MD', 'PR-002', 'Invalid invoice').payments[1].status, 'Rejected');
});
test('form validation rejects invalid values; duplicate invoice is only a warning', () => {
  for (const change of [{ amount: 0 }, { amount: -1 }, { amount: NaN }, { amount: Infinity }, { vendor: 'Unknown' }, { request_date: '2999-01-01' }, { request_date: '2026-02-30' }, { request_date: '' }, { purpose: ' ' }, { invoice_no: ' ' }]) assert.throws(() => validatePayment({ ...input, ...change }));
  const state = createSeedState();
  assert.ok(duplicateInvoice(state.payments, ' at/2026/101 '));
  assert.equal(duplicateInvoice(state.payments, 'AT/2026/101', 'PR-001'), false);
  assert.equal(createPayment(state, 'Employee', { ...input, invoice_no: 'AT/2026/101' }).payments.length, 11);
});
test('audit records transitions, sorts newest first, escapes CSV', () => {
  const state = rejectPayment(createSeedState(), 'Manager', 'PR-001', '=Bad "invoice",\ncheck');
  const log = state.auditLogs[0];
  assert.equal(log.role, 'Manager'); assert.equal(log.from_status, 'Pending_Manager'); assert.equal(log.to_status, 'Rejected');
  assert.ok(Number.isFinite(Date.parse(log.timestamp)));
  const sorted = newestLogs(state.auditLogs);
  assert.ok(sorted.every((l, i) => i === 0 || Date.parse(sorted[i - 1].timestamp) >= Date.parse(l.timestamp)));
  assert.ok(auditCsv(state.auditLogs).includes('"\'=Bad ""invoice"",\ncheck"'));
});
test('storage roundtrip, corrupt data fallback, reset and pristine seed', () => {
  let value: string | null = null;
  const storage = { getItem: () => value, setItem: (_key: string, v: string) => { value = v; } };
  const original = createSeedState();
  const changed = approvePayment(original, 'Manager', 'PR-006');
  saveState(storage, changed);
  assert.deepEqual(loadState(storage).state, changed);
  saveState(storage, createSeedState());
  assert.deepEqual(loadState(storage).state, original);
  assert.equal(original.payments[5].status, 'Pending_Manager');
  value = '{broken'; assert.ok(loadState(storage).warning);
  value = JSON.stringify({ payments: [{}], auditLogs: [] }); assert.ok(loadState(storage).warning);
  assert.equal(isAppState(null), false);
  assert.equal(isAppState({}), false);
});
