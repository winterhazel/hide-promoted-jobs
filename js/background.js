const BADGE_TEXT = {true: 'ON', false: 'OFF'};
const BADGE_COLOR = {true: 'green', false: 'red'};

browser.storage.local.get().then((options) => {
  // Initialize default storage values
  if (!options) {
    options = {
      enabled: true,
    };
    browser.storage.local.set(options);
  }
  // Extension icon click
  browser.browserAction.onClicked.addListener((tab) => toggle(options));
  updateBadgeText(options.enabled);
});

function toggle(options) {
  options.enabled = !options.enabled;
  browser.storage.local.set(options);
  updateBadgeText(options.enabled);
}

function updateBadgeText(enabled) {
  browser.browserAction.setBadgeText({text: BADGE_TEXT[enabled]});
  browser.browserAction.setBadgeBackgroundColor({color: BADGE_COLOR[enabled]});
}
