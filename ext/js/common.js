(function initializeCommon(globalScope) {
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

  const api = Object.freeze({ normalizeLabels, normalizeText });

  Object.assign(globalScope, { HidePromotedJobsCommon: api });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis === 'undefined' ? this : globalThis);
