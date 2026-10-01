const { test } = require('node:test');
const assert = require('node:assert/strict');

test('private Blob storage bypasses cache, persists settings, expires and revokes sessions', async () => {
  const blobs = new Map();
  const sdkPath = require.resolve('@vercel/blob');
  require(sdkPath);
  require.cache[sdkPath].exports = {
    get: async (pathname, options) => {
      assert.equal(options.access, 'private'); assert.equal(options.useCache, false);
      return blobs.has(pathname) ? { stream: new Response(blobs.get(pathname)).body } : null;
    },
    put: async (pathname, content, options) => {
      assert.equal(options.access, 'private'); assert.equal(options.addRandomSuffix, false);
      assert.equal(options.allowOverwrite, true); blobs.set(pathname, content);
    },
    del: async pathname => { blobs.delete(pathname); },
  };
  process.env.BLOB_READ_WRITE_TOKEN = 'test-private-token';
  process.env.VERCEL = '1';
  const { AuthService } = require('../dist/backend/src/modules/auth/auth.service.js');
  const { SettingsService } = require('../dist/backend/src/modules/settings/settings.service.js');
  const { defaultSettings } = require('../dist/shared/access.types.js');
  let token;
  const response = { clearCookie() {}, cookie(name, value) { token = `${name}=${value}`; } };
  try {
    const a = new AuthService(), b = new AuthService();
    await a.login('md', 'md@123', { headers: {} }, response);
    const req = { headers: { cookie: token } };
    assert.equal((await b.user(req)).role, 'MD');
    const first = new SettingsService(), second = new SettingsService();
    const config = { ...defaultSettings.config, mdApprovalThreshold: 321 };
    await first.updateConfig(config);
    assert.deepEqual((await second.get()).config, config);
    assert.deepEqual((await new SettingsService().get()).config, config);
    await b.logout(req, response);
    await assert.rejects(a.user(req), /Please log in/);
    await a.login('employee', 'employee@123', { headers: {} }, response);
    const sessionPath = [...blobs.keys()].find(key => key.includes('session'));
    const saved = JSON.parse(blobs.get(sessionPath));
    saved.expires = Date.now() - 1;
    blobs.set(sessionPath, JSON.stringify(saved));
    await assert.rejects(b.user({ headers: { cookie: token } }), /Please log in/);
    assert.equal(blobs.has(sessionPath), false);
  } finally {
    delete process.env.BLOB_READ_WRITE_TOKEN; delete process.env.VERCEL;
  }
});
