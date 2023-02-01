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
  const liElements = document.querySelectorAll('li');
  liElements.forEach((li) => {
    const innerText = li.innerText.trim().toLowerCase();
    if (tags.indexOf(innerText) === -1) {
      return;
    }

    const jobItem = li.parentElement.closest('ul > li');
    if (jobItem) {
      jobItem.style.display = display;
    }
  });
}

function connectPathObserver() {
  PATH_OBSERVER.disconnect();
  PATH_OBSERVER.observe(document.body, { childList: true, subtree: true });
}

function connectJobListObserver() {
  JOB_LIST_OBSERVER.disconnect();
  if (window.location.pathname.startsWith(JOBS_PATH)) {
    const JOB_LIST = document.querySelector('.jobs-search-results-list');
    if (JOB_LIST && tags) {
      JOB_LIST_OBSERVER.observe(JOB_LIST, { childList: true, subtree: true });
      run();
    } else {
      setTimeout(connectJobListObserver, 300);
    }
  }
}

function initialize() {
  if (!tags) {
    const langsFile = chrome.runtime.getURL('js/langs.json');
    fetch(langsFile)
      .then((response) => response.json())
      .then((json) => {
        tags = [json[document.documentElement.lang]]
          .flat()
          .map((tag) => tag.toLowerCase());
      });
  }

  chrome.storage.local.get().then((options) => {
    enabled = options.enabled;
    connectPathObserver();
    connectJobListObserver();
  });
}

chrome.storage.onChanged.addListener(initialize);
initialize();
