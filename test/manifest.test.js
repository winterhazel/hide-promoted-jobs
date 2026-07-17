const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const manifestPath = path.join(__dirname, '..', 'ext', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

test('uses the required Manifest V3 extension structure', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.background.service_worker, 'js/background.js');
  assert.ok(manifest.action);
  assert.equal(manifest.browser_action, undefined);
  assert.equal(manifest.background.scripts, undefined);
});

test('keeps permissions and LinkedIn exposure narrowly scoped', () => {
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.deepEqual(manifest.content_scripts, [
    {
      matches: ['*://*.linkedin.com/*'],
      js: ['js/detection.js', 'js/hide.js'],
      all_frames: true,
    },
  ]);
  assert.deepEqual(manifest.web_accessible_resources, [
    {
      resources: ['js/langs.json'],
      matches: ['*://*.linkedin.com/*'],
    },
  ]);
});
