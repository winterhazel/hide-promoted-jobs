const JOBS_PATH = '/jobs/search/';
const PATH_OBSERVER = new MutationObserver((mutations) => checkPathChanges());
const JOB_LIST_OBSERVER = new MutationObserver((mutations) => run());

let enabled;
let oldPath;

function checkPathChanges() {
  if (oldPath !== window.location.pathname) {
    oldPath = window.location.pathname;
    connectJobListObserver();
  }
}

function run() {
  const display = enabled ? 'none' : 'initial';
  const elements = document.querySelectorAll('.t-12.t-normal.t-black--light.job-card-container__footer-item');
  elements.forEach((element) => {
    element.parentElement.closest('div > ul > li').style.display = display;
  });
}

function connectPathObserver() {
  PATH_OBSERVER.disconnect();
  PATH_OBSERVER.observe(document.body, {childList: true, subtree: true});
}

function connectJobListObserver() {
  JOB_LIST_OBSERVER.disconnect();
  if (window.location.pathname.startsWith(JOBS_PATH)) {
    const JOB_LIST = document.querySelector('ul.scaffold-layout__list-container');
    if (JOB_LIST) {
      JOB_LIST_OBSERVER.observe(JOB_LIST, {childList: true, subtree: true});
      run();
    } else {
      setTimeout(connectJobListObserver, 300);
    }
  }
}

function initialize() {
  browser.storage.local.get().then((options) => {
    enabled = options.enabled;
    connectPathObserver();
    connectJobListObserver();
  });
}

browser.storage.onChanged.addListener(initialize);
initialize();
