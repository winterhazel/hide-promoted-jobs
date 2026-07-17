const HIDDEN_ATTRIBUTE = 'data-hide-promoted-jobs-hidden';
const ORIGINAL_DISPLAY_ATTRIBUTE = 'data-hide-promoted-jobs-original-display';
const ORIGINAL_PRIORITY_ATTRIBUTE =
  'data-hide-promoted-jobs-original-display-priority';
const HAD_STYLE_ATTRIBUTE = 'data-hide-promoted-jobs-had-style';
const DOCUMENT_OBSERVER = new MutationObserver(handleMutations);
const ownedCards = new Set();

let enabled;
let labels;

function getDetectionApi() {
  return globalThis.HidePromotedJobsDetection;
}

function setEnabled(nextEnabled) {
  enabled = nextEnabled;
  document.documentElement.dataset.hidePromotedJobs = enabled
    ? 'enabled'
    : 'disabled';
}

function isSupportedDocument() {
  const { pathname } = window.location;
  if (pathname === '/preload/' || pathname === '/preload') {
    return window.self !== window.top;
  }

  return (
    pathname === '/jobs' ||
    pathname === '/jobs/' ||
    pathname === '/jobs/search' ||
    pathname.startsWith('/jobs/search/') ||
    pathname === '/jobs/collections' ||
    pathname.startsWith('/jobs/collections/')
  );
}

function hideCard(card) {
  if (card.hasAttribute(HIDDEN_ATTRIBUTE)) {
    return;
  }

  const hadStyle = card.hasAttribute('style');
  card.setAttribute(
    ORIGINAL_DISPLAY_ATTRIBUTE,
    card.style.getPropertyValue('display')
  );
  card.setAttribute(
    ORIGINAL_PRIORITY_ATTRIBUTE,
    card.style.getPropertyPriority('display')
  );
  card.setAttribute(HAD_STYLE_ATTRIBUTE, hadStyle ? 'true' : 'false');
  card.setAttribute(HIDDEN_ATTRIBUTE, '');
  card.style.setProperty('display', 'none', 'important');
  ownedCards.add(card);
}

function restoreCard(card) {
  const originalDisplay = card.getAttribute(ORIGINAL_DISPLAY_ATTRIBUTE) || '';
  const originalPriority = card.getAttribute(ORIGINAL_PRIORITY_ATTRIBUTE) || '';
  const hadStyle = card.getAttribute(HAD_STYLE_ATTRIBUTE) === 'true';

  if (originalDisplay) {
    card.style.setProperty('display', originalDisplay, originalPriority);
  } else {
    card.style.removeProperty('display');
  }

  card.removeAttribute(HIDDEN_ATTRIBUTE);
  card.removeAttribute(ORIGINAL_DISPLAY_ATTRIBUTE);
  card.removeAttribute(ORIGINAL_PRIORITY_ATTRIBUTE);
  card.removeAttribute(HAD_STYLE_ATTRIBUTE);
  ownedCards.delete(card);

  if (!hadStyle && (card.getAttribute('style') || '').trim() === '') {
    card.removeAttribute('style');
  }
}

function restoreCards() {
  const cards = new Set([
    ...ownedCards,
    ...document.querySelectorAll(`[${HIDDEN_ATTRIBUTE}]`),
  ]);
  cards.forEach((card) => restoreCard(card));
}

function collectOwnedCards(root, cards) {
  if (!root) {
    return;
  }

  if (root.nodeType === 1) {
    if (
      typeof root.hasAttribute === 'function' &&
      root.hasAttribute(HIDDEN_ATTRIBUTE)
    ) {
      cards.add(root);
    }
    const owner =
      typeof root.closest === 'function'
        ? root.closest(`[${HIDDEN_ATTRIBUTE}]`)
        : null;
    if (owner) {
      cards.add(owner);
    }
  }

  if (typeof root.querySelectorAll === 'function') {
    root
      .querySelectorAll(`[${HIDDEN_ATTRIBUTE}]`)
      .forEach((card) => cards.add(card));
  }
}

function scanRoots(roots) {
  const rootList = Array.from(roots);
  const detection = getDetectionApi();
  if (!isSupportedDocument()) {
    if (ownedCards.size > 0 || rootList.includes(document)) {
      restoreCards();
    }
    return;
  }

  if (!enabled || !labels || labels.length === 0 || !detection) {
    return;
  }

  const promotedCards = new Set();
  const affectedOwnedCards = new Set();
  rootList.forEach((root) => {
    collectOwnedCards(root, affectedOwnedCards);
  });

  const detectionRoots = new Set([...rootList, ...affectedOwnedCards]);
  detectionRoots.forEach((root) => {
    detection
      .findPromotedCards(root, labels)
      .forEach((card) => promotedCards.add(card));
  });
  affectedOwnedCards.forEach((card) => {
    if (!promotedCards.has(card)) {
      restoreCard(card);
    }
  });
  promotedCards.forEach((card) => hideCard(card));
}

function scanDocument() {
  scanRoots([document]);
}

function handleMutations(mutations) {
  if (!enabled || !labels) {
    return;
  }

  const roots = new Set();
  const removedOwnedCards = new Set();
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.target.nodeType === 1) {
      roots.add(mutation.target);
    } else if (mutation.type === 'characterData') {
      if (mutation.target.parentElement) {
        roots.add(mutation.target.parentElement);
      }
    }

    Array.from(mutation.addedNodes || []).forEach((node) => {
      if (node.nodeType === 1) {
        roots.add(node);
      } else if (node.parentElement) {
        roots.add(node.parentElement);
      }
    });

    Array.from(mutation.removedNodes || []).forEach((node) => {
      collectOwnedCards(node, removedOwnedCards);
    });

    if (
      (mutation.removedNodes || []).length > 0 &&
      mutation.target.nodeType === 1
    ) {
      roots.add(mutation.target);
    }
  });
  removedOwnedCards.forEach((card) => restoreCard(card));
  scanRoots(roots);
}

function connectObserver() {
  DOCUMENT_OBSERVER.disconnect();
  const root = document.body || document.documentElement;
  if (root) {
    DOCUMENT_OBSERVER.observe(root, {
      attributeFilter: [
        'aria-label',
        'class',
        'data-display-contents',
        'data-job-id',
        'data-occludable-job-id',
        'href',
      ],
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
  }
}

function applyCurrentState() {
  if (typeof enabled === 'undefined' || !labels) {
    return;
  }

  if (enabled) {
    scanDocument();
  } else {
    restoreCards();
  }
}

function loadLabels() {
  const langsFile = chrome.runtime.getURL('js/langs.json');
  fetch(langsFile)
    .then((response) => {
      if (response.ok === false) {
        throw new Error('Unable to load promoted labels.');
      }
      return response.json();
    })
    .then((json) => {
      const locale = (document.documentElement.lang || 'en')
        .toLowerCase()
        .split('-')[0];
      labels = [json[locale] || []].flat();
      applyCurrentState();
    })
    .catch(() => {
      labels = [];
    });
}

function handleStorageChange(changes, areaName) {
  if (areaName !== 'local' || !changes.enabled) {
    return;
  }

  setEnabled(changes.enabled.newValue);
  applyCurrentState();
}

function initialize() {
  connectObserver();
  loadLabels();
  chrome.storage.local.get({ enabled: true }, (options) => {
    setEnabled(options.enabled);
    applyCurrentState();
  });
}

chrome.storage.onChanged.addListener(handleStorageChange);
initialize();
