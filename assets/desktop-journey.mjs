const clamp=x=>Math.max(0,Math.min(1,x));
const mix=(a,b,t)=>a+(b-a)*t;
export const progressBetween=(value,start,end)=>clamp((value-start)/Math.max(Number.EPSILON,end-start));
const audienceLead=.19,audienceStep=.55,audienceTail=.32;
export function makeJourneyTimeline({storyTop,storyPin,audienceTop,audienceHeadingY,audiencePin,landingY,navyY,viewport}){
  const storyCentre=storyTop-storyPin;
  const start=storyCentre-viewport*.23,travel=storyCentre-viewport*.13;
  const arrival=storyCentre,stackEnd=arrival+stackScrollDistance(viewport);
  const border=Math.max(stackEnd+viewport*.14,audienceHeadingY-viewport*.56);
  const audienceEnter=Math.max(border+viewport*.04,audienceHeadingY-viewport*.5);
  const rowStart=Math.max(audienceEnter,audienceTop-audiencePin)+viewport*audienceLead;
  const rows=[rowStart,rowStart+viewport*audienceStep,rowStart+viewport*audienceStep*2];
  const depart=rows[2]+viewport*audienceTail,landing=Math.max(depart+viewport*.2,landingY-viewport*.65);
  const end=landing+viewport*.24;
  const navyStart=Math.max(end+viewport*.08,navyY-viewport*.88);
  return {start,travel,arrival,stackEnd,border,audienceEnter,rows,depart,landing,end,navyStart,navyEnd:navyStart+viewport*.32};
}
const stackScrollDistance=viewport=>viewport*.42;
// A little hysteresis prevents small wheel reversals around a boundary from
// repeatedly changing the selected destination. Every destination is a whole item.
export function audienceStop(progress,previous){
  const p=Math.max(0,Math.min(2,progress));
  if(!Number.isInteger(previous)||previous<0||previous>2)return Math.round(p);
  let item=previous;
  while(item<2&&p>=item+.58)item++;
  while(item>0&&p<=item-.58)item--;
  return item;
}
// Scroll chooses a destination; a clock-based, speed-limited spring supplies the motion.
export function journeyTarget(scroll,t,previousTarget){
  if(scroll<t.start)return 0;
  if(scroll<t.travel)return 1;
  if(scroll<t.arrival)return 1+progressBetween(scroll,t.travel,t.arrival);
  if(scroll<t.stackEnd)return 2+audienceStop(2.6*progressBetween(scroll,t.arrival,t.stackEnd),previousTarget-2);
  if(scroll<t.border)return 4+progressBetween(scroll,t.stackEnd,t.border);
  if(scroll<t.audienceEnter)return 5;
  if(scroll<t.rows[0])return 6;
  if(scroll<t.rows[2])return 6+audienceStop(2*progressBetween(scroll,t.rows[0],t.rows[2]),previousTarget-6);
  if(scroll<t.depart)return 8;
  if(scroll<t.landing)return 8+progressBetween(scroll,t.depart,t.landing);
  if(scroll<t.navyStart)return 9+progressBetween(scroll,t.landing,t.end);
  return 10+progressBetween(scroll,t.navyStart,t.navyEnd);
}
export function advanceJourney(current,target,velocity,dt){
  dt=Math.min(.05,Math.max(0,dt));
  const storyMotion=current<5,inAudience=current>=6&&current<=8;
  const omega=storyMotion?10:inAudience?12:14,change=current-target,temp=(velocity+omega*change)*dt,decay=Math.exp(-omega*dt);
  let value=target+(change+temp)*decay,v=(velocity-omega*temp)*decay;
  const speed=storyMotion?(current<1?1.65:current>=2&&current<4?3.1:1.9):inAudience?2.65:Math.max(4,Math.abs(change)*5);
  const maxStep=speed*dt;
  if(Math.abs(value-current)>maxStep){value=current+Math.sign(value-current)*maxStep;v=(value-current)/dt;}
  if((target-current)*(target-value)<0){value=target;v=0;}
  if(Math.abs(value-target)<.0005&&Math.abs(v)<.005)return {value:target,velocity:0};
  return {value,velocity:v};
}
const smooth=t=>t*t*(3-2*t);

