const assert = require('node:assert/strict');
const frontend = process.env.FRONTEND_URL || 'https://newsys-chi.vercel.app';
const backend = process.env.BACKEND_URL || 'https://newsys-vsx6.vercel.app';
async function request(base, route, cookie, body, expected = body === undefined ? 200 : 201) {
  const response = await fetch(`${base}/api${route}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', Origin: frontend, ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(60000),
  });
  const text = await response.text();
  assert.equal(response.status, expected, `${base}${route}: ${text.slice(0,500)}`);
  return { response, data: JSON.parse(text).data };
}
async function main() {
  const page = await fetch(`${frontend}/login`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Sign in to your workspace/);
  for (const base of [backend, frontend]) {
    assert.equal((await request(base, '/health')).data.storage, 'blob');
    await request(base, '/payments/seed', '', undefined, 401);
  }
  console.log('PASS frontend HTML, backend health, frontend API proxy and authentication enforcement');
  const cookies = {};
  for (const username of ['employee', 'manager', 'md']) {
    const login = await request(frontend, '/auth/login', '', { username, password: `${username}@123` });
    assert.equal(login.data.user.username, username);
    const cookie = login.response.headers.getSetCookie().find(c => c.includes('Max-Age=28800'));
    assert.ok(cookie.includes('Secure') && cookie.includes('HttpOnly') && cookie.includes('SameSite=Lax'));
    cookies[username] = cookie.split(';')[0];
    assert.equal((await request(backend, '/auth/me', cookies[username])).data.user.username, username);
  }
  await request(frontend, '/auth/login', '', { username: 'md', password: 'wrong' }, 401);
  await request(frontend, '/settings/config', cookies.employee, undefined, 403);
  let state = (await request(frontend, '/payments/seed', cookies.employee)).data;
  assert.equal(state.payments.length, 10);
  const config = (await request(frontend, '/settings/config', cookies.md)).data;
  const payment = { vendor: 'Ambica Traders', invoice_no: `PROD-VERIFY-${Date.now()}`, amount: config.mdApprovalThreshold + 1, purpose: 'Production verification', request_date: new Date().toISOString().slice(0,10) };
  state = (await request(frontend, '/payments', cookies.employee, { state, payment })).data;
  const id = state.payments.at(-1).req_id;
  assert.equal(state.payments.at(-1).status, 'Pending_Manager');
  await request(frontend, `/payments/${id}/approve`, cookies.employee, { state }, 403);
  state = (await request(frontend, `/payments/${id}/approve`, cookies.manager, { state })).data;
  assert.equal(state.payments.at(-1).status, 'Pending_MD');
  state = (await request(frontend, `/payments/${id}/approve`, cookies.md, { state })).data;
  assert.equal(state.payments.at(-1).status, 'Approved');
  const audit = (await request(frontend, '/payments/audit', cookies.md, { state })).data;
  assert.ok(audit.some(log => log.req_id === id));
  console.log('PASS all role logins, secure cookies, session sharing, create, manager/MD approvals and audit');
  try {
    const changed = { ...config, minRejectionCommentLength: config.minRejectionCommentLength === 5 ? 6 : 5 };
    await request(frontend, '/settings/config', cookies.md, changed);
    assert.deepEqual((await request(backend, '/settings/config', cookies.md)).data, changed);
  } finally { await request(frontend, '/settings/config', cookies.md, config); }
  assert.deepEqual((await request(backend, '/settings/config', cookies.md)).data, config);
  const blocked = await fetch(`${backend}/api/auth/login`, { method: 'POST', headers: { Origin: 'https://example.org', 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'employee', password: 'employee@123' }) });
  assert.equal(blocked.status, 403);
  for (const cookie of Object.values(cookies)) {
    await request(frontend, '/auth/logout', cookie, {});
    await request(backend, '/auth/me', cookie, undefined, 401);
  }
  console.log('PASS durable settings write/read/restore, origin protection and shared logout revocation');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
