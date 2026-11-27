const cityPath = '/prototypes/city.html';
const root = document.querySelector('#panzer-home');
const hero = root.querySelector('.pz-hero');
const cityTitle = hero.querySelector('#pz-city-title');
const discoverCity = document.createElement('a');
discoverCity.className = 'pz-discover-city';
discoverCity.href = '#introduction';
discoverCity.textContent = 'Scroll to discover Vizag';
hero.querySelector('.pz-city-copy').append(discoverCity);
const nav = root.querySelector('#pz-nav');
const menu = root.querySelector('.pz-menu');
const homeTitle = 'Panzer Luxury Residences';
const cityPageTitle = 'Vizag · Panzer Luxury Residences';
let cityVisible = root.classList.contains('pz-city-view');

function showRoute(city, moveFocus) {
  cityVisible = city;
  root.classList.toggle('pz-city-view', city);
  document.querySelector('.pz-city-details').hidden = !city;
  document.title = city ? cityPageTitle : homeTitle;
  hero.setAttribute('aria-labelledby', city ? 'pz-city-title' : 'pz-headline');
  menu.setAttribute('aria-expanded', 'false');
  nav.classList.remove('pz-open');
  root.dispatchEvent(new Event('pz:route-change'));
  if (moveFocus) {
    const target = city ? cityTitle : root.querySelector('#pz-search-result a') || root.querySelector('#pz-city-input');
    target?.focus({preventScroll:true});
  }
}

nav.addEventListener('click', event => {
  if (event.target.closest('.pz-city-nav')) {
    nav.classList.remove('pz-open');
    menu.setAttribute('aria-expanded', 'false');
  }
});

root.addEventListener('click', event => {
  const link = event.target.closest('#pz-search-result a');
  if (!link || link.pathname !== cityPath || event.defaultPrevented || event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  event.preventDefault();
  history.replaceState({...history.state, panzerQuery:root.querySelector('#pz-city-input').value}, '');
  history.pushState({panzerCity:true}, '', link.href);
  showRoute(true, true);
  window.scrollTo({top:0,behavior:'instant'});
});

window.addEventListener('popstate', () => {
  const city = location.pathname === cityPath;
  if (city !== cityVisible) {
    if (!city && !root.querySelector('#pz-search-result a') && history.state?.panzerQuery) {
      root.querySelector('#pz-city-input').value = history.state.panzerQuery;
      root.querySelector('.pz-search').requestSubmit();
    }
    showRoute(city, true);
  }
});
if (cityVisible) {
  root.dispatchEvent(new CustomEvent('pz:city-submitted', {detail:{city:'Vizag'}}));
  showRoute(true, false);
}

