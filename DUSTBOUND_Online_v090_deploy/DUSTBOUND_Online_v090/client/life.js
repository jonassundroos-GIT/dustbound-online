/* Effects consume confirmed state only. No actions, costs or rules are changed. */
const lifeMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
let lifePrefs={motion:'full',atmosphere:true,sound:true,volume:.18};
try{const saved=JSON.parse(localStorage.getItem('dustbound-effects')||'{}');for(const k of ['atmosphere','sound'])if(typeof saved[k]==='boolean')lifePrefs[k]=saved[k];if(['full','reduced'].includes(saved.motion))lifePrefs.motion=saved.motion;}catch(e){}
const lifeAtmosphere=document.createElement('div');lifeAtmosphere.id='arenaAtmosphere';lifeAtmosphere.setAttribute('aria-hidden','true');
lifeAtmosphere.innerHTML='<i class="arena-mist mist-left"></i><i class="arena-mist mist-right"></i><i class="arena-water"></i><i class="arena-lamp lamp-left"></i><i class="arena-lamp lamp-right"></i>';
blackwaterBoard.append(lifeAtmosphere);
const lifeBowl=document.createElement('div');lifeBowl.id='waterBowlFx';lifeBowl.setAttribute('aria-hidden','true');lifeBowl.innerHTML='<i class="bowl-fill"></i><i class="bowl-rings"></i>';blackwaterBoard.append(lifeBowl);
const lifeSettings=document.createElement('dialog');lifeSettings.id='effectsSettings';lifeSettings.setAttribute('aria-labelledby','effectsTitle');
lifeSettings.innerHTML='<h2 id="effectsTitle">GAME FEEL</h2><p>Adjust animation and sound on this device.</p><label><input id="lifeReduced" type="checkbox"> Reduced motion</label><label><input id="lifeAtmosphere" type="checkbox"> Arena mist and water shimmer</label><label><input id="lifeSound" type="checkbox"> Sound effects</label><p class="effects-note">Reduced motion also follows your device setting. Gameplay cues and damage numbers remain visible.</p><button id="lifeSoundPreview" type="button">TEST SOUND</button><button id="lifeSettingsClose" type="button">DONE</button>';
document.body.append(lifeSettings);
const lifeSettingsButton=document.createElement('button');lifeSettingsButton.id='effectsButton';lifeSettingsButton.textContent='EFFECTS';document.querySelector('.hud-right').prepend(lifeSettingsButton);
lifeSettingsButton.addEventListener('click',()=>lifeSettings.showModal());
$('lifeSettingsClose').addEventListener('click',()=>lifeSettings.close());
lifeSettings.addEventListener('close',()=>lifeSettingsButton.focus());
function lifeApplyPrefs(){
 const reduced=lifeMotion.matches||lifePrefs.motion==='reduced';
 document.documentElement.dataset.motion=reduced?'reduced':'full';
 document.documentElement.dataset.atmosphere=lifePrefs.atmosphere?'on':'off';
 $('lifeReduced').checked=lifePrefs.motion==='reduced';$('lifeAtmosphere').checked=lifePrefs.atmosphere;$('lifeSound').checked=lifePrefs.sound;
 if(reduced)for(const a of fxRoot().getAnimations({subtree:true}))a.cancel();
 try{localStorage.setItem('dustbound-effects',JSON.stringify(lifePrefs));}catch(e){}
}
lifeMotion.addEventListener('change',lifeApplyPrefs);
for(const [id,key] of [['lifeAtmosphere','atmosphere'],['lifeSound','sound']])$(id).addEventListener('change',e=>{lifePrefs[key]=e.target.checked;lifeApplyPrefs();});
$('lifeReduced').addEventListener('change',e=>{lifePrefs.motion=e.target.checked?'reduced':'full';lifeApplyPrefs();});
lifeApplyPrefs();
let lifeAudio=null,lifeLastTone=0;
function lifeUnlockAudio(){
 if(!lifePrefs.sound)return;const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
 try{if(!lifeAudio)lifeAudio=new Audio();if(lifeAudio.state==='suspended')lifeAudio.resume().catch(()=>{});}catch(e){}
}
document.addEventListener('pointerdown',lifeUnlockAudio,{capture:true});document.addEventListener('keydown',lifeUnlockAudio,{capture:true});
function lifeTone(kind){
 if(!lifePrefs.sound||document.hidden||!lifeAudio||lifeAudio.state!=='running'||performance.now()-lifeLastTone<45)return;
 lifeLastTone=performance.now();
 const notes={tap:[420,570,.06],draw:[330,660,.14],impact:[130,45,.16],death:[95,28,.3],water:[650,1100,.22],heal:[440,880,.3],shield:[900,500,.2],scan:[880,440,.3],turn:[550,825,.25],event:[220,660,.34],rush:[180,540,.16],win:[440,1320,.65]};
 const [start,end,duration]=notes[kind]||notes.tap;
 try{const t=lifeAudio.currentTime,o=lifeAudio.createOscillator(),g=lifeAudio.createGain();o.type=['impact','death'].includes(kind)?'triangle':'sine';o.frequency.setValueAtTime(start,t);o.frequency.exponentialRampToValueAtTime(end,t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(lifePrefs.volume*.35,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(lifeAudio.destination);o.start(t);o.stop(t+duration+.03);o.onended=()=>{o.disconnect();g.disconnect();};}catch(e){}
}
$('lifeSoundPreview').addEventListener('click',()=>{lifeUnlockAudio();lifeTone('water');});
document.addEventListener('click',e=>{if(e.target.closest('button,[data-card]')&&!e.target.closest('#effectsSettings'))lifeTone('tap');});
let lifeEpoch=0,lifeTimers=new Set(),lifeScene='',lifePreviousRevision=0,lifeLocalGame=null;
function lifeLater(fn,delay=0){const epoch=lifeEpoch;const id=setTimeout(()=>{lifeTimers.delete(id);if(epoch===lifeEpoch&&!document.hidden&&$('gameScreen').style.display!=='none')fn();},delay);lifeTimers.add(id);}
queueVisual=lifeLater;
function lifeClear(){lifeEpoch++;for(const id of lifeTimers)clearTimeout(id);lifeTimers.clear();document.querySelectorAll('.life-fx,.effect-number').forEach(el=>el.remove());for(const a of fxRoot().getAnimations({subtree:true}))a.cancel();}
document.addEventListener('visibilitychange',()=>{document.documentElement.classList.toggle('effects-paused',document.hidden);if(document.hidden){lifeClear();lifeAudio?.suspend().catch(()=>{});}});
function lifeOwner(actor){return actor===me?'me':'enemy';}
function lifeRect(actor,slot,camp=false){return fxRect(fxElm(lifeOwner(actor),slot,camp));}
function lifeClone(el,rect,kind){const clone=fxClone(el,rect,kind);clone?.classList.add('life-fx');return clone;}
function lifeDot(rect,cls='life-ring',duration=600){
 if(!rect||fxReduced())return;
 const el=document.createElement('i');el.className='life-fx '+cls;Object.assign(el.style,{left:rect.x+'px',top:rect.y+'px'});fxRoot().append(el);
 fxAnimate(el,[{opacity:0,transform:'translate(-50%,-50%) scale(.2)'},{offset:.18,opacity:1},{opacity:0,transform:'translate(-50%,-50%) scale(1.6)'}],{duration,easing:'ease-out'});
}
function lifeTravel(start,end,kind='water',count=5,duration=540){
 if(!start||!end||fxReduced())return;
 for(let i=0;i<count;i++){
  const el=document.createElement('i');el.className='life-fx life-mote '+kind;Object.assign(el.style,{left:start.x+'px',top:start.y+'px'});fxRoot().append(el);
  const dx=end.x-start.x,dy=end.y-start.y;
  fxAnimate(el,[{opacity:0,transform:'translate(0,0) scale(.4)'},{offset:.15,opacity:1},{offset:.55,transform:'translate('+(dx*.5+(i%2?20:-20))+'px,'+(dy*.5-35)+'px) scale(1)'},{opacity:0,transform:'translate('+dx+'px,'+dy+'px) scale(.25)'}],{duration,delay:i*(duration<300?20:40),easing:'cubic-bezier(.25,.6,.35,1)'});
 }
}
function lifeRecoil(rect,amount=1){
 if(!rect||fxReduced())return;
 const el=document.createElement('i');el.className='life-fx life-impact-ring';Object.assign(el.style,{left:rect.x+'px',top:rect.y+'px',width:Math.max(40,rect.width*.7)+'px',height:Math.max(30,rect.height*.7)+'px'});fxRoot().append(el);
 fxAnimate(el,[{opacity:1,transform:'translate(-50%,-50%) scale(.3) rotate(-15deg)'},{opacity:.8,offset:.22,transform:'translate(-50%,-50%) scale(1.15) rotate(0)'},{opacity:0,transform:'translate(-50%,-50%) scale(1.65)'}],{duration:Math.min(600,280+amount*30)});
}
const lifeOldDeath=fxDeath;
fxDeath=function(info){lifeOldDeath(info);lifeRecoil(info?.rect,4);if(!fxReduced())fxParticles(info?.rect,'smoke',5);lifeTone('death');};
// Stronger attacks retain the same 280ms impact beat as damage/destruction cues.
animateAttack=function(before,action){
 const actor=before.sides[action.actor],enemy=before.sides[action.actor===1?2:1],attacker=actor?.units[action.from];
 const defender=enemy?.units[action.to+3]||enemy?.units[action.to],finish=defender?.rect||enemy?.camps[action.to]?.rect;
 if(!attacker?.rect||!finish)return;
 lifeLater(()=>{lifeTone('impact');lifeRecoil(finish,attacker.atk||1);},280);
 if(fxReduced())return;
 const start=attacker.rect,dx=finish.x-start.x,dy=finish.y-start.y,ghost=lifeClone(attacker.el,start,'fx-attack-sprite');
 const trail=lifeClone(attacker.el,start,'fx-dash-trail');
 fxAnimate(trail,[{opacity:0,transform:'translate(0,0)'},{offset:.3,opacity:.22},{opacity:0,transform:'translate('+dx+'px,'+dy+'px) scale(.85)'}],{duration:350,delay:40,easing:'ease-in'});
 fxAnimate(ghost,[{opacity:1,transform:'translate(0,0) scale(1)'},{offset:.17,transform:'translate('+(-dx*.05)+'px,'+(-dy*.05)+'px) scale(1.08)'},{offset:.45,transform:'translate('+dx+'px,'+dy+'px) scale(.96)'},{offset:.51,transform:'translate('+dx+'px,'+dy+'px) scale(.96)'},{offset:.7,opacity:.9,transform:'translate('+(dx*.82)+'px,'+(dy*.82)+'px) scale(.94)'},{opacity:0,transform:'translate(0,0) scale(1)'}],{duration:620,easing:'cubic-bezier(.2,.65,.35,1)'});
 lifeLater(()=>fxParticles(finish,'sparks',12),280);
};
function lifeEvent(effect,before){
 const owner=lifeOwner(effect.actor),track=$(owner==='me'?'myEventsTrack':'enemyEventsTrack');
 lifeTone('event');lifeDot(fxRect(track),'life-ring event-ring',850);floatAt(fxRect(track),effect.name+' · RESOLVED','shield');
 let targets=[];const enemy=effect.actor===1?2:1;
 if(Number.isInteger(effect.lane)){
  const side=before.sides[enemy],front=side?.units[effect.lane+3],back=side?.units[effect.lane];
  if(['acid','crossfire'].includes(effect.id))targets=[front?.rect,back?.rect];
  else if(effect.id==='ambush')targets=[front?.rect||back?.rect||side?.camps[effect.lane]?.rect];
  else if(effect.id==='blackout'&&!front&&!back)targets=[side?.camps[effect.lane]?.rect];
 }
 if(['viscous','corrosive','rally'].includes(effect.id)&&Number.isInteger(effect.row)){
  const targetOwner=effect.id==='rally'?owner:lifeOwner(enemy),row=$(targetOwner==='me'?(effect.row?'myFront':'myBack'):(effect.row?'enemyFront':'enemyBack'));
  lifeDot(fxRect(row),effect.id==='rally'?'life-ring heal-ring':'life-ring acid-ring',900);
  if(!fxReduced()){const wash=document.createElement('div'),r=row.getBoundingClientRect();wash.className='life-fx life-row-wash '+(effect.id==='rally'?'rally-wash':'acid-wash');Object.assign(wash.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});fxRoot().append(wash);fxAnimate(wash,[{opacity:0,transform:'scaleX(.1)'},{offset:.3,opacity:.75},{opacity:0,transform:'scaleX(1)'}],{duration:850});}
 }
 for(const r of targets)lifeDot(r,'life-ring acid-ring',750);
}
const lifeOldTransition=animateTransition;
animateTransition=function(before,v){
 lifeOldTransition(before,v);
 const effects=LIFE_FEEDBACK.plan(before.view,v),action=v.lastAction||{};
 for(const effect of effects){
  const {actor,slot}=effect,owner=lifeOwner(actor),rect=Number.isInteger(slot)?lifeRect(actor,slot,['repair','base-damaged'].includes(effect.kind)):null;
  if(effect.kind==='deploy'){
   lifeDot(rect,'life-ring landing-ring');lifeTone(effect.rush?'rush':'draw');
   if(effect.rush)floatAt(rect,'RUSH READY','shield');
  }
  if(effect.kind==='move'){
   const previous=before.sides[actor]?.units[effect.from],node=fxElm(owner,slot);
   if(previous?.el&&rect&&!fxReduced()){
    const ghost=lifeClone(previous.el,previous.rect,'life-moving-person'),dx=rect.x-previous.rect.x,dy=rect.y-previous.rect.y;
    fxAnimate(ghost,[{opacity:1,transform:'translate(0,0)'},{offset:.5,transform:'translate('+(dx*.5)+'px,'+(dy*.5-25)+'px) scale(1.06)'},{opacity:0,transform:'translate('+dx+'px,'+dy+'px) scale(1)'}],{duration:430,easing:'ease-in-out'});
   }
   lifeLater(()=>lifeDot(rect,'life-ring landing-ring'),340);
  }
  if(effect.kind==='heal'){
   const actionBase=action.type==='base'&&action.actor===actor?lifeRect(actor,action.base,true):null;
   lifeTravel(effect.medic>=0?lifeRect(actor,effect.medic):actionBase||fxRect($('midLabel')),rect,'healing',4);lifeDot(rect,'life-ring heal-ring',800);lifeTone('heal');
  }
  if(effect.kind==='shield'){lifeDot(rect,'life-ring shield-ring',800);lifeTone('shield');}
  if(effect.kind==='block'){lifeLater(()=>{lifeDot(rect,'life-ring shield-break',450);lifeTone('shield');},action.type==='attack'?280:60);}
  if(effect.kind==='repair'){floatAt(rect,'+'+effect.amount+' HP','water');lifeDot(rect,'life-ring heal-ring',800);lifeTone('heal');}
  if(effect.kind==='base-damaged')lifeLater(()=>floatAt(rect,'BASE DAMAGED','destroyed'),500);
  if(effect.kind==='store'&&actor===me){lifeTravel(fxRect(lifeBowl),fxRect($('siloBtn')));lifeTone('water');}
  if(effect.kind==='refund'&&actor===me){lifeTravel(fxRect($('siloBtn')),fxRect(lifeBowl));lifeTone('water');}
  if(effect.kind==='water'&&actor===me){
   const generated=effect.amount>0;lifeDot(fxRect(lifeBowl),'life-ring water-ring',800);
   if(action.type!=='silo'&&action.type!=='emptySilo'){
    const source=action.type==='base'?lifeRect(actor,action.base,true):action.type==='play'&&defs[action.cardId]?.kind==='unit'?lifeRect(actor,action.lane):fxRect($('midLabel'));
    if(generated)lifeTravel(source,fxRect(lifeBowl));else lifeTravel(fxRect(lifeBowl),source,'water',3);
    floatAt(fxRect(lifeBowl),(generated?'+':'−')+Math.abs(effect.amount)+' WATER','water');
   }
  }
  if(effect.kind==='event')lifeLater(()=>lifeEvent(effect,before),180);
  if(effect.kind==='scan'){
   lifeDot(fxRect($('myDeck')),'life-ring scan-ring',850);lifeTone('scan');
   const card=document.createElement('div');card.className='life-fx life-scan-card';
   const img=document.createElement('img');img.src=artwork(defs[effect.cardId].art);img.alt='';const caption=document.createElement('span');caption.textContent='RADIO SCAN · '+effect.name+' · '+(effect.movedToBottom?'BOTTOM OF SUPPLY':'KEPT FOR DRAW');card.append(img,caption);fxRoot().append(card);
   if(fxReduced())lifeLater(()=>card.remove(),1800);else fxAnimate(card,[{opacity:0,transform:'translateY(12px) scale(.9)'},{offset:.15,opacity:1,transform:'translateY(0) scale(1)'},{offset:.8,opacity:1},{opacity:0,transform:'translateY(-15px) scale(.95)'}],{duration:2100});
  }
  if(effect.kind==='victory'){lifeTone('win');lifeDot({x:innerWidth/2,y:innerHeight*.4},'life-ring victory-ring',1200);}
 }
 if(action.type==='attack'){
  const target=before.sides[action.actor===1?2:1],alive=new Set(v.players.flatMap(p=>p.units.filter(Boolean).map(u=>u.uid)));
  if(target?.units.some(u=>u&&!alive.has(u.uid)))lifeLater(()=>lifeTone('death'),340);
 }
 if(v.turn!==before.view.turn||v.active!==before.view.active)lifeTone('turn');
 if(action.type==='play'&&defs[action.cardId]?.kind==='tactic'){
  lifeDot(fxRect($('midLabel')),'life-ring tactic-ring',650);lifeTone('event');
  if(defs[action.cardId].target==='enemy'&&Number.isInteger(action.lane)){
   const side=before.sides[action.actor===1?2:1],target=side?.units[action.lane+3]||side?.units[action.lane],destination=target?.rect||side?.camps[action.lane]?.rect;
   lifeTravel(fxRect($('midLabel')),destination,'attack',3,230);lifeLater(()=>lifeRecoil(destination,3),230);
  }
 }
};
const lifeOldDraw=fxDraw,lifeKnownHands=new Map();
fxDraw=function(before,p){
 const hand=lifeKnownHands.get(me)||before?.me?.hand||[];
 lifeOldDraw({...before,me:{...before?.me,hand}},p);
 if(p?.hand?.some(c=>!hand.some(old=>(typeof old==='string'?old:old.uid)===c.uid)))lifeTone('draw');
};
const lifeRender=render;
render=function(){
 const v=projected(),scene=role+':'+me;
 const newLocal=role!=='join'&&game!==lifeLocalGame;
 if(newLocal||!upgradePrevious||v&&v.revision<lifePreviousRevision||v?.phase!=='battle')lifeKnownHands.clear();
 if(newLocal||scene!==lifeScene||v&&v.revision<lifePreviousRevision||v?.phase!=='battle'){lifeClear();lifeScene=scene;}
 lifeLocalGame=game;
 lifeRender();if(!v)return;lifePreviousRevision=v.revision;
 if(own(v).hand)lifeKnownHands.set(me,own(v).hand.map(c=>c.uid));
 lifeBowl.style.setProperty('--bowl-fill',Math.max(0,Math.min(100,own(v).water/6*100))+'%');
 document.querySelectorAll('.camp-plate').forEach(el=>{const p=el.dataset.owner==='me'?own(v):foe(v),c=p.camps[Number(el.dataset.lane)];el.classList.toggle('life-damaged',!!c&&c.hp>0&&c.hp<=5);});
};