// One closed outline joins the divider, stretches into a drop, then matches
// the travelling square. Reversing the same outline flattens it at the seam.
function dividerDrop(origin,point,progress){
  const x=origin.x,y=origin.y;
  const grow=smooth(progressBetween(progress,0,.58));
  const release=smooth(progressBetween(progress,.58,1));
  const top=mix(y-.6,point.y-8,release),bottom=mix(y+.6,point.y+8,grow);
  const neckHeight=mix(top+(bottom-top)*.48,top+2,release);
  const shoulder=mix(top+(bottom-top)*.18,top,release);
  const heel=mix(top+(bottom-top)*.75,bottom-2,release);
  const rim=mix(mix(12,9,grow),6,release);
  const neck=mix(mix(12,2.8,grow),8,release);
  const belly=mix(mix(12,8.6,grow),8,release);
  const foot=mix(mix(11,2.6,grow),6,release);
  const side=sign=>`C${x+sign*rim},${shoulder} ${x+sign*neck},${top} ${x+sign*neck},${neckHeight} C${x+sign*neck},${heel} ${x+sign*belly},${neckHeight} ${x+sign*belly},${heel} Q${x+sign*belly},${bottom} ${x+sign*foot},${bottom}`;
  return `M${x-rim},${top} H${x+rim} ${side(1)} H${x-foot} Q${x-belly},${bottom} ${x-belly},${heel} C${x-belly},${neckHeight} ${x-neck},${heel} ${x-neck},${neckHeight} C${x-neck},${top} ${x-rim},${shoulder} ${x-rim},${top} Z`;
}
export function journeyState(value){
  let leg=0,p=clamp(value);
  if(value>=1&&value<2){leg=1;p=value-1;}
  else if(value>=2&&value<4){leg=1;p=1;}
  else if(value>=4&&value<4.25){leg=2;p=(value-4)*4;}
  else if(value>=4.25&&value<5){leg=3;p=(value-4.25)/.75;}
  else if(value>=5&&value<6){leg=4;p=value-5;}
  else if(value>=6&&value<7){leg=5;p=value-6;}
  else if(value>=7&&value<8){leg=6;p=value-7;}
  else if(value>=8){leg=7;p=clamp(value-8);}
  const stack=clamp((value-2)/2)*2,audience=clamp((value-6)/2)*2,morph=clamp(value-9),navy=clamp(value-10);
  // Keep the first image framed while the square approaches its first row.
  const rowPosition=value<6?smooth(progressBetween(value,5.75,6))-1:audience;
  const ingress=value>=1&&value<2?1-progressBetween(value,1.82,2):1;
  const emerging=value>=4&&value<4.25?progressBetween(value,4,4.12):1;
  const visible=value>0&&value<9&&!(value>=2&&value<=4);
  return {leg,p,stack,audience,rowPosition,morph,navy,opacity:visible?ingress*emerging:0,scale:visible?mix(.15,1,ingress*emerging):.15,
    trail:value>0&&value<2?'story':value>4&&value<5?'connection':'none',dropping:value<1||(value>=4&&value<4.25)};
}
export function desktopStackFrames(progress){
  const base=Math.floor(Math.min(progress,1.999999)),t=progress>=2?1:progress-base;
  const poses=[{x:0,y:0,scale:1,angle:2},{x:-12,y:-13,scale:.96,angle:-5},{x:14,y:-25,scale:.93,angle:6}];
  return poses.map((_,i)=>{
    const rank=(i-base+3)%3,next=(rank+2)%3,a=poses[rank],b=poses[next],arc=rank===1?Math.sin(Math.PI*t):0;
    return {x:mix(a.x,b.x,t)+22*arc,y:mix(a.y,b.y,t)-115*arc,scale:mix(a.scale,b.scale,t),angle:mix(a.angle,b.angle,t)-3*arc,order:3-(t<.5?rank:next)};
  });
}

