const { createApp } = require('../dist/backend/src/main.js');

// Use tsc output so Nest's dependency injection retains decorator metadata.
const application = createApp().then(async app => {
  await app.init();
  return app.getHttpAdapter().getInstance();
});
module.exports = async function handler(req, res) {
  const express = await application;
  express(req, res);
};
