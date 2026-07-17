const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const contentSource = fs.readFileSync(
  path.join(__dirname, '..', 'ext', 'js', 'hide.js'),
  'utf8'
);

function createCard({ display = '', priority = '', hasStyle = false } = {}) {
  const attributes = new Map();
  let displayValue = display;
  let displayPriority = priority;

  if (hasStyle) {
    attributes.set('style', display ? `display: ${display}` : '');
  }

  return {
    nodeType: 1,
    style: {
      getPropertyValue(name) {
        return name === 'display' ? displayValue : '';
      },
      getPropertyPriority(name) {
        return name === 'display' ? displayPriority : '';
      },
      setProperty(name, value, nextPriority) {
        if (name === 'display') {
          displayValue = value;
          displayPriority = nextPriority;
          attributes.set('style', `display: ${value}`);
        }
      },
      removeProperty(name) {
        if (name === 'display') {
          displayValue = '';
          displayPriority = '';
          attributes.set('style', '');
        }
      },
    },
    hasAttribute(name) {
      return attributes.has(name);
    },
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null;
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
  };
}

async function flushPromises() {
  await new Promise((resolve) => {
    setImmediate(resolve);
  });
}

async function runContent({
  card = createCard(),
  enabled = true,
  fetchResult = { en: 'Promoted' },
  frame = false,
  lang = 'en-US',
  pathname = '/jobs/search/',
  findPromotedCards = () => [card],
} = {}) {
  const storageChangedListeners = [];
  let documentQueryCount = 0;
  const body = { nodeType: 1 };
  const documentElement = { dataset: {}, lang };
  const document = {
    body,
    documentElement,
    querySelectorAll(selector) {
      documentQueryCount += 1;
      if (
        selector === '[data-hide-promoted-jobs-hidden]' &&
        card.hasAttribute('data-hide-promoted-jobs-hidden')
      ) {
        return [card];
      }
      return [];
    },
  };
  const window = { location: { pathname } };
  window.self = window;
  window.top = frame ? {} : window;
  let observer;

  class CapturingMutationObserver {
    constructor(callback) {
      this.callback = callback;
      observer = this;
    }

    disconnect() {
      this.disconnected = true;
    }

    observe(root, options) {
      this.root = root;
      this.options = options;
    }
  }

  const context = {
    chrome: {
      runtime: {
        getURL: (resource) => `chrome-extension://test/${resource}`,
      },
      storage: {
        local: {
          get(defaults, callback) {
            callback({
              enabled:
                typeof enabled === 'boolean' ? enabled : defaults.enabled,
            });
          },
        },
        onChanged: {
          addListener(listener) {
            storageChangedListeners.push(listener);
          },
        },
      },
    },
    document,
    fetch: async () => {
      if (fetchResult instanceof Error) {
        throw fetchResult;
      }
      return {
        ok: fetchResult !== 'non-ok',
        json: async () => fetchResult,
      };
    },
    HidePromotedJobsDetection: { findPromotedCards },
    MutationObserver: CapturingMutationObserver,
    window,
  };

  vm.runInNewContext(contentSource, context);
  await flushPromises();

  return {
    card,
    context,
    getDocumentQueryCount: () => documentQueryCount,
    observer,
    storageChangedListener: storageChangedListeners[0],
    window,
  };
}

test('hides, exactly restores, and re-hides extension-owned cards', async () => {
  const card = createCard({
    display: 'grid',
    priority: 'important',
    hasStyle: true,
  });
  const runtime = await runContent({ card });

  assert.equal(card.style.getPropertyValue('display'), 'none');
  assert.equal(card.style.getPropertyPriority('display'), 'important');
  assert.equal(card.hasAttribute('data-hide-promoted-jobs-hidden'), true);

  runtime.storageChangedListener(
    { enabled: { oldValue: true, newValue: false } },
    'local'
  );
  assert.equal(card.style.getPropertyValue('display'), 'grid');
  assert.equal(card.style.getPropertyPriority('display'), 'important');
  assert.equal(card.hasAttribute('style'), true);
  assert.equal(card.hasAttribute('data-hide-promoted-jobs-hidden'), false);

  runtime.storageChangedListener(
    { enabled: { oldValue: false, newValue: true } },
    'local'
  );
  assert.equal(card.style.getPropertyValue('display'), 'none');
});

