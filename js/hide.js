const JOBS_PATH = '/jobs/search/';
const PATH_OBSERVER = new MutationObserver((mutations) => checkPathChanges());
const JOB_LIST_OBSERVER = new MutationObserver((mutations) => run());

let enabled;
let oldPath;
let tags;

function checkPathChanges() {
  if (oldPath !== window.location.pathname) {
    oldPath = window.location.pathname;
    connectJobListObserver();
  }
}

function run() {
  const display = enabled ? 'none' : 'initial';
  const li_elements = document.querySelectorAll('li');
  li_elements.forEach((li) => {
    const innerText = li.innerText.trim().toLowerCase();
    if (tags.indexOf(innerText) === -1) {
      return;
    }

    const job_item = li.parentElement.closest('ul > li');
    if (job_item) {
      job_item.style.display = display;
    }
  });
}

function connectPathObserver() {
  PATH_OBSERVER.disconnect();
  PATH_OBSERVER.observe(document.body, {childList: true, subtree: true});
}

function connectJobListObserver() {
  JOB_LIST_OBSERVER.disconnect();
  if (window.location.pathname.startsWith(JOBS_PATH)) {
    const JOB_LIST = document.querySelector('.jobs-search-results-list');
    if (JOB_LIST && tags) {
      JOB_LIST_OBSERVER.observe(JOB_LIST, {childList: true, subtree: true});
      run();
    } else {
      setTimeout(connectJobListObserver, 300);
    }
  }
}

function initialize() {
  if (!tags) {
    let lang_file = browser.runtime.getURL('lang.json');
    fetch(lang_file).then((response) => response.json()).then((json) => {
      tags = [json[document.documentElement.lang]].flat().map(tag => tag.toLowerCase());
      console.log(tags);
    });
  }

  browser.storage.local.get().then((options) => {
    enabled = options.enabled;
    connectPathObserver();
    connectJobListObserver();
  });
}

browser.storage.onChanged.addListener(initialize);
initialize();
