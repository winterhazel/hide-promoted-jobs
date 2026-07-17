const BADGE_TEXT = { true: 'ON', false: 'OFF' };
const BADGE_COLOR = { true: 'green', false: 'red' };
const DEFAULT_ENABLED = true;

function getEnabled(callback) {
  chrome.storage.local.get('enabled', (options) => {
    if (typeof options.enabled !== 'undefined') {
      callback(options.enabled);
      return;
    }

    chrome.storage.local.set({ enabled: DEFAULT_ENABLED }, () => {
      callback(DEFAULT_ENABLED);
    });
  });
}

function initialize() {
  getEnabled(updateBadge);
}

function toggle() {
  getEnabled((enabled) => {
    const nextEnabled = !enabled;
    chrome.storage.local.set({ enabled: nextEnabled }, () => {
      updateBadge(nextEnabled);
    });
  });
}

function updateBadge(enabled) {
  chrome.action.setBadgeText({ text: BADGE_TEXT[enabled] });
  chrome.action.setBadgeBackgroundColor({
    color: BADGE_COLOR[enabled],
  });
}

chrome.action.onClicked.addListener(toggle);
chrome.runtime.onInstalled.addListener(initialize);
chrome.runtime.onStartup.addListener(initialize);
initialize();