test('restores the absence of an original inline style attribute', async () => {
  const card = createCard();
  const runtime = await runContent({ card });

  runtime.storageChangedListener(
    { enabled: { oldValue: true, newValue: false } },
    'local'
  );
  assert.equal(card.style.getPropertyValue('display'), '');
  assert.equal(card.hasAttribute('style'), false);
});

test('processes an added subtree without rescanning the mutation target', async () => {
  const card = createCard();
  const addedRoot = { nodeType: 1 };
  const mutationTarget = { nodeType: 1 };
  const scannedRoots = [];
  let dynamicCardReady = false;
  const runtime = await runContent({
    findPromotedCards(root) {
      scannedRoots.push(root);
      return dynamicCardReady && root === addedRoot ? [card] : [];
    },
  });
  scannedRoots.length = 0;
  dynamicCardReady = true;

  runtime.observer.callback([
    { target: mutationTarget, addedNodes: [addedRoot] },
  ]);

  assert.deepEqual(scannedRoots, [addedRoot]);
  assert.equal(card.style.getPropertyValue('display'), 'none');
});

test('observes attribute and text hydration on affected card subtrees', async () => {
  const card = createCard();
  const attributeTarget = {
    nodeType: 1,
    closest: () => null,
    hasAttribute: () => false,
    querySelectorAll: () => [],
  };
  let promoted = false;
  const runtime = await runContent({
    findPromotedCards(root) {
      return promoted && root === attributeTarget ? [card] : [];
    },
  });

  assert.equal(runtime.observer.options.attributes, true);
  assert.equal(runtime.observer.options.characterData, true);
  assert.deepEqual(Array.from(runtime.observer.options.attributeFilter), [
    'aria-label',
    'class',
    'data-display-contents',
    'data-job-id',
    'data-occludable-job-id',
    'href',
  ]);

  promoted = true;
  runtime.observer.callback([
    { type: 'attributes', target: attributeTarget, addedNodes: [] },
  ]);
  assert.equal(card.style.getPropertyValue('display'), 'none');
});

test('keeps a promoted SDUI card hidden after an action-branch mutation', async () => {
  const card = createCard();
  card.closest = () => card;
  card.querySelectorAll = () => [];
  const actionControl = {
    nodeType: 1,
    closest: () => card,
    hasAttribute: () => false,
    querySelectorAll: () => [],
  };
  const runtime = await runContent({
    card,
    findPromotedCards(root) {
      return root === actionControl ? [] : [card];
    },
  });
  assert.equal(card.style.getPropertyValue('display'), 'none');

  runtime.observer.callback([
    { type: 'attributes', target: actionControl, addedNodes: [] },
  ]);
  assert.equal(card.style.getPropertyValue('display'), 'none');
  assert.equal(card.hasAttribute('data-hide-promoted-jobs-hidden'), true);
});

test('hides an SDUI card when its action evidence hydrates', async () => {
  const card = createCard();
  const actionControl = {
    nodeType: 1,
    closest: () => null,
    hasAttribute: () => false,
    querySelectorAll: () => [],
  };
  const runtime = await runContent({
    card,
    findPromotedCards(root) {
      return root === actionControl ? [card] : [];
    },
  });
  assert.equal(card.style.getPropertyValue('display'), '');

  runtime.observer.callback([
    { type: 'attributes', target: actionControl, addedNodes: [] },
  ]);
  assert.equal(card.style.getPropertyValue('display'), 'none');
});

test('restores a hidden card when virtualization recycles it as organic', async () => {
  const card = createCard();
  let promoted = true;
  const runtime = await runContent({
    card,
    findPromotedCards() {
      return promoted ? [card] : [];
    },
  });
  assert.equal(card.style.getPropertyValue('display'), 'none');

  promoted = false;
  runtime.observer.callback([
    {
      type: 'characterData',
      target: { parentElement: runtime.context.document },
      addedNodes: [],
    },
  ]);
  assert.equal(card.style.getPropertyValue('display'), '');
  assert.equal(card.hasAttribute('data-hide-promoted-jobs-hidden'), false);
});

