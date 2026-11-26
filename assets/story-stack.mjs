// Mobile deck motion adapted from the owner's My-Portfolio Toolkit reference.
// Each step moves a real card around the side of the deck, not a crossfade.
export const wrap=(index,count)=>((index%count)+count)%count;
function pose(rank){
  if(rank===0)return {x:0,y:0,scale:1,angle:0};
  const depth=Math.min(rank,2),side=rank%2?-1:1;
  return {x:side*7,y:depth*10,scale:1-depth*.035,angle:side*(3+depth)};
}
export function stackFrame(position,direction,count,width){
  const reverse=direction===-1,base=reverse?Math.ceil(position):Math.floor(position);
  const t=reverse?base-position:position-base;
  const front=wrap(base+(t>=.5?(reverse?-1:1):0),count);
  return Array.from({length:count},(_,i)=>{
    const rank=wrap(i-base,count),targetRank=reverse?(rank+1)%count:(rank===0?count-1:rank-1);
    const from=pose(rank),to=pose(targetRank),mix=(a,b)=>a+(b-a)*t;
    let x=mix(from.x,to.x),y=mix(from.y,to.y),scale=mix(from.scale,to.scale),angle=mix(from.angle,to.angle);
    let order=count-(t<.5?rank:targetRank);
    if(rank===(reverse?count-1:0)&&t>0){
      const arc=Math.sin(Math.PI*t);x-=width*1.04*arc;angle-=9*arc;y-=8*arc;
      order=reverse?(t<.5?1:count+1):(t<.5?count+1:count-targetRank);
    }
    return {x,y,scale,angle,order,front:i===front};
  });
}
export function swipeDirection(dx,dy){return Math.abs(dx)>=45&&Math.abs(dx)>Math.abs(dy)*1.25?(dx<0?1:-1):0;}

export function createStackController({count,render,onSettled,requestFrame=requestAnimationFrame,cancelFrame=cancelAnimationFrame,now=()=>performance.now()}){
  let index=0,position=0,direction=1,width=300,frame=0,animating=false,dragging=false,reduced=false,enabled=false;
  const draw=value=>{position=value;render(stackFrame(position,direction,count,width),{index,dragging});};
  function settle(){index=wrap(index,count);animating=dragging=false;frame=0;draw(index);onSettled(index);}
  function animateTo(target){
    cancelFrame(frame);frame=0;dragging=false;
    if(reduced){index=target;settle();return;}
    const start=position,started=now(),duration=Math.max(180,Math.abs(target-start)*520);animating=true;
    function tick(time){
      const progress=Math.min(1,(time-started)/duration),eased=1-Math.pow(1-progress,3);
      draw(start+(target-start)*eased);
      if(progress<1)frame=requestFrame(tick);else{index=target;settle();}
    }
    frame=requestFrame(tick);
  }
  return {
    get state(){return {index,position,animating,dragging,enabled,reduced};},
    configure(options){cancelFrame(frame);frame=0;enabled=options.enabled;width=Math.max(1,options.width);reduced=options.reduced;settle();},
    go(step){if(!enabled||animating||dragging)return false;direction=step<0?-1:1;animateTo(index+direction);return true;},
    drag(dx){
      if(!enabled||animating)return false;dragging=true;direction=dx<0?1:-1;
      const target=index+direction*Math.min(.48,Math.abs(dx)/(width*Math.PI));
      if(!reduced)draw(target);return true;
    },
    release(dx,dy){if(!dragging)return;const step=swipeDirection(dx,dy);if(step)direction=step;animateTo(index+step);},
    cancel(){if(dragging)animateTo(index);},
    stop(){cancelFrame(frame);enabled=false;settle();}
  };
}

