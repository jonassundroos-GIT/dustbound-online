/* Blackwater test controls; authoritative actions remain in rules.cjs. */
const blackwaterBoard=$('board-wrap');
blackwaterBoard.appendChild(document.querySelector('.top-hud'));
const blackwaterLabel=document.createElement('div');
blackwaterLabel.className='blackwater-test-label';
blackwaterLabel.textContent='BLACKWATER · TEST BUILD · v0.10.0';
blackwaterBoard.appendChild(blackwaterLabel);
document.querySelector('.board-layout').appendChild($('endTurn'));
$('endTurn').innerHTML='END<br>TURN';
$('drawCard').innerHTML='DRAW<br>2 WATER';
const fullscreenButton=document.createElement('button');
fullscreenButton.id='blackwaterFullscreen';fullscreenButton.textContent='FULL SCREEN';
fullscreenButton.addEventListener('click',async()=>{
 try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
 catch(e){toast('Use your browser full-screen control to expand the game.');}
});
document.querySelector('.hud-right').prepend(fullscreenButton);
document.addEventListener('fullscreenchange',()=>{fullscreenButton.textContent=document.fullscreenElement?'EXIT FULL SCREEN':'FULL SCREEN';fitHand();});
const siloVessel=document.createElement('span');siloVessel.className='silo-vessel';siloVessel.setAttribute('aria-hidden','true');siloVessel.innerHTML='<i></i><span></span>';
$('siloBtn').append(siloVessel);
const siloNext=document.createElement('span');siloNext.className='silo-next';$('siloBtn').append(siloNext);
for(const [id,label] of [['enemyEventsTrack','Opponent events'],['myEventsTrack','Your events']]){
 $(id).setAttribute('role','region');$(id).setAttribute('aria-label',label);
}
const blackwaterActivateBase=activateBase;
// A base click explains the power before the player chooses to use it.
activateBase=function(index){inspectBase('me',index);};
inspectBase=function(owner,index){
 const v=projected();if(!v)return;
 const p=owner==='me'?own(v):foe(v),c=p.camps[index],b=RULES.baseMap[c?.baseId];if(!b)return;
 inspectDefinition(b,'base_'+b.id+(c.hp<=0?'_destroyed':c.hp<c.maxHp?'_damaged':'_intact'),'BASE · '+b.category.toUpperCase());
 const once=b.wild||b.id==='weld';
 const state=(c.hp<=0?'DESTROYED':c.hp<c.maxHp?'DAMAGED':'INTACT')+' · '+c.hp+'/'+c.maxHp+' HEALTH';
 const timing=b.target==='passive'?'PASSIVE · AUTOMATIC':once?'ONCE PER MATCH':'ONCE PER TURN';
 $('inspectDesc').textContent=b.text+'\n\n'+b.cost+' WATER · '+timing+'\n'+state;
 if(owner!=='me')return;
 let reason=b.target==='passive'?'This ability applies automatically.':c.hp<=0?'This base is destroyed.':once&&c.wildUsed?'This once-per-match ability has been used.':c.used?'This base has been used this turn.':!getMyTurn()?'Available on your turn.':p.water<b.cost?'You need '+b.cost+' water to use this ability.':'';
 if(reason){const status=document.createElement('span');status.className='base-ability-status';status.textContent=reason;$('inspectDesc').append(status);}
 if(b.target==='passive'||c.hp<=0)return;
 const use=document.createElement('button');use.type='button';use.className='base-activate';use.textContent='USE ABILITY · '+b.cost+' WATER';use.disabled=!!reason;
 use.addEventListener('click',()=>{
  modal('inspectOverlay',false);selected=null;blackwaterActivateBase(index);
  if(selected?.kind==='base-discard')toast('Choose a card in your hand to discard.');
  else if(selected?.kind==='base')toast(b.target==='move'?'Choose a friendly person to move.':'Choose a highlighted target for '+b.name+'.');
 });
 $('inspectDesc').append(use);
};