test('restores and releases hidden cards removed from the document', async () => {
  const card = createCard({
    display: 'grid',
    priority: 'important',
    hasStyle: true,
  });
  const removedRoot = {
    nodeType: 1,
    hasAttribute: () => false,
    closest: () => null,
    querySelectorAll: () => [card],
  };
  let initialScan = true;
  const runtime = await runContent({
    card,
    findPromotedCards() {
      if (initialScan) {
        initialScan = false;
        return [card];
      }
      return [];
    },
  });
  assert.equal(card.style.getPropertyValue('display'), 'none');

  runtime.observer.callback([
    {
      type: 'childList',
      target: { nodeType: 1 },
      addedNodes: [],
      removedNodes: [removedRoot],
    },
  ]);

  assert.equal(card.style.getPropertyValue('display'), 'grid');
  assert.equal(card.style.getPropertyPriority('display'), 'important');
  assert.equal(card.hasAttribute('data-hide-promoted-jobs-hidden'), false);
});

test('cards added while disabled are handled when the extension is re-enabled', async () => {
  const card = createCard();
  let cardReady = false;
  const runtime = await runContent({
    enabled: false,
    findPromotedCards() {
      return cardReady ? [card] : [];
    },
  });
  cardReady = true;
  runtime.observer.callback([{ target: {}, addedNodes: [{ nodeType: 1 }] }]);
  assert.equal(card.style.getPropertyValue('display'), '');

  runtime.storageChangedListener(
    { enabled: { oldValue: false, newValue: true } },
    'local'
  );
  assert.equal(card.style.getPropertyValue('display'), 'none');
});

test('client-side navigation restores cards when leaving supported Jobs paths', async () => {
  const runtime = await runContent();
  assert.equal(runtime.card.style.getPropertyValue('display'), 'none');

  runtime.window.location.pathname = '/feed/';
  runtime.observer.callback([{ target: {}, addedNodes: [] }]);
  assert.equal(runtime.card.style.getPropertyValue('display'), '');
  assert.equal(
    runtime.card.hasAttribute('data-hide-promoted-jobs-hidden'),
    false
  );
});

test('limits hiding to supported Jobs documents and framed preload documents', async () => {
  const unsupported = await runContent({ pathname: '/feed/' });
  assert.equal(unsupported.card.style.getPropertyValue('display'), '');

  const detail = await runContent({ pathname: '/jobs/view/123/' });
  assert.equal(detail.card.style.getPropertyValue('display'), '');

  const topPreload = await runContent({ pathname: '/preload/' });
  assert.equal(topPreload.card.style.getPropertyValue('display'), '');

  const framedPreload = await runContent({
    pathname: '/preload/',
    frame: true,
  });
  assert.equal(framedPreload.card.style.getPropertyValue('display'), 'none');
});

test('unsupported pages avoid repeated document-wide restoration scans', async () => {
  const runtime = await runContent({ pathname: '/feed/' });
  const initialQueryCount = runtime.getDocumentQueryCount();

  runtime.observer.callback([
    {
      type: 'childList',
      target: { nodeType: 1 },
      addedNodes: [{ nodeType: 1 }],
      removedNodes: [],
    },
  ]);
  runtime.observer.callback([
    {
      type: 'childList',
      target: { nodeType: 1 },
      addedNodes: [{ nodeType: 1 }],
      removedNodes: [],
    },
  ]);

  assert.equal(runtime.getDocumentQueryCount(), initialQueryCount);
});

test('fails open when labels cannot be loaded or the locale is unknown', async () => {
  const rejected = await runContent({ fetchResult: new Error('network') });
  assert.equal(rejected.card.style.getPropertyValue('display'), '');

  const nonOk = await runContent({ fetchResult: 'non-ok' });
  assert.equal(nonOk.card.style.getPropertyValue('display'), '');

  const unknownLocale = await runContent({
    lang: 'xx',
    fetchResult: { en: 'Promoted' },
  });
  assert.equal(unknownLocale.card.style.getPropertyValue('display'), '');
});
