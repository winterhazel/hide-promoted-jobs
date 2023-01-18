const BADGE_TEXT = {true: 'ON', false: 'OFF'};
const BADGE_COLOR = {true: 'green', false: 'red'};

function initialize() {
  chrome.storage.local.get('enabled', function(options) {
    if (typeof options.enabled === 'undefined') {
      options = {
        enabled: true,
      };
      chrome.storage.local.set(options);
    }
    chrome.action.onClicked.addListener((tab) => toggle(options));
    updateBadgeText(options.enabled);
  });
}

function toggle(options) {
  options.enabled = !options.enabled;
  chrome.storage.local.set(options);
  updateBadgeText(options.enabled);
}

function updateBadgeText(enabled) {
  chrome.action.setBadgeText({text: BADGE_TEXT[enabled]});
  chrome.action.setBadgeBackgroundColor({color: BADGE_COLOR[enabled]});
}

chrome.tabs.onCreated.addListener(initialize);
initialize();
