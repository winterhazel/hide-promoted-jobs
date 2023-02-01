const BADGE_TEXT = {true: 'ON', false: 'OFF'};
const BADGE_COLOR = {true: 'green', false: 'red'};

function initialize() {
  browser.storage.local.get('enabled', function(options) {
    if (typeof options.enabled === 'undefined') {
      options = {
        enabled: true,
      };
      browser.storage.local.set(options);
    }
    browser.browserAction.onClicked.addListener((tab) => toggle(options));
    updateBadgeText(options.enabled);
  });
}

function toggle(options) {
  options.enabled = !options.enabled;
  browser.storage.local.set(options);
  updateBadgeText(options.enabled);
}

function updateBadgeText(enabled) {
  browser.browserAction.setBadgeText({text: BADGE_TEXT[enabled]});
  browser.browserAction.setBadgeBackgroundColor({color: BADGE_COLOR[enabled]});
}

browser.tabs.onCreated.addListener(initialize);
initialize();
