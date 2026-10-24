/* v0.10: shared-state animation and a single pointer interaction controller. */
ART.base_beacon=ART.base_beacon_intact=ART.base_beacon_damaged=ART.base_beacon_destroyed='/beacon.webp';
BASE_VISUAL_QA.beacon.quality_flag='high_resolution';
$('midLabel').parentElement.appendChild($('endTurn'));
$('endTurn').innerHTML='END TURN';
$('inspectOverlay').setAttribute('role','dialog');$('inspectOverlay').setAttribute('aria-modal','true');$('inspectOverlay').setAttribute('aria-labelledby','inspectName');
const turnBanner=document.createElement('div');turnBanner.id='turnBanner';turnBanner.setAttribute('role','status');turnBanner.setAttribute('aria-live','polite');document.body.append(turnBanner);
const targetSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');targetSvg.id='targetLines';targetSvg.setAttribute('aria-hidden','true');document.body.append(targetSvg);
targetSvg.innerHTML='<defs><marker id="targetArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#b8efff"/></marker></defs><g id="targetPaths"></g>';
let upgradePrevious=null,upgradeViewer=1,upgradeRole='none',gesture=null,ignoreNextClick=false,turnBannerTimer;
const renderCore=render,dispatchCore=dispatch;
let queueVisual=(fn,delay)=>setTimeout(fn,delay);

