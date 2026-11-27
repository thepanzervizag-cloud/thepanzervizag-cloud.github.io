// Both layouts register their deck with one viewer, including how to promote a photo.
const galleries=new WeakMap();
export function bindPhotoDeck(host,photos,cards,select,canOpen=()=>true){
  let gallery=galleries.get(host);
  if(!gallery){gallery=createGallery(photos);galleries.set(host,gallery);}
  const deck={cards,select};
  gallery.decks.push(deck);
  cards.forEach((card,index)=>{
    card.type='button';
    card.setAttribute('aria-haspopup','dialog');
    card.setAttribute('aria-label',`Enlarge photo: ${photos[index].caption}`);
    card.addEventListener('click',()=>{if(canOpen())gallery.open(deck,index);});
  });
}

function createGallery(photos){
  const decks=[];
  const dialog=document.createElement('dialog');
  dialog.className='pz-photo-viewer';
  dialog.setAttribute('aria-label','Residence photo viewer');
  dialog.innerHTML=`<div class="pz-viewer-shade"></div><div class="pz-viewer-frame">
    <div class="pz-viewer-picture"><img draggable="false"></div>
    <div class="pz-viewer-controls">
      <button type="button" class="pz-viewer-close" aria-label="Close photo viewer" autofocus>×</button>
      <button type="button" class="pz-viewer-prev" aria-label="Previous photo">←</button>
      <button type="button" class="pz-viewer-next" aria-label="Next photo">→</button>
      <span class="pz-viewer-count" aria-live="polite" aria-atomic="true"></span>
    </div></div>`;
  document.body.append(dialog);
  const frame=dialog.querySelector('.pz-viewer-frame'),picture=dialog.querySelector('.pz-viewer-picture');
  const img=picture.querySelector('img'),count=dialog.querySelector('.pz-viewer-count');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let index=0,closing=false,flight=null,origin=null,fade=null;
  const visibleDeck=()=>decks.find(deck=>deck.cards[0].getClientRects().length);
  function display(){
    const photo=photos[index];
    img.src=photo.src;img.alt=photo.alt;
    img.style.objectFit='cover';
    img.style.objectPosition=photo.focus;
    count.textContent=`${index+1} / ${photos.length} · ${photo.caption}`;
  }
  function selectInDecks(){
    for(const deck of decks)deck.select(index);
  }
  function resetFlight(){
    if(flight){flight.onfinish=null;flight.cancel();flight=null;}
    origin?.classList.remove('pz-viewer-origin');origin=null;
  }
  // Resize the photo window itself so its last frame uses the card's real crop.
  function fly(card,opening,startPose=null){
    const source=card.querySelector('img'),box=source.getBoundingClientRect(),full=frame.getBoundingClientRect();
    if(reduced.matches||!box.width||!full.width)return null;
    const matrix=new DOMMatrix(getComputedStyle(card).transform);
    const zoom=Math.hypot(matrix.a,matrix.b),angle=Math.atan2(matrix.b,matrix.a);
    const w=source.offsetWidth*zoom,h=source.offsetHeight*zoom;
    const tx=box.left+box.width/2-full.left-w/2;
    const ty=box.top+box.height/2-full.top-h/2;
    const small={width:w+'px',height:h+'px',transform:`translate(${tx}px,${ty}px) rotate(${angle}rad)`};
    const large={width:full.width+'px',height:full.height+'px',transform:'translate(0,0) rotate(0rad)'};
    // Only the lift hides its source. The returning image lands on a painted card.
    if(opening){origin=source;origin.classList.add('pz-viewer-origin');}
    const frames=opening?[small,large]:[
      {...(startPose??large),opacity:1},
      {offset:.995,opacity:1},
      {...small,opacity:0}
    ];
    return picture.animate(frames,{duration:opening?430:360,easing:'cubic-bezier(.22,.74,.22,1)',fill:'both'});
  }
  function clearFade(){if(fade){fade.cancel();fade.effect.target.remove();fade=null;}}
  function step(direction){
    if(closing||photos.length<2)return;
    resetFlight();clearFade();
    const previous=img.cloneNode();previous.alt='';previous.setAttribute('aria-hidden','true');
    index=(index+direction+photos.length)%photos.length;display();
    selectInDecks();
    if(!reduced.matches){
      picture.append(previous);
      fade=previous.animate([{opacity:1},{opacity:0}],{duration:190,easing:'ease-out',fill:'both'});
      fade.onfinish=clearFade;
    }
  }
  function open(deck,chosen){
    if(dialog.open)return;
    index=chosen;closing=false;display();
    const source=deck.cards[index].querySelector('img');
    frame.style.setProperty('--pz-photo-ratio',(source.naturalWidth/source.naturalHeight)||4/3);
    dialog.toggleAttribute('data-page-gutter',innerWidth>document.documentElement.clientWidth);
    dialog.showModal();
    dialog.querySelector('.pz-viewer-close').focus({preventScroll:true});
    // Read the resting layout before starting the background transition.
    frame.getBoundingClientRect();dialog.classList.add('pz-viewer-open');
    flight=fly(deck.cards[index],true);
    if(flight)flight.onfinish=resetFlight;
    // Capture the lift first, then settle both decks behind the modal.
    selectInDecks();
  }
  function close(){
    if(!dialog.open||closing)return;
    closing=true;
    // A quick close can interrupt the lift before it reaches full size.
    const style=getComputedStyle(picture);
    const startPose=flight?{transform:style.transform,width:style.width,height:style.height}:null;
    resetFlight();
    dialog.classList.remove('pz-viewer-open');
    const deck=visibleDeck();
    const card=deck?.cards[index];
    const done=()=>{
      dialog.close();resetFlight();clearFade();closing=false;
      (visibleDeck()?.cards[index]??card)?.focus({preventScroll:true});
    };
    flight=card&&fly(card,false,startPose);
    if(flight)flight.onfinish=done;else done();
  }
  dialog.querySelector('.pz-viewer-close').onclick=close;
  dialog.querySelector('.pz-viewer-prev').onclick=()=>step(-1);
  dialog.querySelector('.pz-viewer-next').onclick=()=>step(1);
  dialog.querySelector('.pz-viewer-shade').onclick=close;
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('wheel',event=>{event.stopPropagation();if(!event.ctrlKey)event.preventDefault();},{passive:false});
  dialog.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
      event.preventDefault();event.stopPropagation();step(event.key==='ArrowLeft'?-1:1);
    }
  });
  return {decks,open};
}
