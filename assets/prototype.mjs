const details = document.querySelector('.pz-city-details') || document;
const notice = details.querySelector('#notice');
let noticeTimer;
for (const button of details.querySelectorAll('[data-notice]')) {
  button.addEventListener('click', () => {
    notice.textContent = button.dataset.notice;
    notice.hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { notice.hidden = true; }, 6000);
  });
}
const menu = document.querySelector('.menu');
const mobileNav = document.querySelector('#mobile-nav');
if (menu && mobileNav) {
  function openMenu(open) {
    menu.setAttribute('aria-expanded', String(open));
    mobileNav.hidden = !open;
  }
  menu.addEventListener('click', () => openMenu(mobileNav.hidden));
  mobileNav.addEventListener('click', event => { if (event.target.closest('a')) openMenu(false); });
}
const points = details.querySelectorAll('.point');
const labels = details.querySelectorAll('.map-label');
let active = -1;
function select(index) {
  if (active === index) return;
  active = index;
  for (const point of points) point.classList.toggle('active', Number(point.dataset.point) === index);
  const name = points[index]?.querySelector('title')?.textContent;
  if (name) for (const label of labels) label.textContent = name;
}
select(Number(document.querySelector('[data-property-index]')?.dataset.propertyIndex || 0));
const stories = [...details.querySelectorAll('[data-story]')];
if (stories.length) {
  let queued = false;
  function follow() {
    queued = false;
    if (details.hidden) return;
    const anchor = innerWidth <= 760 ? 330 : innerHeight * .43;
    let index = 0;
    stories.forEach((story, i) => { if (story.getBoundingClientRect().top <= anchor) index = i; });
    select(index);
  }
  function schedule() {
    if (!queued && !details.hidden) { queued = true; requestAnimationFrame(follow); }
  }
  addEventListener('scroll', schedule, {passive:true});
  addEventListener('resize', schedule);
  document.querySelector('#panzer-home')?.addEventListener('pz:route-change', schedule);
  schedule();
}
const dialog = details.querySelector('#map-dialog');
for (const button of details.querySelectorAll('.expand-map')) {
  button.addEventListener('click', () => {
    const map = button.parentElement.querySelector('.map');
    dialog.querySelector('.large-map').replaceChildren(map.cloneNode(true));
    dialog.showModal();
  });
}
dialog.querySelector('.close-map').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const {left,right,top,bottom} = dialog.getBoundingClientRect();
  if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) dialog.close();
});
