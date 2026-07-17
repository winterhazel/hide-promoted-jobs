const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturesDirectory = path.join(__dirname, 'fixtures', 'linkedin');
const fixtureIndex = JSON.parse(
  fs.readFileSync(path.join(fixturesDirectory, 'fixture-index.json'), 'utf8')
);

function readFixture(entry) {
  return fs.readFileSync(path.join(fixturesDirectory, entry.file), 'utf8');
}

test('covers promoted and organic cards across each observed layout', () => {
  assert.equal(fixtureIndex.length, 6);
  assert.ok(fixtureIndex.filter((entry) => entry.promoted).length >= 2);
  assert.ok(fixtureIndex.filter((entry) => !entry.promoted).length >= 2);
  assert.deepEqual(
    [...new Set(fixtureIndex.map((entry) => entry.layout))].sort(),
    ['classic', 'sdui']
  );
  assert.ok(fixtureIndex.some((entry) => entry.frame));
});

test('fixtures contain sanitized structural data only', () => {
  const allowedVisibleText = new Set([
    'Be an early applicant',
    'Example Company',
    'Example Role A',
    'Example Role B',
    'Example Role C',
    'Example Role D',
    'Example Role E',
    'Example Role F',
    'Posted 2 days ago',
    'Posted 3 days ago',
    'Promoted',
  ]);

  fixtureIndex.forEach((entry) => {
    const html = readFixture(entry);

    assert.equal(entry.sanitized, true);
    assert.match(html, /data-fixture-sanitized="true"/);
    assert.match(html, /data-fixture-card="job"/);
    assert.doesNotMatch(html, /https?:\/\//i);
    assert.doesNotMatch(html, /linkedin\.com\/in\//i);
    assert.doesNotMatch(html, /trackingId|refId|eBP|geoId/);
    assert.doesNotMatch(html, /<img\b/i);
    assert.doesNotMatch(html, /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);

    const visibleText = [...html.matchAll(/>([^<]+)</g)]
      .map((match) => match[1].replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    visibleText.forEach((value) => assert.ok(allowedVisibleText.has(value)));

    const promotedMarkerCount = (html.match(/>Promoted</g) || []).length;
    assert.equal(promotedMarkerCount, entry.promoted ? 1 : 0);
  });
});

test('classic fixtures preserve the stable card and marker contracts', () => {
  fixtureIndex
    .filter((entry) => entry.layout === 'classic')
    .forEach((entry) => {
      const html = readFixture(entry);

      assert.match(html, /scaffold-layout__list-item/);
      assert.match(html, /data-occludable-job-id="fixture-job-/);
      assert.match(html, /class="job-card-container job-card-list"/);
      assert.match(html, /data-job-id="fixture-job-/);
      assert.match(html, /href="\/jobs\/view\/\d+\/"/);
      if (entry.promoted) {
        assert.match(html, /job-card-container__footer-item/);
        assert.match(html, /data-fixture-marker="promoted"/);
      }
    });
});

test('SDUI fixtures avoid generated classes and preserve card-local evidence', () => {
  fixtureIndex
    .filter((entry) => entry.layout === 'sdui')
    .forEach((entry) => {
      const html = readFixture(entry);

      assert.match(html, /data-display-contents/);
      assert.match(html, /href="\/jobs\/collections\//);
      assert.match(html, /currentJobId=\d+/);
      assert.match(html, /aria-label="Dismiss Example Role/);
      assert.doesNotMatch(html, /class="_[a-f0-9]{8}/);
    });
});

test('preload fixture records the missing frame injection marker', () => {
  const entry = fixtureIndex.find((candidate) => candidate.frame);
  const html = readFixture(entry);

  assert.equal(entry.documentPath, '/preload/');
  assert.match(html, /data-fixture-frame-path="\/preload\/"/);
  assert.match(html, /data-fixture-injection-marker="absent"/);
  assert.doesNotMatch(html, /data-hide-promoted-jobs=/);
});
