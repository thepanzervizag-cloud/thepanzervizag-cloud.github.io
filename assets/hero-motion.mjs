export const CITY_SCENES = Object.freeze({
  vizag: {src:'/assets/vizag-coast-at-dusk.webp',cool:'#aec9d4',warm:'#e9d5c4',caption:'Visakhapatnam coastline at dusk'}
});
export const STUDY_SCENES = Object.freeze({
  coast: {src:'/prototypes/coast.svg',cool:'#c9d8dc',warm:'#eee0bd',caption:'Coastal illustration · not a property photograph'},
  room: {src:'/prototypes/room.svg',cool:'#d6ded8',warm:'#e9d5b9',caption:'Room illustration · not a property photograph'}
});

export function cityKey(value){
  const key=value.trim().toLowerCase();
  return ['vizag','visakhapatnam','vishakhapatnam'].includes(key)?'vizag':key;
}

// Latest submission wins, including when a previous image finishes loading late.
// Visual failure must never interfere with the independent search results.
export function createSceneController({load,render}){
  let request=0;
  return async function submit(scene,submitted=true){
    const current=++request;
    if(!scene){render(null,submitted);return 'fallback';}
    try{await load(scene.src);}catch{
      if(current===request)render(null,submitted);
      return current===request?'fallback':'superseded';
    }
    if(current!==request)return 'superseded';
    render(scene,submitted);
    return 'image';
  };
}

export function loadSceneImage(src){
  return new Promise((resolve,reject)=>{
    const image=new Image();
    const timeout=setTimeout(()=>finish(false),8000);
    function finish(ok){clearTimeout(timeout);image.onload=null;image.onerror=null;ok?resolve():reject(new Error('Scene unavailable'));}
    image.onload=()=>finish(image.naturalWidth>0);
    image.onerror=()=>finish(false);
    image.src=src;
  });
}

// Pick a fresh destination, never a recurring circuit. Centre visits and long
// diagonal traversals mix with shorter changes of direction for a cloudy drift.
export function nextCloudTarget(previous,random=Math.random){
  let x,y;
  for(let attempt=0;attempt<8;attempt++){
    const centre=random()<.3;
    x=centre?-62+random()*24:-92+random()*84;
    y=centre?-61+random()*22:-84+random()*68;
    if(Math.hypot(x-previous.x,y-previous.y)>=25)break;
  }
  if(Math.hypot(x-previous.x,y-previous.y)<25){x=previous.x<-50?-15:-85;y=previous.y<-50?-20:-80;}
  return {x,y,rotation:-28+random()*56,sx:.95+random()*.3,sy:.86+random()*.28};
}

export function createCloudDrift(clouds,random=Math.random){
  const starts=[[-80,-65],[-20,-40],[-75,-20],[-15,-80]];
  const states=clouds.map((cloud,index)=>({cloud,start:{x:starts[index%4][0],y:starts[index%4][1],rotation:0,sx:1,sy:1},animation:null}));
  for(const state of states)state.position=state.start;
  let paused=false,reduced=false;
  const transform=p=>`translate(${p.x}%,${p.y}%) rotate(${p.rotation}deg) scale(${p.sx},${p.sy})`;
  function advance(state){
    if(reduced||typeof state.cloud.animate!=='function')return;
    const target=nextCloudTarget(state.position,random);
    const animation=state.cloud.animate([{transform:transform(state.position)},{transform:transform(target)}],{
      duration:2550+random()*1700,easing:'cubic-bezier(.45,0,.55,1)',fill:'forwards'
    });
    state.animation=animation;
    animation.onfinish=()=>{
      state.cloud.style.transform=transform(target);state.position=target;
      animation.onfinish=null;animation.cancel();state.animation=null;advance(state);
    };
    if(paused)animation.pause();
  }
  return {sync(options={}){
    paused=Boolean(options.paused);reduced=Boolean(options.reduced);
    for(const state of states){
      if(reduced){
        if(state.animation){state.animation.onfinish=null;state.animation.cancel();state.animation=null;}
        state.cloud.style.removeProperty('transform');state.position=state.start;
      }else{
        if(!state.animation)advance(state);
        if(state.animation)paused?state.animation.pause():state.animation.play();
      }
    }
  }};
}

