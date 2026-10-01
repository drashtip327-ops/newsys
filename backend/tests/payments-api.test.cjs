const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'payment-settings-'));
process.env.SETTINGS_FILE = path.join(testDirectory, 'settings.json');
const { createApp } = require('../dist/backend/src/main.js');
const { defaultSettings } = require('../dist/shared/access.types.js');
let app, base;
const cookies = new Map();
before(async () => { app = await createApp(); await app.listen(0, '127.0.0.1'); base = await app.getUrl(); });
after(async () => { await app?.close(); if (!testDirectory.startsWith(path.join(os.tmpdir(), 'payment-settings-'))) throw new Error('Unexpected test path'); fs.rmSync(testDirectory, { recursive: true, force: true }); });
async function cookie(role) {
  if (!['Employee', 'Manager', 'MD'].includes(role)) return '';
  if (!cookies.has(role)) {
    const res = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: role.toLowerCase(), password: `${role.toLowerCase()}@123` }) });
    assert.equal(res.status, 201);
    cookies.set(role, res.headers.getSetCookie().find(value => value.startsWith('payment_session=') && !value.startsWith('payment_session=;')).split(';')[0]);
  }
  return cookies.get(role);
}
async function api(route, role = 'Employee', body) {
  const response = await fetch(`${base}/api${route}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', Cookie: await cookie(role) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, ...(await response.json()) };
}
async function request(path, role = 'Employee', body) {
  return api(`/payments${path}`, role, body);
}
async function seed() { const result = await request('/seed'); assert.equal(result.status, 200); return result.data; }
const payment = { vendor: 'Ambica Traders', invoice_no: 'API/1', amount: 40000, purpose: 'API test purchase', request_date: '2026-01-01' };
test('seed, vendors and authentication reject missing sessions', async () => {
  assert.equal((await seed()).payments.length, 10);
  assert.equal((await request('/vendors')).data.length, 5);
  assert.equal((await request('/seed', '')).status, 401);
  assert.equal((await request('/seed', 'Admin')).status, 401);
});
test('real HTTP create, manager/MD approvals, boundary and summary', async () => {
  for (const amount of [40000, 50000, 60000]) {
    let result = await request('', 'Employee', { state: await seed(), payment: { ...payment, amount } });
    assert.equal(result.status, 201);
    let state = result.data;
    assert.equal(state.payments.at(-1).status, 'Pending_Manager');
    assert.equal((await request('/PR-011/approve', 'MD', { state })).status, 403);
    result = await request('/PR-011/approve', 'Manager', { state });
    assert.equal(result.status, 201); state = result.data;
    assert.equal(state.payments.at(-1).status, amount > 50000 ? 'Pending_MD' : 'Approved');
    if (amount > 50000) {
      assert.equal((await request('/PR-011/approve', 'Manager', { state })).status, 403);
      state = (await request('/PR-011/approve', 'MD', { state })).data;
    }
    assert.equal(state.payments.at(-1).status, 'Approved');
    const summary = (await request('/summary', 'Employee', { state })).data;
    assert.equal(summary.approved, 58500 + amount);
    assert.equal(summary.pending, 295100);
  }
});
test('reject validation, edited resubmission, final rejection and audit', async () => {
  let state = await seed();
  for (const comment of ['Bad', '  Bad  ', '', '     ']) assert.equal((await request('/PR-001/reject', 'Manager', { state, comment })).status, 400);
  assert.equal(state.payments[0].status, 'Pending_Manager');
  state = (await request('/PR-001/reject', 'Manager', { state, comment: 'Invalid invoice' })).data;
  state = (await request('/PR-001/resubmit', 'Employee', { state, payment: { ...payment, amount: 60000 } })).data;
  assert.equal(state.payments[0].resubmit_count, 1);
  assert.equal(state.payments[0].amount, 60000);
  state = (await request('/PR-001/reject', 'Manager', { state, comment: 'Still invalid' })).data;
  assert.equal((await request('/PR-001/resubmit', 'Employee', { state, payment })).status, 400);
  assert.equal((await request('/audit', 'Employee', { state })).data.length, 9);
  const md = await request('/PR-002/reject', 'MD', { state: await seed(), comment: 'Invalid invoice' });
  assert.equal(md.data.payments[1].status, 'Rejected');
});
test('DTOs, body tampering, unknown requests and invalid input', async () => {
  const state = await seed();
  assert.equal((await request('', 'Manager', { state, payment })).status, 403);
  assert.equal((await request('/PR-001/approve', 'Employee', { state })).status, 403);
  assert.equal((await request('/missing/approve', 'Manager', { state })).status, 404);
  for (const change of [{ amount: 0 }, { amount: -1 }, { amount: '40000' }, { vendor: 'Unknown' }, { purpose: ' ' }, { invoice_no: '' }, { request_date: '2999-01-01' }, { request_date: '2026-02-30' }, { status: 'Approved' }]) {
    const result = await request('', 'Employee', { state, payment: { ...payment, ...change } });
    assert.equal(result.status, 400, JSON.stringify(change));
  }
  for (const body of [{}, { state: null }, { state: {} }, { state: { payments: [{}], auditLogs: [] } }, { state, extra: true }]) assert.equal((await request('/PR-001/approve', 'Manager', body)).status, 400);
  assert.equal((await request('', 'Employee', { state })).status, 400);
  const duplicate = await request('', 'Employee', { state, payment: { ...payment, invoice_no: 'AT/2026/101' } });
  assert.equal(duplicate.status, 201);
});
test('list filters, local persistence snapshot roundtrip and reset', async () => {
  const original = await seed();
  const changed = (await request('/PR-006/approve', 'Manager', { state: original })).data;
  const restored = JSON.parse(JSON.stringify(changed));
  const filtered = await request('/list', 'Employee', { state: restored, status: 'Approved', vendor: 'Ambica Traders' });
  assert.deepEqual(filtered.data.map(p => p.req_id), ['PR-006']);
  assert.deepEqual(await seed(), original);
  const response = await fetch(`${base}/api/payments/seed`, { headers: { Cookie: await cookie('Employee'), Origin: 'http://localhost:3000' } });
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:3000');
});
test('login password, session role, cookie flags, spoofing and logout', async () => {
  for (const body of [{ username: 'employee', password: 'wrong' }, { username: 'admin', password: 'admin@123' }, { username: 'constructor', password: 'constructor@123' }, ...['employee', 'manager', 'md'].map(username => ({ username, password: 'test@123' })), { username: 'employee', password: 'manager@123' }, { username: 'md', password: 'MD@123' }]) {
    const res = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal(res.status, 401);
  }
  for (const role of ['Employee', 'Manager', 'MD']) assert.equal((await api('/auth/me', role)).data.user.role, role);
  const spoof = await fetch(`${base}/api/settings/config`, { headers: { Cookie: await cookie('Employee'), 'X-Role': 'MD' } });
  assert.equal(spoof.status, 403);
  const headerOnly = await fetch(`${base}/api/payments/seed`, { headers: { 'X-Role': 'MD' } });
  assert.equal(headerOnly.status, 401);
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'MD', password: 'md@123' }) });
  const sessionCookie = login.headers.getSetCookie().find(v => v.includes('Max-Age=28800'));
  assert.ok(sessionCookie.includes('HttpOnly')); assert.ok(sessionCookie.includes('SameSite=Lax'));
  const token = sessionCookie.split(';')[0];
  await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { Cookie: token } });
  assert.equal((await fetch(`${base}/api/auth/me`, { headers: { Cookie: token } })).status, 401);
  const crossOrigin = await fetch(`${base}/api/settings/config`, { method: 'POST', headers: { Origin: 'https://example.org', 'Content-Type': 'application/json', Cookie: await cookie('MD') }, body: JSON.stringify(defaultSettings.config) });
  assert.equal(crossOrigin.status, 403);
});
test('MD configuration is validated, persistent, and used by payment rules', async () => {
  for (const role of ['Employee', 'Manager']) {
    assert.equal((await api('/settings/config', role)).status, 403);
    assert.equal((await api('/settings/config', role, defaultSettings.config)).status, 403);
  }
  const config = { mdApprovalThreshold: 10000, maxResubmissions: 2, minRejectionCommentLength: 10 };
  assert.equal((await api('/settings/config', 'MD', config)).status, 201);
  assert.deepEqual(JSON.parse(fs.readFileSync(process.env.SETTINGS_FILE, 'utf8')).config, config);
  const { SettingsService } = require('../dist/backend/src/modules/settings/settings.service.js');
  assert.deepEqual((await new SettingsService().get()).config, config);
  let state = await seed();
  assert.equal((await request('/PR-001/approve', 'Manager', { state })).data.payments[0].status, 'Pending_MD');
  const boundary = (await request('', 'Employee', { state, payment: { ...payment, amount: 10000 } })).data;
  assert.equal((await request('/PR-011/approve', 'Manager', { state: boundary })).data.payments.at(-1).status, 'Approved');
  assert.equal((await request('/PR-001/reject', 'Manager', { state, comment: 'Too short' })).status, 400);
  state = (await request('/PR-009/reject', 'Manager', { state, comment: 'Invoice is invalid' })).data;
  state = (await request('/PR-009/resubmit', 'Employee', { state, payment })).data;
  assert.equal(state.payments[8].resubmit_count, 2);
  state = (await request('/PR-009/reject', 'Manager', { state, comment: 'Invoice is invalid' })).data;
  assert.equal((await request('/PR-009/resubmit', 'Employee', { state, payment })).status, 400);
  for (const change of [{ mdApprovalThreshold: -1 }, { maxResubmissions: 1.5 }, { maxResubmissions: 11 }, { minRejectionCommentLength: 0 }]) assert.equal((await api('/settings/config', 'MD', { ...config, ...change })).status, 400);
  await api('/settings/config', 'MD', { ...config, maxResubmissions: 0 });
  assert.equal((await request('/PR-005/resubmit', 'Employee', { state: await seed(), payment })).status, 400);
  await api('/settings/config', 'MD', defaultSettings.config);
});
test('MD page permissions enforce immediate revocation and protect admin access', async () => {
  const permissions = structuredClone(defaultSettings.permissions);
  for (const role of ['Employee', 'Manager']) {
    assert.equal((await api('/settings/permissions', role)).status, 403);
    assert.equal((await api('/settings/permissions', role, { permissions })).status, 403);
  }
  const state = await seed();
  permissions.Employee.payments = false;
  permissions.Manager.audit = false;
  assert.equal((await api('/settings/permissions', 'MD', { permissions })).status, 201);
  assert.equal((await request('/seed', 'Employee')).status, 403);
  assert.equal((await request('', 'Employee', { state, payment })).status, 403);
  assert.equal((await request('/audit', 'Manager', { state })).status, 403);
  assert.equal((await api('/auth/me', 'Employee')).data.permissions.Employee.payments, false);
  assert.equal((await request('/audit', 'Employee', { state })).status, 201);
  permissions.Employee.config = true;
  assert.equal((await api('/settings/permissions', 'MD', { permissions })).status, 400);
  permissions.Employee.config = false; permissions.MD.permissions = false;
  assert.equal((await api('/settings/permissions', 'MD', { permissions })).status, 400);
  assert.equal((await api('/settings/permissions', 'MD', { permissions: {} })).status, 400);
  await api('/settings/permissions', 'MD', { permissions: defaultSettings.permissions });
  assert.equal((await request('/seed', 'Employee')).status, 200);
});
