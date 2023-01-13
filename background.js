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
  const badgeText = enabled ? 'ON' : 'OFF';
  const badgeColor = enabled ? 'green' : 'red';
  browser.browserAction.setBadgeText({text: badgeText});
  browser.browserAction.setBadgeBackgroundColor({color: badgeColor});
}