export function initHeroMotion(root){
  const hero=root.querySelector('.pz-hero');
  const header=root.querySelector('.pz-head');
  const form=root.querySelector('.pz-search');
  if(!hero||!header||!form)return;
  const atmosphere=document.createElement('div');
  atmosphere.className='pz-atmosphere';atmosphere.setAttribute('aria-hidden','true');root.prepend(atmosphere);
  const clouds=[];
  for(const colour of ['navy','gold','teal','apricot']){
    const cloud=document.createElement('div');cloud.className=`pz-cloud pz-cloud-${colour}`;atmosphere.append(cloud);
    clouds.push(cloud);
  }
  const drift=createCloudDrift(clouds),motionPreference=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const syncDrift=()=>drift.sync({paused:root.classList.contains('pz-motion-paused')||root.classList.contains('pz-search-focused')||document.hidden,reduced:motionPreference?.matches});
  motionPreference?.addEventListener('change',syncDrift);
  document.addEventListener?.('visibilitychange',syncDrift);
  syncDrift();
  const visual=document.createElement('div');
  visual.className='pz-hero-visual';visual.setAttribute('aria-hidden','true');
  const layers=[document.createElement('div'),document.createElement('div')];
  layers.forEach(layer=>{layer.className='pz-scene-layer';visual.append(layer);});
  atmosphere.append(visual);
  const caption=document.createElement('p');caption.className='pz-scene-caption';caption.hidden=true;hero.append(caption);
  const cityCaption=hero.querySelector('.pz-city-caption');
  const toggle=document.createElement('button');toggle.type='button';toggle.className='pz-motion-toggle';
  toggle.textContent='Pause background motion';toggle.setAttribute('aria-pressed','false');hero.append(toggle);
  let paused=false,active=-1,currentSource='';
  toggle.addEventListener('click',()=>{paused=!paused;root.classList.toggle('pz-motion-paused',paused);toggle.setAttribute('aria-pressed',String(paused));toggle.textContent=paused?'Resume background motion':'Pause background motion';syncDrift();});
  form.addEventListener('focusin',()=>{root.classList.add('pz-search-focused');syncDrift();});
  form.addEventListener('focusout',event=>{if(!form.contains(event.relatedTarget))root.classList.remove('pz-search-focused');syncDrift();});
  function measure(){
    const headerHeight=header.getBoundingClientRect().height;
    const atmosphereHeight=hero.getBoundingClientRect().bottom-root.getBoundingClientRect().top;
    root.style.setProperty('--pz-header-height',`${headerHeight}px`);
    root.style.setProperty('--pz-atmosphere-height',`${atmosphereHeight}px`);
  }
  if(typeof ResizeObserver!=='undefined'){
    const observer=new ResizeObserver(measure);observer.observe(hero);observer.observe(header);
  }else{window.addEventListener('resize',measure);}
  measure();
  const submit=createSceneController({load:loadSceneImage,render:(scene,submitted)=>{
    root.classList.toggle('pz-city-submitted',submitted);
    root.classList.toggle('pz-scene-active',Boolean(scene));
    root.dataset.heroVisual=scene?'image':'gradient';
    caption.textContent=scene?.caption??'';caption.hidden=!scene?.caption;
    if(cityCaption)cityCaption.textContent=caption.textContent;
    root.classList.toggle('pz-vizag-scene',scene===CITY_SCENES.vizag);
    if(!scene){layers.forEach(layer=>layer.classList.remove('is-visible'));currentSource='';active=-1;root.style.removeProperty('--pz-scene-cool');root.style.removeProperty('--pz-scene-warm');return;}
    root.style.setProperty('--pz-scene-cool',scene.cool);root.style.setProperty('--pz-scene-warm',scene.warm);
    if(currentSource===scene.src)return;
    const next=active===0?1:0;
    layers[next].style.backgroundImage=`url("${scene.src}")`;
    layers.forEach((layer,index)=>layer.classList.toggle('is-visible',index===next));
    active=next;currentSource=scene.src;
  }});
  root.dataset.heroVisual='gradient';
  const cityInput=root.querySelector('#pz-city-input');
  form.addEventListener('input',()=>{
    // Editing dismisses the submitted result and cancels any pending scene load.
    void submit(null,false);
    root.classList.toggle('pz-search-focused',Boolean(cityInput.value.trim()));
    syncDrift();
  });
  root.addEventListener('pz:city-submitted',event=>{
    root.classList.remove('pz-search-focused');
    syncDrift();
    const key=cityKey(event.detail.city);
    let scene=key?(CITY_SCENES[key]??STUDY_SCENES.room):undefined;
    // The study retains optional alternatives for comparison.
    if(root.dataset.animationStudy==='true'&&key){
      const choice=document.querySelector('input[name="pz-study-scene"]:checked');
      scene=STUDY_SCENES[choice?.value];
    }
    void submit(scene,Boolean(key));
  });
  // A direct city visit can initialize the route before its hero is listening.
  if(root.classList.contains('pz-city-view'))void submit(CITY_SCENES.vizag);
  return {submit};
}

if(typeof document!=='undefined'){
  const root=document.getElementById('panzer-home');
  if(root)initHeroMotion(root);
}
