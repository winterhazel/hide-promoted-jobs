const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'ext', 'manifest.json'), 'utf8')
);
const packageJson = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8')
);

test('keeps version and repository metadata aligned for the 1.6.0 release', () => {
  assert.equal(manifest.version, '1.6.0');
  assert.equal(packageJson.version, manifest.version);
  assert.equal(
    manifest.homepage_url,
    'https://github.com/winterhazel/hide-promoted-jobs'
  );
  assert.equal(
    packageJson.repository.url,
    'git+https://github.com/winterhazel/hide-promoted-jobs.git'
  );
  assert.equal(
    packageJson.bugs.url,
    'https://github.com/winterhazel/hide-promoted-jobs/issues'
  );
});

test('ships the public release and maintenance files', () => {
  [
    'README.md',
    'docs/maintenance.md',
    '.github/ISSUE_TEMPLATE/linkedin-regression.yml',
    '.github/workflows/ci.yml',
    'scripts/build-release.js',
  ].forEach((relativePath) => {
    assert.ok(fs.existsSync(path.join(root, relativePath)), relativePath);
  });
});