export function initDesktopJourney(root){
  const story=root.querySelector('.pz-story'),stack=root.querySelector('.pz-stack'),audience=root.querySelector('.pz-audience');
  const rows=[...root.querySelectorAll('.pz-journey')],visual=root.querySelector('.pz-audience-visual .pz-photo'),gold=root.querySelector('.pz-panel:not(.pz-reverse)');
  const navy=root.querySelector('.pz-panel.pz-reverse');
  if(!story||!stack||!audience||rows.length!==3||!visual||!gold||!navy)return;
  const ns='http://www.w3.org/2000/svg';
  const el=(tag,cls)=>{const node=document.createElement(tag);node.className=cls;return node;};
  const svgEl=(tag,attrs={})=>{const node=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,v);return node;};
  const wrap=(section,cls)=>{const wrapper=el('div',cls);section.before(wrapper);wrapper.append(section);return wrapper;};
  const storyRunway=wrap(story,'pz-story-runway'),audienceRunway=wrap(audience,'pz-audience-runway');
  const sources=['/prototypes/room.svg','/assets/story-living.svg','/assets/story-detail.svg'];
  const deck=el('div','pz-desktop-stack');
  const cards=sources.map((src,i)=>{const card=el('div','pz-desktop-stack-card'),img=el('img','');img.src=src;img.alt=['Illustrative room','Illustrative living space','Illustrative room detail'][i];img.draggable=false;card.append(img);deck.append(card);return card;});
  const deckLabel=el('div','pz-desktop-stack-label');deckLabel.textContent='Room illustrations · property photos to follow';
  stack.append(deck,deckLabel);
  const track=el('div','pz-desktop-audience-track');track.setAttribute('aria-hidden','true');
  sources.forEach(src=>{const img=el('img','');img.src=src;img.alt='';track.append(img);});visual.prepend(track);
  const visualNote=el('span','pz-desktop-image-note');visualNote.textContent='Room illustration · property photos to follow';visual.querySelector('.pz-photo-label').append(visualNote);
  for(const [panel,source,alt,label] of [
    [gold,sources[0],'Illustrative room, not a Panzer property photograph','Your space to settle in · room illustration'],
    [navy,sources[2],'Illustrative room detail, not a Panzer property photograph','The details of daily living · room illustration'],
  ]){
    const panelVisual=el('div','pz-desktop-panel-visual');
    const image=el('img',''),caption=el('span','');
    image.src=source;image.alt=alt;caption.textContent=label;
    panelVisual.append(image,caption);
    panel.querySelector('.pz-photo').append(panelVisual);
  }
  const svg=svgEl('svg',{'class':'pz-desktop-trail','aria-hidden':'true',focusable:'false'});
  const dropShape=svgEl('path',{fill:'#F6BF32',class:'pz-edge-droplet'});svg.append(dropShape);
  const paths=Array.from({length:8},()=>{
    const line=svgEl('path',{fill:'none',stroke:'#F6BF32','stroke-width':'2','stroke-linecap':'round','stroke-dasharray':'1 10'});svg.append(line);
    return {line,length:0};
  });
  const square=el('div','pz-travelling-square');square.setAttribute('aria-hidden','true');root.append(svg,square);
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let enabled=false,timeline,geometry,frame=0,value=0,velocity=0,target=0,lastTime=0,lastScroll=0,lastActive=-1,autoSelecting=false,manualSelection=null,lastRootSize='',initialized=false,pendingStoryScroll=0;
  const rect=node=>{const a=node.getBoundingClientRect(),r=root.getBoundingClientRect();return {x:a.left-r.left,y:a.top-r.top,width:a.width,height:a.height,right:a.right-r.left,bottom:a.bottom-r.top};};
  const scrollPosition=()=>-root.getBoundingClientRect().top;
  function selectAudience(index){
    if(lastActive===index)return;lastActive=index;autoSelecting=true;rows[index].click();autoSelecting=false;
  }
  function paintCards(progress){
    desktopStackFrames(progress).forEach((p,i)=>{cards[i].style.transform=`translate(${p.x}px,${p.y}px) rotate(${p.angle}deg) scale(${p.scale})`;cards[i].style.zIndex=String(p.order);cards[i].setAttribute('aria-hidden',String(i!==Math.round(progress)));});
  }
  function updateRoute(){
    // Sticky sections move relative to the document. Measure their rendered positions,
    // while using their stationary wrappers only for scroll timing.
    const s=rect(story),d=rect(deck),a=rect(audience),g=rect(gold),r=rows.map(rect);
    const hero=rect(root.querySelector('.pz-hero'));
    const start={x:s.x+28,y:hero.bottom},drop={x:s.x+28,y:s.y+42},dock={x:d.right-28,y:d.y+45};
    const inside={x:d.right-28,y:d.bottom-32},exit={x:d.right-24,y:d.bottom+18},border={x:a.x+28,y:a.y};
    const points=r.map(row=>({x:row.x+36,y:row.y+33})),end={x:g.x+8,y:g.y+8},edge=root.clientWidth-26;
    const route=[
      `M${start.x},${start.y} C${start.x-2},${start.y+10} ${drop.x},${drop.y-14} ${drop.x},${drop.y}`,
      `M${drop.x},${drop.y} C${drop.x+100},${s.y+24} ${dock.x-150},${s.y+20} ${dock.x},${dock.y}`,
      `M${inside.x},${inside.y} C${inside.x},${inside.y+18} ${exit.x},${exit.y-14} ${exit.x},${exit.y}`,
      `M${exit.x},${exit.y} C${edge},${exit.y+40} ${edge},${border.y-40} ${edge-70},${border.y-28} C${edge-260},${border.y-18} ${border.x+70},${border.y-24} ${border.x},${border.y}`,
      `M${border.x},${border.y} C${border.x},${border.y+60} ${points[0].x-12},${points[0].y-70} ${points[0].x},${points[0].y}`,
      `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`,
      `M${points[1].x},${points[1].y} L${points[2].x},${points[2].y}`,
      `M${points[2].x},${points[2].y} C${points[2].x-25},${points[2].y+80} ${end.x+8},${end.y-120} ${end.x},${end.y}`
    ];
    paths.forEach((path,i)=>{path.line.setAttribute('d',route[i]);path.length=path.line.getTotalLength();});
    geometry={goldWidth:g.width*.81,goldHeight:g.height,origin:start};
  }
  function paint(){
    if(!enabled||!timeline)return;
    updateRoute();
    const state=journeyState(value),segment=paths[state.leg],point=segment.line.getPointAtLength(segment.length*state.p);
    root.dataset.desktopPhase=value>10?'navy-panel':value>=9?'gold-panel':value>=2&&value<=4?'photo-stack':`travel-${state.leg}`;
    root.dataset.desktopProgress=value.toFixed(3);
    root.dataset.desktopTarget=target.toFixed(3);
    const firstDrop=value>0&&value<1;
    square.style.opacity=firstDrop?'0':String(state.opacity);
    const stretch=state.dropping?Math.sin(Math.PI*state.p)*.2:0;
    dropShape.style.opacity=firstDrop?String(smooth(progressBetween(value,0,.12))):'0';
    if(firstDrop)dropShape.setAttribute('d',dividerDrop(geometry.origin,point,value));
    square.style.borderRadius=state.dropping?`${mix(8,2,state.p)}px`:'2px';
    const railScale=state.leg===4?mix(1,.78,state.p):state.leg===5||state.leg===6?.78:state.leg===7?mix(.78,1,state.p):1;
    const rotation=state.leg===5||state.leg===6?state.audience*90:state.dropping?0:state.p*90;
    square.style.transform=`translate(${point.x-8}px,${point.y-8}px) rotate(${rotation}deg) scale(${state.scale*railScale*(1-stretch)},${state.scale*railScale*(1+stretch)})`;
    // A complete section guide, not a moving tail. It stays while the square is
    // in that section, and fades away after the square enters the next scene.
    paths.forEach(({line},i)=>line.style.opacity=(state.trail==='story'&&(i===1||(i===0&&!firstDrop)))||(state.trail==='connection'&&(i===2||i===3))?'.38':'0');
    paintCards(state.stack);
    const selected=manualSelection??Math.round(state.rowPosition);
    if(selected<0){
      if(rows.slice(1).some(row=>row.getAttribute('aria-pressed')==='true'))selectAudience(0);
      if(rows[0].getAttribute('aria-pressed')==='true')rows[0].setAttribute('aria-pressed','false');
      lastActive=-1;
    }else selectAudience(selected);
    track.style.transform=`translateY(${-state.audience*100/3}%)`;
    // The row emphasis, image strip and moving square share one interpolated
    // position, so they start, reverse and settle together.
    rows.forEach((row,i)=>row.style.setProperty('--pz-row-focus',clamp(1-Math.abs(i-state.rowPosition))));
    gold.style.setProperty('--pz-panel-x',mix(16/geometry.goldWidth,1,state.morph));
    gold.style.setProperty('--pz-panel-y',mix(16/geometry.goldHeight,1,state.morph));
    gold.style.setProperty('--pz-panel-opacity',value>=9?'1':'0');
    gold.style.setProperty('--pz-panel-content',progressBetween(state.morph,.25,.9));
    navy.style.setProperty('--pz-navy-progress',state.navy);
    navy.style.setProperty('--pz-panel-content',progressBetween(state.navy,.25,.9));
  }
  function tick(time){
    frame=0;if(!enabled)return;
    const dt=lastTime?Math.min(.05,(time-lastTime)/1000):1/60;lastTime=time;
    const next=advanceJourney(value,target,velocity,dt);value=next.value;velocity=next.velocity;paint();
    if(pendingStoryScroll&&value>=4){
      const remainder=pendingStoryScroll;
      pendingStoryScroll=0;
      window.scrollBy({top:remainder,behavior:'instant'});
    }
    if(value!==target||velocity!==0)frame=requestAnimationFrame(tick);else lastTime=0;
  }
  function animate(){if(enabled&&!frame)frame=requestAnimationFrame(tick);}
  function measure(){
    const desktop=root.clientWidth>=960,wasEnabled=enabled;root.classList.toggle('pz-desktop-ready',desktop);
    enabled=desktop&&!reduced.matches&&!root.classList.contains('pz-city-view');root.classList.toggle('pz-desktop-motion',enabled);
    cancelAnimationFrame(frame);frame=0;lastTime=0;pendingStoryScroll=0;
    if(!enabled){
      square.style.opacity='0';dropShape.style.opacity='0';paths.forEach(({line})=>line.style.opacity='0');
      gold.style.removeProperty('--pz-panel-content');rows.forEach(row=>row.style.removeProperty('--pz-row-focus'));
      if(!rows.some(row=>row.getAttribute('aria-pressed')==='true'))selectAudience(0);
      paintCards(0);const selected=Math.max(0,rows.findIndex(row=>row.getAttribute('aria-pressed')==='true'));track.style.transform=`translateY(${-selected*100/3}%)`;
      manualSelection=null;initialized=false;return;
    }
    const vh=window.innerHeight;
    storyRunway.style.setProperty('--pz-runway',`${stackScrollDistance(vh)}px`);
    storyRunway.style.setProperty('--pz-content-height',`${story.offsetHeight}px`);
    const storyPin=Math.min(0,(vh-story.offsetHeight)/2);
    story.style.setProperty('--pz-story-pin',`${storyPin}px`);
    audienceRunway.style.setProperty('--pz-runway',`${vh*(audienceLead+2*audienceStep+audienceTail)}px`);
    audienceRunway.style.setProperty('--pz-content-height',`${audience.offsetHeight}px`);
    const audiencePin=Math.min(0,vh-audience.offsetHeight);
    audience.style.setProperty('--pz-pin-top',`${audiencePin}px`);
    const sw=rect(storyRunway),aw=rect(audienceRunway),a=rect(audience),g=rect(gold);
    const heading=rect(audience.querySelector('.pz-audience-heading'));
    timeline=makeJourneyTimeline({storyTop:sw.y,storyPin,audienceTop:aw.y,audienceHeadingY:aw.y+heading.y-a.y+heading.height/2,audiencePin,landingY:g.y+8,navyY:rect(navy).y,viewport:vh});
    const height=g.bottom+40;svg.setAttribute('viewBox',`0 0 ${root.clientWidth} ${height}`);svg.style.height=`${height}px`;
    const scroll=scrollPosition();target=manualSelection===null?journeyTarget(scroll,timeline,target):6+manualSelection;
    if(!initialized||!wasEnabled){value=scroll<timeline.travel?0:target===6?5:target;velocity=0;initialized=true;}
    lastScroll=scroll;paint();animate();
  }
  // Focusing a row can scroll it into view. Only a new navigation gesture
  // should hand control of the gallery back to the scroll position.
  const resumeScroll=()=>{manualSelection=null;pendingStoryScroll=0;};
  window.addEventListener('wheel',event=>{
    manualSelection=null;
    if(event.deltaY<0)pendingStoryScroll=0;
    if(!enabled||!timeline||event.ctrlKey||!event.cancelable||event.deltaY<=0||Math.abs(event.deltaX)>event.deltaY||value>=4)return;
    const scroll=scrollPosition();
    const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?window.innerHeight:1);
    const stop=timeline.stackEnd-2;
    if(scroll<timeline.arrival||scroll>=timeline.stackEnd||scroll+delta<stop)return;
    // Keep the story centred through the final card's settle, then give the
    // remaining wheel movement back to normal page scrolling.
    event.preventDefault();
    pendingStoryScroll=Math.max(pendingStoryScroll,Math.min(delta-Math.max(0,stop-scroll)+2,window.innerHeight*.18));
    if(scroll<stop)window.scrollBy({top:stop-scroll,behavior:'instant'});
    target=4;animate();
  },{passive:false});
  window.addEventListener('touchmove',resumeScroll,{passive:true});
  window.addEventListener('hashchange',resumeScroll);
  window.addEventListener('pointerdown',event=>{
    if(event.clientX>=document.documentElement.clientWidth||event.button===1)resumeScroll();
  });
  const scrollKeys=new Set(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' ']);
  window.addEventListener('keydown',event=>{
    if(scrollKeys.has(event.key)&&!(event.key===' '&&event.target.closest?.('button,input,textarea,select')))resumeScroll();
  });
  window.addEventListener('scroll',()=>{
    if(!enabled)return;const scroll=scrollPosition();
    if(manualSelection===null)target=journeyTarget(scroll,timeline,target);
    if(Math.abs(scroll-lastScroll)>window.innerHeight*1.8&&scroll>=timeline.audienceEnter){value=target===6&&value<5?5:target;velocity=0;}
    lastScroll=scroll;paint();animate();
  },{passive:true});
  window.addEventListener('resize',measure,{passive:true});reduced.addEventListener('change',measure);
  new ResizeObserver(()=>{const size=`${root.clientWidth}:${root.clientHeight}`;if(size!==lastRootSize){lastRootSize=size;measure();}}).observe(root);
  rows.forEach((row,i)=>row.addEventListener('click',()=>{
    if(autoSelecting)return;
    if(enabled){manualSelection=i;lastActive=i;target=6+i;animate();}
    else track.style.transform=`translateY(${-i*100/3}%)`;
  }));
  root.addEventListener('pz:route-change',measure);
  root.addEventListener('pz:city-submitted',()=>requestAnimationFrame(measure));
  document.fonts?.ready.then(measure);measure();
  return {measure};
}
if(typeof document!=='undefined'){const root=document.getElementById('panzer-home');if(root)initDesktopJourney(root);}