function cardKind(d){return d.kind==='unit'?'PERSON':d.kind==='event'?'DELAYED EVENT':d.kind==='base'?'BASE':'TACTIC';}
function baseVisualState(c){return c.hp<=0?'destroyed':c.hp<=5?'damaged':'intact';}
function fitHand(){
 const holder=$('myHand'),cards=[...holder.querySelectorAll('[data-card]')];if(!cards.length)return;
 const available=Math.max(100,holder.clientWidth-14),count=cards.length;
 const w=Math.min(innerWidth<700?112:158,Math.max(innerWidth<700?78:115,available/5.2));
 // More than five cards share a fixed footprint. Hover lifts any individual card above its neighbours.
 const step=count>5?Math.min(w*.70,Math.max(10,(available-w)/(count-1))):Math.min(w+8,(available-w)/Math.max(1,count-1));
 holder.style.setProperty('--hand-width',w+'px');holder.style.setProperty('--hand-overlap',(step-w)+'px');
 cards.forEach((node,i)=>{node.style.zIndex=String(i+1);node.querySelector('img').draggable=false;});
}
function floatAt(rect,text,kind=''){
 if(!rect)return;const el=document.createElement('div');el.className='effect-number '+kind;el.textContent=text;Object.assign(el.style,{left:rect.x+'px',top:rect.y+'px'});document.body.append(el);
 if(fxReduced()){el.style.transform='translate(-50%,-50%)';setTimeout(()=>el.remove(),1100);return;}
 fxAnimate(el,[{opacity:0,transform:'translate(-50%,0) scale(.65)'},{offset:.18,opacity:1,transform:'translate(-50%,-20px) scale(1.15)'},{offset:.65,opacity:1,transform:'translate(-50%,-32px) scale(1)'},{opacity:0,transform:'translate(-50%,-58px) scale(.95)'}],{duration:1200,easing:'ease-out'});
}
function announceTurn(v){
 const mine=v.active===me;turnBanner.innerHTML=(mine?'YOUR TURN':'OPPONENT’S TURN')+'<div class="turn-banner-sub">TURN '+v.turn+(mine?' · DRAW A CARD · READY YOUR PEOPLE':' · PREPARE YOUR NEXT MOVE')+'</div>';
 turnBanner.classList.remove('turn-banner-show');void turnBanner.offsetWidth;turnBanner.classList.add('turn-banner-show');clearTimeout(turnBannerTimer);turnBannerTimer=setTimeout(()=>turnBanner.classList.remove('turn-banner-show'),1800);
}
function captureVisual(v,viewer){
 if(!v||v.phase!=='battle')return null;
 const cards=[...$('myHand').querySelectorAll('[data-card]')].map(el=>({uid:el.dataset.card,el:el.cloneNode(true),rect:fxRect(el)}));
 const enemyCard=document.querySelector('#enemyHand .cardback');
 return {view:v,viewer,cards,enemyCard:{el:enemyCard?.cloneNode(true),rect:fxRect(enemyCard)},deck:fxRect($('myDeck')),sides:Object.fromEntries(v.players.map(p=>{
  const owner=p.id===viewer?'me':'enemy';return [p.id,{units:p.units.map((u,i)=>{const el=fxElm(owner,i);return u?{...u,el:el?.cloneNode(true),rect:fxRect(el)}:null;}),camps:p.camps.map((c,i)=>{const el=fxElm(owner,i,true);return {...c,el:el?.cloneNode(true),rect:fxRect(el)};}),hand:p.hand?.map(c=>({...c}))||[]}];
 }))};
}
function animateAttack(before,action){
 const actor=before.sides[action.actor],enemy=before.sides[action.actor===1?2:1];if(!actor||!enemy)return;
 const attacker=actor.units[action.from],col=action.to;if(!attacker?.rect||!attacker.el)return;
 const defender=enemy.units[col+3]||enemy.units[col],finish=defender?.rect||enemy.camps[col]?.rect;if(!finish)return;
 if(fxReduced())return;
 const start=attacker.rect,dx=finish.x-start.x,dy=finish.y-start.y,ghost=fxClone(attacker.el,start,'fx-attack-sprite');
 fxAnimate(ghost,[{transform:'translate(0,0) scale(1)',opacity:1},{offset:.2,transform:'translate('+(-dx*.05)+'px,'+(-dy*.05)+'px) scale(1.07)'},{offset:.52,transform:'translate('+dx+'px,'+dy+'px) scale(.95)',filter:'brightness(1.7)'},{offset:.7,transform:'translate('+(dx*.9)+'px,'+(dy*.9)+'px) scale(.95)',opacity:.9},{transform:'translate(0,0) scale(1)',opacity:0}],{duration:620,easing:'cubic-bezier(.2,.7,.25,1)'});
 setTimeout(()=>fxParticles(finish,'sparks',14),280);
}
function animateTransition(before,v){
 if(!before||v.phase!=='battle'||before.view.phase!=='battle')return;
 const action=v.lastAction||{},delay=action.type==='attack'?280:action.type==='play'&&defs[action.cardId]?.kind==='tactic'?230:70;
 if(action.type==='play'&&!fxReduced()){
  const owner=action.actor===me?'me':'enemy',d=defs[action.cardId];
  const old=before.sides[action.actor],next=v.players[action.actor-1];
  const played=old?.hand.find(c=>c.id===action.cardId&&!next.hand?.some(n=>n.uid===c.uid));
  const source=action.actor===before.viewer?before.cards.find(c=>c.uid===played?.uid):before.enemyCard;
  const target=d?.kind==='unit'?fxRect(fxElm(owner,action.lane)):d?.kind==='event'?fxRect($(owner==='me'?'myEvents':'enemyEvents')):fxRect($('midLabel'));
  if(source?.el&&source.rect&&target){const ghost=fxClone(source.el,source.rect,'fx-moving-card'),dx=target.x-source.rect.x,dy=target.y-source.rect.y;
   fxAnimate(ghost,[{transform:'translate(0,0) scale(1)',opacity:1},{offset:.5,transform:'translate('+(dx*.5)+'px,'+(dy*.5-45)+'px) scale(1.06)',opacity:1},{transform:'translate('+dx+'px,'+dy+'px) scale(.45)',opacity:0}],{duration:540,easing:'cubic-bezier(.2,.8,.25,1)'});
  }
 }
 if(action.type==='attack')animateAttack(before,action);
 const alive=new Set(v.players.flatMap(p=>p.units.filter(Boolean).map(u=>u.uid)));
 for(const p of v.players){
  const old=before.sides[p.id],owner=p.id===me?'me':'enemy';if(!old)continue;
  for(let i=0;i<6;i++){
   const prior=old.units[i],u=p.units[i],node=fxElm(owner,i);
   if(prior&&!alive.has(prior.uid))queueVisual(()=>{if(!fxReduced())fxDeath(prior);floatAt(prior.rect,'DESTROYED','destroyed');},delay);
   const existing=u?Object.values(before.sides).flatMap(s=>s.units).find(x=>x?.uid===u.uid):null;
   if(u&&!existing){if(!fxReduced())p2ReplayClass(node,'fx-materialize',660);floatAt(fxRect(node),'DEPLOYED','shield');}
   if(u&&existing&&u.hp<existing.hp){const hitRect=fxRect(node);queueVisual(()=>{if(!fxReduced()&&node?.isConnected)p2ReplayClass(node,'fx-impact',420);floatAt(hitRect,'-'+(existing.hp-u.hp));},delay);}
   if(u&&existing&&u.hp>existing.hp)floatAt(fxRect(node),'+'+(u.hp-existing.hp)+' HP','water');
   if(u?.shield){node?.classList.add('shielded');if(!existing?.shield){if(!fxReduced())p2ReplayClass(node,'barrier-applied',800);floatAt(fxRect(node),'BARRIER APPLIED','shield');}}
   if(existing?.shield&&!u?.shield&&action.type!=='end'){floatAt(existing.rect,'BLOCKED','shield');}
  }
  for(let i=0;i<3;i++){
   const prior=old.camps[i],c=p.camps[i];if(c&&prior&&c.hp<prior.hp){const rect=fxRect(fxElm(owner,i,true))||prior.rect;
    queueVisual(()=>{if(!fxReduced()){fxBaseHit(rect,c.hp===0);if(c.hp===0)fxDeath(prior);}floatAt(rect,'−'+(prior.hp-c.hp)+' DAMAGE');if(c.hp===0)queueVisual(()=>floatAt(rect,'BASE DESTROYED','destroyed'),330);},delay);
   }
  }
 }
 const changedTurn=v.turn!==before.view.turn||v.active!==before.view.active;
 if(changedTurn){announceTurn(v);const p=own(v);if(v.active===me&&p.siloGained){floatAt(fxRect($('waterCount')),'+'+p.siloGained+' WATER FROM SILO','water');toast('+'+p.siloGained+' water gained from silo this turn.');}}
 if(!fxReduced()){
  const p=own(v),old=before.sides[me];
  if(before.viewer===me)fxDraw({me:{hand:old?.hand||[]},deckRect:before.deck},p);
  else if(changedTurn&&p.hand?.length)fxDraw({me:{hand:p.hand.slice(0,-1)},deckRect:fxRect($('myDeck'))},p);
 }
}
render=function(){
 const v=projected();if(!v)return;
 const previous=upgradePrevious;
 const sameMatch=previous&&v.revision>=previous.revision&&upgradeRole===role;
 const changed=sameMatch&&v.revision!==previous.revision;
 const captured=changed?captureVisual(previous,upgradeViewer):null;
 renderCore();
 if(v.phase==='battle'){
  for(const owner of ['me','enemy']){const p=owner==='me'?own(v):foe(v);p.units.forEach((u,i)=>{const node=fxElm(owner,i);if(!node||!u)return;node.classList.toggle('exhausted',!u.ready);node.classList.toggle('shielded',!!u.shield);if(u.shield){const label=document.createElement('span');label.className='shield-label';label.textContent='BARRIER';node.append(label);}});}
  fitHand();
  $('waterCount').textContent=own(v).water+'/6 WATER'+(own(v).siloGained?' · +'+own(v).siloGained+' FROM SILO':'')+(own(v).bonusGenerated?' · +'+own(v).bonusGenerated+' GENERATED':'');
  $('endTurn').title='End turn. Automatically store remaining water up to your silo capacity.';
  $('endTurn').classList.remove('turn-ready');if(getMyTurn()&&!anyTacticalAction(v,own(v),foe(v)))$('endTurn').classList.add('turn-ready');
  $('siloBtn').classList.remove('silo-reminder');
  for(const [id,p] of [['raidBtn',own(v)],['enemy',foe(v)]]){const node=id==='enemy'?document.querySelector('.device-raid.enemy-pent'):$(id);if(!node)continue;let progress=node.querySelector('.raid-progress');if(!progress){progress=document.createElement('span');progress.className='raid-progress';node.append(progress);}progress.textContent=p.raids?.length?(2-p.raids[0].remaining)+'/2 · COLUMN '+(p.raids[0].lane+1):'0/2 · READY';}
  $('helpText').textContent='Drag people to attack · Click cards to select · Right-click to inspect · Click elsewhere to cancel';
  if(captured)animateTransition(captured,v);else if(!previous||previous.phase!=='battle')announceTurn(v);
 }
 upgradePrevious=structuredClone(v);upgradeViewer=me;upgradeRole=role;
 updateTargetLines();
};
dispatch=function(action){dispatchCore(action);};
function inspectDefinition(d,art,type){
 $('inspectArt').src=artwork(art);$('inspectArt').alt=d.name+' — complete illustration';
 $('inspectName').textContent=d.name+' · '+(type||cardKind(d))+' · '+d.cost+' WATER';
 $('inspectDesc').textContent=d.text+(d.kind==='unit'?'\n\nAttack '+d.atk+' · Health '+d.hp:'');$('inspectAttack').style.display='none';modal('inspectOverlay',true);
}
function inspectBase(owner,index){const v=projected();if(!v)return;const c=(owner==='me'?own(v):foe(v)).camps[index],b=RULES.baseMap[c?.baseId];if(!b)return;
 inspectDefinition(b,'base_'+b.id+'_'+baseVisualState(c),'BASE · '+b.category.toUpperCase());
 $('inspectDesc').textContent=b.text+'\n\n'+baseVisualState(c).toUpperCase()+' · '+c.hp+'/'+c.maxHp+' HEALTH · '+(b.target==='passive'?'PASSIVE':b.wild?'ONCE PER MATCH':c.used?'USED THIS TURN':'ONCE PER TURN')+(owner==='me'?'\nClick your base on the board to activate its ability.':'');
}
let catalogKind='unit';
function showCatalog(kind='unit'){
 catalogKind=kind;
 let tabs=$('catalogTabs');if(!tabs){tabs=document.createElement('div');tabs.id='catalogTabs';tabs.className='catalog-tabs';$('rosterGrid').before(tabs);tabs.addEventListener('click',e=>{const b=e.target.closest('[data-catalog]');if(b)showCatalog(b.dataset.catalog);});}
 tabs.innerHTML=[['unit','PEOPLE'],['base','BASES'],['event','EVENTS'],['tactic','TACTICS']].map(([k,label])=>'<button data-catalog="'+k+'" aria-pressed="'+(k===kind)+'">'+label+'</button>').join('');
 const list=kind==='base'?RULES.baseDefs:Object.entries(defs).filter(([id,d])=>id!=='drone'&&d.kind===kind).map(([id,d])=>({...d,id}));
 $('rosterOverlay').querySelector('.roster-head h2').textContent='CARD CATALOGUE';
 $('rosterOverlay').querySelector('.roster-head p').textContent=list.length+' '+(kind==='unit'?'people':kind==='base'?'bases':kind==='event'?'events':'tactics')+' · Complete artwork and rules';
 $('rosterGrid').innerHTML=list.map(d=>{const art=kind==='base'?'base_'+d.id:d.art;return '<article class="roster-card kind-'+kind+'"><div class="roster-art"><img src="'+artwork(art)+'" alt="'+safe(d.name)+' — complete illustration" loading="lazy"><span class="roster-water">'+d.cost+'</span></div><div class="roster-body"><div class="roster-count">'+(kind==='base'?'BASE · '+safe(d.category):cardKind(d))+(kind!=='base'&&!RULES.decklist.includes(d.id)?' · RESERVE CARD':'')+'</div><h3>'+safe(d.name)+'</h3>'+(kind==='unit'?'<div class="roster-stats"><span>⚔ '+d.atk+' ATTACK</span><span>♥ '+d.hp+' HP</span></div>':'')+'<p>'+safe(d.text)+'</p></div></article>';}).join('');
 modal('rosterOverlay',true);
}
function clearGesture(){gesture?.ghost?.remove();gesture=null;document.body.classList.remove('card-dragging','interaction-held');document.querySelectorAll('.drag-over').forEach(el=>el.classList.remove('drag-over'));updateTargetLines();}
function clearSelection(){selected=null;render();}
function updateTargetLines(point){
 const group=$('targetPaths');if(!group)return;group.innerHTML='';if(selected?.kind!=='attack'||!projected()||projected().phase!=='battle')return;
 const source=fxRect(fxElm('me',selected.from));if(!source)return;
 const add=(end,aim=false)=>{const p=document.createElementNS('http://www.w3.org/2000/svg','path');const bend=Math.min(90,Math.abs(end.y-source.y)*.35);p.setAttribute('d','M '+source.x+' '+source.y+' Q '+((source.x+end.x)/2+bend)+' '+((source.y+end.y)/2)+' '+end.x+' '+end.y);p.setAttribute('class','target-line'+(aim?' aim':''));p.setAttribute('marker-end','url(#targetArrow)');group.append(p);};
 document.querySelectorAll('[data-owner="enemy"][data-lane]').forEach(el=>{if(isLaneTarget('enemy',Number(el.dataset.lane),el.hasAttribute('data-camp')?'camp':'slot')){const r=fxRect(el.querySelector('.unit-piece')||el);if(r)add(r);}});
 if(point)add({x:point.x,y:point.y},true);
}
$('board-wrap').addEventListener('pointerdown',e=>{
 if(selected?.kind?.startsWith('reposition'))return;
 if(e.button!==0||!getMyTurn()||projected()?.phase!=='battle')return;
 const hand=e.target.closest('[data-card]'),unit=e.target.closest('.unit-piece');
 if(hand){const c=own(projected()).hand.find(c=>c.uid===hand.dataset.card);if(!c)return;gesture={kind:'card',uid:c.uid,startX:e.clientX,startY:e.clientY,pointer:e.pointerId,started:false};}
 else if(unit){const slot=unit.closest('[data-owner][data-lane]');const u=slot?.dataset.owner==='me'?own(projected()).units[Number(slot.dataset.lane)]:null;if(!u?.ready)return;gesture={kind:'attack',from:Number(slot.dataset.lane),startX:e.clientX,startY:e.clientY,pointer:e.pointerId,started:false};}
 else return;
 document.body.classList.add('interaction-held');e.preventDefault();
});
window.addEventListener('pointermove',e=>{
 const g=gesture;if(!g||g.pointer!==e.pointerId)return;
 if(!g.started){if(Math.hypot(e.clientX-g.startX,e.clientY-g.startY)<8)return;
  if(g.kind==='card'){
   const p=own(projected()),card=p.hand.find(c=>c.uid===g.uid),d=defs[card?.id];if(!d||d.cost>p.water){clearGesture();toast('Not enough water.');return;}
   const source=$('myHand').querySelector('[data-card="'+CSS.escape(g.uid)+'"]');g.ghost=source?.cloneNode(true);if(g.ghost){g.ghost.removeAttribute('data-card');g.ghost.classList.add('drag-ghost');document.body.append(g.ghost);}
   selected=d.kind==='unit'?{kind:'unit',uid:g.uid,cardId:card.id}:d.target?{kind:'play',uid:g.uid,cardId:card.id}:{kind:'cast',uid:g.uid,cardId:card.id};
  }else selected={kind:'attack',from:g.from};
  g.started=true;document.body.classList.add('card-dragging');render();
 }
 if(g.ghost){g.ghost.style.left=e.clientX+'px';g.ghost.style.top=e.clientY+'px';}
 document.querySelectorAll('.drag-over').forEach(el=>el.classList.remove('drag-over'));
 const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-owner][data-lane]');
 if(hit&&isLaneTarget(hit.dataset.owner,Number(hit.dataset.lane),hit.hasAttribute('data-camp')?'camp':'slot'))hit.classList.add('drag-over');
 if(g.kind==='attack')updateTargetLines({x:e.clientX,y:e.clientY});if(e.cancelable)e.preventDefault();
},{passive:false});
window.addEventListener('pointerup',e=>{
 const g=gesture;if(!g||g.pointer!==e.pointerId)return;
 const el=document.elementFromPoint(e.clientX,e.clientY),hit=el?.closest('[data-owner][data-lane]');
 const started=g.started;
 clearGesture();
 if(!started)return;
 ignoreNextClick=true;setTimeout(()=>ignoreNextClick=false,250);
 if(getMyTurn()&&hit&&isLaneTarget(hit.dataset.owner,Number(hit.dataset.lane),hit.hasAttribute('data-camp')?'camp':'slot'))selectLane(hit.dataset.owner,Number(hit.dataset.lane),hit.hasAttribute('data-camp')?'camp':'slot');
 else if(getMyTurn()&&selected?.kind==='cast'&&el?.closest('.board-layout')&&!el.closest('.hand-zone'))dispatch({type:'play',uid:g.uid});
 else{clearSelection();toast(g.kind==='attack'?'Attack cancelled. Drop onto a connected target.':'Play cancelled. Drop onto a highlighted target.');}
});
window.addEventListener('pointercancel',()=>{if(gesture){clearGesture();clearSelection();}});
document.addEventListener('click',e=>{
 if(ignoreNextClick){e.preventDefault();e.stopImmediatePropagation();ignoreNextClick=false;return;}
 if(e.target.closest('#inspectOverlay,#rosterOverlay,#draftOverlay,#passOverlay,#winOverlay'))return;
 const hand=e.target.closest('[data-card]'),lane=e.target.closest('[data-owner][data-lane]');
 if(hand){if(selected?.kind==='base-discard'){selectHand(hand.dataset.card);}else if(getMyTurn()){selectHand(hand.dataset.card);}else inspectCard(hand.dataset.card);return;}
 if(lane&&projected()?.phase==='battle'){
  const owner=lane.dataset.owner,index=Number(lane.dataset.lane),camp=lane.hasAttribute('data-camp');
  if(selected){if(selected.kind==='attack'&&owner==='me'&&selected.from===index&&!camp){clearSelection();return;}selectLane(owner,index,camp?'camp':'slot');return;}
  if(camp){if(owner==='me'&&getMyTurn())activateBase(index);else inspectBase(owner,index);}
  else if((owner==='me'?own(projected()):foe(projected())).units[index])inspectUnit(owner,index);
  return;
 }
 if(selected&&!e.target.closest('#cancelSelection,#siloBtn,#raidBtn,#drawCard,#endTurn'))clearSelection();
},true);
$('board-wrap').addEventListener('contextmenu',e=>{const card=e.target.closest('[data-card]'),lane=e.target.closest('[data-owner][data-lane]');if(card){e.preventDefault();inspectCard(card.dataset.card);}else if(lane){e.preventDefault();if(lane.hasAttribute('data-camp'))inspectBase(lane.dataset.owner,Number(lane.dataset.lane));else inspectUnit(lane.dataset.owner,Number(lane.dataset.lane));}});
$('myHand').addEventListener('dblclick',e=>{const c=e.target.closest('[data-card]');if(c)inspectCard(c.dataset.card);});
$('board-wrap').addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const card=e.target.closest('[data-card]'),lane=e.target.closest('[data-owner][data-lane]');if(card){e.preventDefault();selectHand(card.dataset.card);}else if(lane){e.preventDefault();const owner=lane.dataset.owner,index=Number(lane.dataset.lane),camp=lane.hasAttribute('data-camp');if(selected)selectLane(owner,index,camp?'camp':'slot');else if(camp)inspectBase(owner,index);else inspectUnit(owner,index);}});
$('inspectOverlay').addEventListener('click',e=>{if(e.target.id==='inspectOverlay')modal('inspectOverlay',false);});
window.addEventListener('resize',()=>{fitHand();updateTargetLines();});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&gesture){clearGesture();clearSelection();}});
