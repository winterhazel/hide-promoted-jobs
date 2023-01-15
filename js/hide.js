const JOBS_PATH = '/jobs/search/';

let interval;
let enabled;

function initialize() {
  if (interval) {
    clearInterval(interval);
  }

  browser.storage.local.get().then((options) => {
    run(options);
  });
}

function run(options) {
  enabled = options.enabled;
  interval = setInterval(() => {
    if (!window.location.pathname.startsWith(JOBS_PATH)) {
      return;
    }

    const display = enabled ? 'none' : 'initial';
    const elements = document.querySelectorAll('.t-12.t-normal.t-black--light.job-card-container__footer-item');
    elements.forEach((element) => {
      element.parentElement.closest('div > ul > li').style.display = display;
    });
  }, 300);
}

browser.storage.onChanged.addListener(initialize);
initialize();
