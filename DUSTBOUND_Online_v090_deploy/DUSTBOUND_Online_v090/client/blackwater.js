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
  if(c)el.querySelector('.camp-hp').textContent=c.hp;
 });
 $('myDeck').textContent='SUPPLY '+v.sharedDeckCount+' · DISCARD '+own(v).discardCount;
 const p=own(v),capacity=p.camps.some(c=>c.baseId==='reservoir'&&c.hp>0)?2:1;
 $('siloBtn').style.setProperty('--silo-fill',(100*p.silo/capacity)+'%');
 $('siloBtn').classList.toggle('silo-charged',p.silo>0);
 $('mySilo').textContent=p.silo+' / '+capacity+' STORED';
 siloNext.textContent=p.silo?'+'+p.silo+' NEXT TURN':'STORE WATER';
 $('siloBtn').setAttribute('aria-label','Water silo: '+p.silo+' of '+capacity+' stored. '+(p.silo?'Gain '+p.silo+' extra water next turn.':'Spend 1 water to store 1 for your next turn.'));
};
