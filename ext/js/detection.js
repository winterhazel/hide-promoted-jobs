(function initializeDetection(globalScope) {
  const CLASSIC_CARD_SELECTOR =
    'li[data-occludable-job-id].scaffold-layout__list-item';
  const CLASSIC_HOST_SELECTOR = '.job-card-container[data-job-id]';
  const CLASSIC_FOOTER_SELECTOR = 'li.job-card-container__footer-item';
  const MAX_SDUI_OWNER_DEPTH = 2;

  function normalizeText(value) {
    return String(value == null ? '' : value)
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function isSet(value) {
    return Object.prototype.toString.call(value) === '[object Set]';
  }

  function normalizeLabels(labels) {
    if (!Array.isArray(labels) && !isSet(labels)) {
      return new Set();
    }

    return new Set(Array.from(labels, normalizeText).filter(Boolean));
  }

  function isElement(node) {
    return Boolean(node && node.nodeType === 1);
  }

  function queryIncludingRoot(root, selector) {
    const matches = [];

    if (isElement(root) && root.matches(selector)) {
      matches.push(root);
    }

    root.querySelectorAll(selector).forEach((element) => {
      matches.push(element);
    });

    return matches;
  }

  function hasExactLeafMarker(container, labels) {
    return Array.from(container.querySelectorAll('p, span')).some(
      (element) =>
        element.children.length === 0 &&
        labels.has(normalizeText(element.textContent))
    );
  }

  function isClassicPromotedCard(card, labels) {
    const host = card.querySelector(CLASSIC_HOST_SELECTOR);

    if (!host || !host.querySelector('a[href*="/jobs/view/"]')) {
      return false;
    }

    return Array.from(host.querySelectorAll(CLASSIC_FOOTER_SELECTOR)).some(
      (footerItem) => hasExactLeafMarker(footerItem, labels)
    );
  }

  function findClassicCards(root, labels) {
    const cards = new Set(queryIncludingRoot(root, CLASSIC_CARD_SELECTOR));

    if (isElement(root)) {
      const owner = root.closest(CLASSIC_CARD_SELECTOR);
      if (owner) {
        cards.add(owner);
      }
    }

    return Array.from(cards).filter((card) =>
      isClassicPromotedCard(card, labels)
    );
  }

  function isQualifyingCollectionLink(anchor) {
    const href = anchor.getAttribute('href') || '';
    const baseUrl = anchor.ownerDocument.baseURI || 'https://www.linkedin.com/';

    try {
      const url = new URL(href, baseUrl);
      return (
        url.pathname.startsWith('/jobs/collections/') &&
        url.searchParams.has('currentJobId')
      );
    } catch {
      return false;
    }
  }

  function directChildContaining(ancestor, descendant) {
    let branch = descendant;

    while (branch && branch.parentElement !== ancestor) {
      branch = branch.parentElement;
    }

    return branch && branch.parentElement === ancestor ? branch : null;
  }

  function findSduiOwner(wrapper, markerLink) {
    let candidate = wrapper.parentElement;
    let depth = 0;

    while (
      candidate &&
      depth < MAX_SDUI_OWNER_DEPTH &&
      candidate.tagName !== 'BODY' &&
      candidate.tagName !== 'HTML'
    ) {
      const jobLinks = Array.from(candidate.querySelectorAll('a[href]')).filter(
        isQualifyingCollectionLink
      );
      const dismissButtons = Array.from(
        candidate.querySelectorAll('button[aria-label]')
      ).filter((button) => (button.getAttribute('aria-label') || '').trim());

      if (
        jobLinks.length === 1 &&
        jobLinks[0] === markerLink &&
        dismissButtons.length === 1
      ) {
        const contentBranch = directChildContaining(candidate, wrapper);
        const actionBranch = directChildContaining(
          candidate,
          dismissButtons[0]
        );

        if (contentBranch && actionBranch && contentBranch !== actionBranch) {
          return candidate;
        }
      }

      candidate = candidate.parentElement;
      depth += 1;
    }

    return null;
  }

  function findSduiCards(root, labels) {
    const links = new Set(
      queryIncludingRoot(root, 'a[href]').filter(isQualifyingCollectionLink)
    );

    if (isElement(root)) {
      const ownerLink = root.closest('a[href]');
      if (ownerLink && isQualifyingCollectionLink(ownerLink)) {
        links.add(ownerLink);
      }

      let ancestor = root.parentElement;
      let depth = 0;
      while (ancestor && depth < MAX_SDUI_OWNER_DEPTH) {
        queryIncludingRoot(ancestor, 'a[href]')
          .filter(isQualifyingCollectionLink)
          .forEach((link) => links.add(link));
        ancestor = ancestor.parentElement;
        depth += 1;
      }
    }

    const cards = new Set();
    links.forEach((link) => {
      if (!hasExactLeafMarker(link, labels)) {
        return;
      }

      const wrapper = link.closest('[data-display-contents]');
      if (!wrapper) {
        return;
      }

      const card = findSduiOwner(wrapper, link);
      if (card) {
        cards.add(card);
      }
    });

    return Array.from(cards);
  }

  function findPromotedCards(root, labels) {
    const normalizedLabels = normalizeLabels(labels);

    if (
      normalizedLabels.size === 0 ||
      !root ||
      typeof root.querySelectorAll !== 'function'
    ) {
      return [];
    }

    return Array.from(
      new Set([
        ...findClassicCards(root, normalizedLabels),
        ...findSduiCards(root, normalizedLabels),
      ])
    );
  }

  const api = Object.freeze({ findPromotedCards, normalizeText });

  Object.assign(globalScope, { HidePromotedJobsDetection: api });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis === 'undefined' ? this : globalThis);
