/* Presentation only: retain game state, rules and the existing version. */
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
 inspectDefinition(b,'base_'+b.id+(c.hp<=0?'_destroyed':c.hp===1?'_damaged':'_intact'),'BASE · '+b.category.toUpperCase());
 const once=b.wild||b.id==='weld';
 const state=c.hp<=0?'DESTROYED':c.hp===1?'DAMAGED · 1/2 HEALTH':'INTACT · 2/2 HEALTH';
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
   el.querySelector('.camp-hp').textContent=c.hp+'/2 · '+(c.hp<=0?'DESTROYED':c.used?'USED':c.hp===1?'DAMAGED':'INTACT');
   el.querySelector('.camp-art').alt=b.name+' — '+(c.hp<=0?'destroyed':c.hp===1?'damaged':'intact');
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
