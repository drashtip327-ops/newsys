const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

test('shared sessions, revocation and settings work across independent Nest instances', async () => {
  const values = new Map();
  const storage = http.createServer(async (req, res) => {
    assert.equal(req.headers.authorization, 'Bearer test-storage-token');
    let body = '';
    for await (const chunk of req) body += chunk;
    const [command, ...args] = JSON.parse(body);
    let result;
    if (command === 'SET') { values.set(args[0], args[1]); result = 'OK'; }
    else if (command === 'GET') result = values.get(args[0]) ?? null;
    else if (command === 'MGET') result = args.map(key => values.get(key) ?? null);
    else if (command === 'DEL') result = Number(values.delete(args[0]));
    else if (command === 'PING') result = 'PONG';
    else throw new Error(`Unexpected storage command ${command}`);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ result }));
  });
  await new Promise(resolve => storage.listen(0, '127.0.0.1', resolve));
  process.env.KV_REST_API_URL = `http://127.0.0.1:${storage.address().port}`;
  process.env.KV_REST_API_TOKEN = 'test-storage-token';
  process.env.VERCEL = '1';
  const { createApp } = require('../dist/backend/src/main.js');
  const { defaultSettings } = require('../dist/shared/access.types.js');
  let first, second;
  try {
    first = await createApp(); second = await createApp();
    await first.listen(0, '127.0.0.1'); await second.listen(0, '127.0.0.1');
    const a = await first.getUrl(), b = await second.getUrl();
    const request = async (base, route, cookie = '', body) => {
      const response = await fetch(`${base}/api${route}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { response, ...(await response.json()) };
    };
    assert.equal((await request(b, '/health')).data.storage, 'redis');
    const login = await request(a, '/auth/login', '', { username: 'md', password: 'md@123' });
    assert.equal(login.response.status, 201);
    const cookie = login.response.headers.getSetCookie().find(c => c.includes('Max-Age=28800')).split(';')[0];
    assert.equal((await request(b, '/auth/me', cookie)).data.user.role, 'MD');
    const config = { ...defaultSettings.config, mdApprovalThreshold: 12345 };
    assert.equal((await request(a, '/settings/config', cookie, config)).response.status, 201);
    assert.deepEqual((await request(b, '/settings/config', cookie)).data, config);
    await first.close(); first = await createApp(); await first.listen(0, '127.0.0.1');
    assert.deepEqual((await request(await first.getUrl(), '/settings/config', cookie)).data, config);
    await request(b, '/auth/logout', cookie, {});
    assert.equal((await request(await first.getUrl(), '/auth/me', cookie)).response.status, 401);
  } finally {
    await first?.close(); await second?.close();
    await new Promise(resolve => storage.close(resolve));
    delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN; delete process.env.VERCEL;
  }
});