const historyPanel=document.createElement('section');
historyPanel.id='matchHistory';historyPanel.hidden=true;historyPanel.setAttribute('role','dialog');historyPanel.setAttribute('aria-label','Match history');
historyPanel.innerHTML='<div class="history-heading"><strong>MATCH HISTORY</strong><button id="closeHistory" type="button">CLOSE</button></div><p>Newest actions first · public plays and ability results</p><ol id="historyEntries"></ol>';
document.body.append(historyPanel);
const historyButton=document.createElement('button');historyButton.id='historyButton';historyButton.textContent='HISTORY';historyButton.setAttribute('aria-expanded','false');
document.querySelector('.hud-right').prepend(historyButton);
function closeHistory(){historyPanel.hidden=true;historyButton.setAttribute('aria-expanded','false');historyButton.focus();}
historyButton.addEventListener('click',()=>{historyPanel.hidden=!historyPanel.hidden;historyButton.setAttribute('aria-expanded',String(!historyPanel.hidden));if(!historyPanel.hidden)$('closeHistory').focus();});
$('closeHistory').addEventListener('click',closeHistory);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!historyPanel.hidden)closeHistory();});
const moveButton=document.createElement('button');moveButton.id='movePerson';moveButton.textContent='CHANGE LANES';blackwaterBoard.append(moveButton);
moveButton.addEventListener('click',()=>{if(!getMyTurn())return;selected={kind:'reposition-from'};render();});
const emptyButton=document.createElement('button');emptyButton.id='emptySilo';emptyButton.type='button';blackwaterBoard.append(emptyButton);
emptyButton.addEventListener('click',()=>dispatch({type:'emptySilo'}));
const laneTargetsBeforeMove=isLaneTarget,selectLaneBeforeMove=selectLane;
function movable(p,index){const u=p.units[index];return !!u&&defs[u.id]?.trait!=='anchored'&&p.water>=defs[u.id].cost;}
isLaneTarget=function(owner,index,part='slot'){
 if(selected?.kind==='reposition-from'||selected?.kind==='reposition-to'){
  if(owner!=='me'||part==='camp'||!getMyTurn()||index<0||index>=6)return false;
  const p=own(projected());
  return selected.kind==='reposition-from'?movable(p,index):index!==selected.from&&movable(p,selected.from)&&defs[p.units[index]?.id]?.trait!=='anchored';
 }
 return laneTargetsBeforeMove(owner,index,part);
};
selectLane=function(owner,index,part='slot'){
 if(selected?.kind==='reposition-from'||selected?.kind==='reposition-to'){
  if(!isLaneTarget(owner,index,part)){selected=null;render();return;}
  if(selected.kind==='reposition-from'){selected={kind:'reposition-to',from:index};render();}
  else dispatch({type:'reposition',from:selected.from,to:index});
  return;
 }
 return selectLaneBeforeMove(owner,index,part);
};
let historyRevision='',radioRevision='';
const renderWithBlackwaterActions=render;
render=function(){
 renderWithBlackwaterActions();const v=projected();if(!v)return;const p=own(v);
 emptyButton.textContent='EMPTY SILO · +'+p.silo+' WATER';
 emptyButton.disabled=!getMyTurn()||!p.silo||p.water+p.silo>6;
 emptyButton.title=p.water+p.silo>6?'Spend water first so the entire silo fits within the 6-water reserve.':'Return all stored water to your reserves immediately.';
 moveButton.disabled=!getMyTurn()||!p.units.some((u,i)=>movable(p,i));
 if(selected?.kind==='reposition-from')$('midLabel').textContent='CHANGE LANES · choose a person · pay its printed water cost';
 if(selected?.kind==='reposition-to'){
  const u=p.units[selected.from];$('midLabel').textContent=u?'MOVE '+u.name+' · '+defs[u.id].cost+' WATER · choose any friendly slot to move or swap':'Choose a person';
 }
 document.querySelectorAll('.unit-piece').forEach(el=>{
  const lane=el.closest('[data-owner][data-lane]');if(!lane)return;
  const u=(lane.dataset.owner==='me'?p:foe(v)).units[Number(lane.dataset.lane)];
  if(u?.freshRush&&u.ready){const badge=document.createElement('span');badge.className='rush-ready';badge.textContent='RUSH READY';el.append(badge);}
 });
 const key=role+':'+me+':'+v.revision;
 if(key!==historyRevision){
  historyRevision=key;const list=$('historyEntries'),scroll=list.scrollTop;list.replaceChildren();
  for(const entry of v.log){const li=document.createElement('li');li.textContent=entry;list.append(li);}list.scrollTop=scroll;
 }
 const radioKey=role+':'+me+':'+v.turn+':'+JSON.stringify(v.reveals);
 if(radioKey!==radioRevision){radioRevision=radioKey;for(const r of v.reveals||[])toast('Player '+r.actor+' · Radio Operator: '+r.name+' ('+r.cost+' water) · '+(r.movedToBottom?'sent to bottom of supply':'kept for normal draw')+'. See History.');}
};
fitHand=function(){
 const holder=$('myHand'),cards=[...holder.querySelectorAll('[data-card]')];if(!cards.length)return;
 const available=holder.clientWidth-12,count=cards.length;
 const w=Math.min(240,Math.max(176,available/5.25));
 const step=Math.min(w+10,Math.max(18,(available-w)/Math.max(1,count-1)),count>5?w*.72:w+10);
 holder.style.setProperty('--hand-width',w+'px');holder.style.setProperty('--hand-overlap',(step-w)+'px');
 cards.forEach((el,i)=>{el.style.zIndex=String(i+1);el.querySelector('img').draggable=false;});
};
const blackwaterRender=render;
render=function(){
 blackwaterRender();
 const v=projected();if(!v)return;
 $('waterCount').textContent=own(v).water+' / 6';
 document.querySelectorAll('.camp-plate').forEach(el=>{
  const p=el.dataset.owner==='me'?own(v):foe(v),c=p.camps[Number(el.dataset.lane)];
  if(c){
   const b=RULES.baseMap[c.baseId];
   el.querySelector('.camp-hp').textContent=c.hp+'/'+c.maxHp+' HP · '+(c.hp<=0?'DESTROYED':c.used?'USED':c.hp<c.maxHp?'DAMAGED':'INTACT');
   el.querySelector('.camp-art').alt=b.name+' — '+(c.hp<=0?'destroyed':c.hp<c.maxHp?'damaged':'intact');
   el.querySelector('.base-cost-mark').setAttribute('aria-label',b.cost+' water');
   const cost=document.createElement('span');cost.className='base-water-label';cost.textContent=b.cost+' WATER'+(b.target==='passive'?' · PASSIVE':'');
   el.querySelector('.camp-title').after(cost);
  }
 });
 $('myDeck').textContent='SUPPLY '+v.sharedDeckCount+' · DISCARD '+own(v).discardCount;
 const p=own(v),capacity=p.camps.some(c=>c.baseId==='reservoir'&&c.hp>0)?2:1;
 $('siloBtn').style.setProperty('--silo-fill',(100*p.silo/capacity)+'%');
 $('siloBtn').classList.toggle('silo-charged',p.silo>0);
 $('mySilo').textContent=p.silo+' / '+capacity+' STORED';
 siloNext.textContent=p.silo?'+'+p.silo+' NEXT TURN':'STORE WATER';
 $('siloBtn').setAttribute('aria-label','Water silo: '+p.silo+' of '+capacity+' stored. '+(p.silo?'Gain '+p.silo+' extra water next turn.':'Spend 1 water to store 1 for your next turn.'));
};
