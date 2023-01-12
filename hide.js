const JOBS_PATH = '/jobs/search/';

setInterval(() => {
  if (window.location.pathname.startsWith(JOBS_PATH)) {
    const elements = document.querySelectorAll('.t-12.t-normal.t-black--light.job-card-container__footer-item');
    elements.forEach((element) => {
      element.parentElement.closest('div > ul > li').remove();
    });
  }
}, 300);