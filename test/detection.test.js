const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { parseHTML } = require('linkedom');

const detection = require('../ext/js/detection');

const fixturesDirectory = path.join(__dirname, 'fixtures', 'linkedin');
const fixtureIndex = JSON.parse(
  fs.readFileSync(path.join(fixturesDirectory, 'fixture-index.json'), 'utf8')
);

function parseFixture(entry) {
  const html = fs.readFileSync(
    path.join(fixturesDirectory, entry.file),
    'utf8'
  );
  return parseHTML(html).document;
}

function removeFixtureMetadata(document) {
  document.querySelectorAll('*').forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      if (attribute.name.startsWith('data-fixture-')) {
        element.removeAttribute(attribute.name);
      }
    });
  });
}

test('classifies every sanitized LinkedIn fixture without fixture metadata', () => {
  fixtureIndex.forEach((entry) => {
    const document = parseFixture(entry);
    const expectedCard = document.querySelector('[data-fixture-card="job"]');
    removeFixtureMetadata(document);

    const cards = detection.findPromotedCards(document, ['Promoted']);
    assert.equal(cards.length, entry.promoted ? 1 : 0, entry.id);
    if (entry.promoted) {
      assert.equal(cards[0], expectedCard, entry.id);
    }
  });
});

test('normalizes exact labels but rejects substring and aggregate matches', () => {
  const { document } = parseHTML(`
    <ul>
      <li class="scaffold-layout__list-item" data-occludable-job-id="1">
        <div class="job-card-container" data-job-id="1">
          <a href="/jobs/view/1/"></a>
          <ul><li class="job-card-container__footer-item">
            <span>\n  PROMOTED  </span>
          </li></ul>
        </div>
      </li>
      <li class="scaffold-layout__list-item" data-occludable-job-id="2">
        <div class="job-card-container" data-job-id="2">
          <a href="/jobs/view/2/"></a>
          <ul><li class="job-card-container__footer-item">
            <span>Promoted by hirer</span>
          </li></ul>
        </div>
      </li>
      <li class="scaffold-layout__list-item" data-occludable-job-id="3">
        <div class="job-card-container" data-job-id="3">
          <a href="/jobs/view/3/"></a>
          <ul><li class="job-card-container__footer-item">
            <div><span>Pro</span><span>moted</span></div>
          </li></ul>
        </div>
      </li>
    </ul>
  `);

  const cards = detection.findPromotedCards(document, ['promoted']);
  assert.deepEqual(
    cards.map((card) => card.getAttribute('data-occludable-job-id')),
    ['1']
  );
});

test('classic detection fails open when required card evidence is missing', () => {
  const { document } = parseHTML(`
    <ul>
      <li class="scaffold-layout__list-item" data-occludable-job-id="1">
        <div class="job-card-container"><a href="/jobs/view/1/"></a>
          <li class="job-card-container__footer-item"><span>Promoted</span></li>
        </div>
      </li>
      <li class="scaffold-layout__list-item" data-occludable-job-id="2">
        <div class="job-card-container" data-job-id="2">
          <li class="job-card-container__footer-item"><span>Promoted</span></li>
        </div>
      </li>
      <li class="scaffold-layout__list-item" data-occludable-job-id="3"></li>
    </ul>
  `);

  assert.deepEqual(detection.findPromotedCards(document, ['Promoted']), []);
});

test('SDUI detection requires an actual query parameter and unambiguous structure', () => {
  const { document } = parseHTML(`
    <section>
      <div id="invalid-parameter">
        <div><div data-display-contents>
          <a href="/jobs/collections/recommended/?notcurrentJobId=1"><p>Promoted</p></a>
        </div></div>
        <div><button aria-label="Dismiss role"></button></div>
      </div>
      <div id="duplicate-link">
        <div><div data-display-contents>
          <a href="/jobs/collections/recommended/?currentJobId=2"><p>Promoted</p></a>
        </div></div>
        <a href="/jobs/collections/recommended/?currentJobId=3"></a>
        <div><button aria-label="Descartar trabajo"></button></div>
      </div>
      <div id="valid-localized-control">
        <div><div data-display-contents>
          <a href="/jobs/collections/recommended/?currentJobId=4"><p>Promocionado</p></a>
        </div></div>
        <div><button aria-label="Descartar trabajo"></button></div>
      </div>
    </section>
  `);

  const cards = detection.findPromotedCards(document, ['Promocionado']);
  assert.deepEqual(
    cards.map((card) => card.id),
    ['valid-localized-control']
  );
});

test('SDUI ownership never expands into a surrounding section', () => {
  const { document } = parseHTML(`
    <section id="surrounding-section">
      <div id="card-without-action">
        <div>
          <div data-display-contents>
            <a href="/jobs/collections/recommended/?currentJobId=1">
              <p>Promoted</p>
            </a>
          </div>
        </div>
      </div>
      <article><p>Organic sibling</p></article>
      <button aria-label="Unrelated labeled action"></button>
    </section>
  `);

  assert.deepEqual(detection.findPromotedCards(document, ['Promoted']), []);
});

test('SDUI detection resolves a card from its changed action control', () => {
  const entry = fixtureIndex.find(
    (candidate) => candidate.id === 'jobs-home-promoted'
  );
  const document = parseFixture(entry);
  const expectedCard = document.querySelector('[data-fixture-card="job"]');
  const actionControl = expectedCard.querySelector('button[aria-label]');
  removeFixtureMetadata(document);

  const cards = detection.findPromotedCards(actionControl, ['Promoted']);
  assert.deepEqual(cards, [expectedCard]);
});

test('affected-subtree scans reconsider a card after marker hydration', () => {
  const { document } = parseHTML(`
    <li class="scaffold-layout__list-item" data-occludable-job-id="1">
      <div class="job-card-container" data-job-id="1">
        <a href="/jobs/view/1/"></a>
        <li class="job-card-container__footer-item"><span id="marker"></span></li>
      </div>
    </li>
  `);
  const marker = document.querySelector('#marker');

  assert.deepEqual(detection.findPromotedCards(marker, ['Promoted']), []);
  marker.textContent = 'Promoted';
  const cards = detection.findPromotedCards(marker, ['Promoted']);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].getAttribute('data-occludable-job-id'), '1');
});