export function bindStorySwipe(stage,controller,onRelease=()=>{}){
  let gesture=null;
  stage.addEventListener('pointerdown',event=>{
    if(!event.isPrimary||event.button!==0||!controller.state.enabled||controller.state.animating||!event.target.closest('.pz-story-front'))return;
    gesture={id:event.pointerId,x:event.clientX,y:event.clientY,horizontal:false};
  },{passive:true});
  stage.addEventListener('pointermove',event=>{
    if(!gesture||gesture.id!==event.pointerId)return;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
    if(!gesture.horizontal&&Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){gesture=null;return;}
    if(gesture.horizontal||(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.25)){
      if(!gesture.horizontal){gesture.horizontal=true;stage.setPointerCapture(event.pointerId);}
      controller.drag(dx);
    }
  },{passive:true});
  function cancelGesture(){const id=gesture?.id;gesture=null;controller.cancel();if(id!==undefined&&stage.hasPointerCapture(id))stage.releasePointerCapture(id);}
  stage.addEventListener('pointerup',event=>{
    if(!gesture||gesture.id!==event.pointerId)return;
    const {x,y,horizontal}=gesture;gesture=null;
    if(horizontal){controller.release(event.clientX-x,event.clientY-y);onRelease();}
    if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);
  });
  stage.addEventListener('pointercancel',event=>{if(gesture?.id===event.pointerId)cancelGesture();});
  // Touch starts with implicit capture on the card. Its loss bubbles when we
  // transfer capture to the stage; that transfer is not a cancelled gesture.
  stage.addEventListener('lostpointercapture',event=>{
    if(event.target===stage&&gesture?.id===event.pointerId)cancelGesture();
  });
  stage.addEventListener('dragstart',event=>event.preventDefault());
  return cancelGesture;
}

import {storyPhotos as slides} from './story-photos.mjs';
export function initStoryStack(root){
  const host=root.querySelector('.pz-stack');if(!host)return;
  const element=(tag,className,text)=>{const el=document.createElement(tag);el.className=className;if(text)el.textContent=text;return el;};
  const deck=element('div','pz-story-deck');deck.setAttribute('role','region');deck.setAttribute('aria-roledescription','carousel');deck.setAttribute('aria-label','Photos from Panzer Seeta and Panzer Rama');
  const navigation=element('div','pz-story-navigation');
  const previous=element('button','pz-story-previous','←'),next=element('button','pz-story-next','→');
  previous.type=next.type='button';previous.setAttribute('aria-label','Previous story image');next.setAttribute('aria-label','Next story image');
  const status=element('span','pz-story-status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
  navigation.append(previous,status,next);
  const stage=element('div','pz-story-stage');stage.tabIndex=0;stage.setAttribute('aria-label','Image stack. Swipe left or right, or use the arrow keys.');
  const cards=slides.map((slide,i)=>{
    const card=element('div','pz-story-card');card.setAttribute('role','group');card.setAttribute('aria-roledescription','slide');card.setAttribute('aria-label',`${i+1} of ${slides.length}: ${slide.title}`);
    const img=element('img','');img.src=slide.src;img.alt=slide.alt;img.draggable=false;img.width=1440;img.height=1080;img.style.objectPosition=slide.focus;
    const label=element('div','pz-story-card-label');label.append(element('strong','',slide.title),element('span','',slide.caption));
    card.append(img,label);stage.append(card);return card;
  });
  deck.append(navigation,stage,element('span','pz-story-hint','Swipe left for next · right for previous'));host.append(deck);host.classList.add('pz-stack-ready');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const controller=createStackController({count:cards.length,render:(poses,state)=>{
    poses.forEach((p,i)=>{
      cards[i].style.transform=`translate(${p.x}px,${p.y}px) scale(${p.scale}) rotate(${p.angle}deg)`;
      cards[i].style.zIndex=String(p.order);cards[i].classList.toggle('pz-story-front',p.front);
      // Keep slide announcements stable until the move has settled.
      cards[i].setAttribute('aria-hidden',String(i!==state.index));
    });
  },onSettled:index=>{
    status.textContent=`${index+1} of ${cards.length}`;host.dataset.storyIndex=String(index);
    previous.disabled=next.disabled=false;
  }});
  const navigate=step=>{if(controller.go(step)&&controller.state.animating)previous.disabled=next.disabled=true;};
  previous.addEventListener('click',()=>navigate(-1));next.addEventListener('click',()=>navigate(1));
  stage.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();navigate(event.key==='ArrowLeft'?-1:1);}});
  const cancelGesture=bindStorySwipe(stage,controller,()=>{if(controller.state.animating)previous.disabled=next.disabled=true;});
  let lastWidth=-1;
  function configure(force=false){
    const width=root.clientWidth;if(!force&&width===lastWidth)return;lastWidth=width;
    cancelGesture();controller.configure({enabled:width<960,width:cards[0].offsetWidth||300,reduced:reduced.matches});
    deck.inert=width>=960;
  }
  new ResizeObserver(()=>configure()).observe(root);
  reduced.addEventListener('change',()=>configure(true));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)configure(true);});
  configure(true);return controller;
}
if(typeof document!=='undefined'){const root=document.getElementById('panzer-home');if(root)initStoryStack(root);}
