import {entry,matches,normalize,starters,submittedCity} from './city-match.mjs';

const input=document.querySelector('#pz-city-input');
const form=input.closest('form');
// Browsers also match :focus-visible on text fields focused by a mouse or finger.
for(const field of document.querySelectorAll('#pz-city-input, #pz-property-city')){
  field.addEventListener('pointerdown',()=>field.setAttribute('data-pointer-focus',''));
  field.addEventListener('blur',()=>field.removeAttribute('data-pointer-focus'));
  field.addEventListener('keydown',event=>{
    if(['Tab','ArrowDown','ArrowUp','Escape'].includes(event.key))field.removeAttribute('data-pointer-focus');
  });
}
const panel=form.querySelector('.pz-suggestions');
const list=panel.querySelector('[role=listbox]');
const status=panel.querySelector('.pz-suggestions-status');
const countryNames=new Intl.DisplayNames(['en'],{type:'region'});
let directory,request=0,options=[],active=-1,open=false;

function loadCities() {
  directory??=fetch(new URL('./city-directory.tsv?v=india',import.meta.url))
    .then(async response=>{
      if(!response.ok) throw Error('Directory unavailable');
      return (await response.text()).trimEnd().split(/\r?\n/)
        .filter(line=>line.startsWith('IN\t'))
        .map(line=>entry(line.split('\t')));
    }).catch(error=>{directory=undefined;throw error;});
  return directory;
}

form.resolveCity=async text=>{
  const key=normalize(text.trim());
  const popular=starters.find(city=>city.keys.includes(key));
  if(popular) return popular;
  const cities=await loadCities();
  const exact=cities.find(city=>city.keys.includes(key));
  return exact || starters.find(city=>city.name===submittedCity(text));
};

function close() {
  open=false;
  request++;
  active=-1;
  panel.hidden=true;
  input.setAttribute('aria-expanded','false');
  input.removeAttribute('aria-activedescendant');
}

function highlight(index) {
  active=index;
  Array.from(list.children).forEach((option,i)=>option.setAttribute('aria-selected',String(i===index)));
  if(index<0) input.removeAttribute('aria-activedescendant');
  else {
    input.setAttribute('aria-activedescendant',list.children[index].id);
    list.children[index].scrollIntoView({block:'nearest'});
  }
}

function render(cities,message='') {
  const previous=options[active];
  options=cities;
  list.replaceChildren(...cities.map((city,i)=>{
    const item=document.createElement('li');
    item.id='pz-city-option-'+i;
    item.dataset.index=i;
    item.setAttribute('role','option');
    const name=document.createElement('span'),country=document.createElement('small');
    name.textContent=city.name;
    country.textContent=countryNames.of(city.country);
    item.append(name,country);
    return item;
  }));
  status.textContent=message || (cities.length?'':'No matching cities in India');
  highlight(previous?cities.findIndex(c=>c.name===previous.name && c.country===previous.country):-1);
}

async function suggest() {
  const query=input.value.trim(),id=++request;
  open=true;
  active=-1;
  panel.hidden=false;
  input.setAttribute('aria-expanded','true');
  render(matches(query),query?'Searching cities…':'Popular cities in India');
  try {
    const cities=await loadCities();
    if(open && id===request && query) render(matches(query,cities));
  } catch {
    if(open && id===request && query) render(matches(query),'India city directory unavailable');
  }
}

function accept(index) {
  if(options[index]) input.value=options[index].name;
}

input.addEventListener('focus',suggest);
input.addEventListener('click',()=>{if(!open) suggest();});
input.addEventListener('input',suggest);
input.addEventListener('blur',close);
input.addEventListener('keydown',event=>{
  if(event.isComposing) return;
  if(event.key==='Escape' && open){event.preventDefault();close();return;}
  if(event.key==='ArrowDown'||event.key==='ArrowUp') {
    event.preventDefault();
    if(!open) suggest();
    if(options.length) highlight(event.key==='ArrowDown'?(active+1)%options.length:(active<=0?options.length-1:active-1));
  }
  if(event.key==='Enter' && open) {
    accept(active);
    close();
  }
},true);
list.addEventListener('pointerdown',event=>event.preventDefault());
list.addEventListener('click',event=>{
  const item=event.target.closest('[role=option]');
  if(!item) return;
  accept(Number(item.dataset.index));
  close();
  form.querySelector('.pz-button').click();
});
form.addEventListener('submit',close,true);
form.querySelector('.pz-button').addEventListener('click',close,true);
