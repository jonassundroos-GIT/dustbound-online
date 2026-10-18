const {test}=require('node:test');
const assert=require('node:assert/strict');
const R=require('../rules.cjs');
const make=(ids=['market','barrier','hospital'])=>R.newTestGame(ids);
const act=(g,a,actor=1)=>{const r=R.apply(g,actor,a);assert.equal(r.ok,true,r.error);};
let serial=0;
function deploy(g,id,lane,actor=1){const p=g.players[actor-1];p.water=6;const uid='fixture-'+(++serial);p.hand.push({id,uid});act(g,{type:'play',uid,lane},actor);return p.units[lane];}
function nextOwnTurn(g){act(g,{type:'end'});act(g,{type:'end'},2);}

test('draft and quick games give every base ten health',()=>{
 for(const c of make().players.flatMap(p=>p.camps))assert.deepEqual([c.hp,c.maxHp],[10,10]);
 const g=R.newGame();for(const p of g.players)act(g,{type:'draft',bases:p.offer.slice(0,3)},p.id);
 assert(g.players.flatMap(p=>p.camps).every(c=>c.hp===10&&c.maxHp===10));
});
test('base damage uses effective attack including row bonus and goo, clamps at zero',()=>{
 const g=make(),u=deploy(g,'stalker',3);u.ready=true;u.tempAtk=2;u.weakened=1;g.players[0].gooRows[1]=1;
 act(g,{type:'attack',from:3,to:0});assert.equal(g.players[1].camps[0].hp,8);
 u.ready=true;u.tempAtk=20;act(g,{type:'attack',from:3,to:0});assert.equal(g.players[1].camps[0].hp,0);
});
test('zero attack does no base damage; Breach doubles the next exposed attack',()=>{
 const g=make(['breach','barrier','hospital']),u=deploy(g,'medic',3);u.ready=true;u.weakened=2;
 act(g,{type:'attack',from:3,to:0});assert.equal(g.players[1].camps[0].hp,10);
 u.weakened=0;u.atk=3;u.ready=true;g.players[0].water=6;act(g,{type:'base',base:0});act(g,{type:'attack',from:3,to:0});assert.equal(g.players[1].camps[0].hp,4);assert.equal(g.players[0].breach,false);
});
test('a defending person still protects the base and both sides retaliate',()=>{
 const g=make(),a=deploy(g,'warden',3);g.active=2;const b=deploy(g,'convoy',0,2);g.active=1;a.ready=true;
 act(g,{type:'attack',from:3,to:0});assert.equal(b.hp,3);assert.equal(a.hp,1);assert.equal(g.players[1].camps[0].hp,10);
});
test('Patch Kit repairs any living damaged base fully, never revives a destroyed base',()=>{
 for(const hp of [1,5,9]){const g=make(),p=g.players[0];p.camps[0].hp=hp;p.hand.push({id:'patch',uid:'patch'});act(g,{type:'play',uid:'patch',lane:0});assert.equal(p.camps[0].hp,10);}
 for(const hp of [0,10]){const g=make();g.players[0].camps[0].hp=hp;g.players[0].hand.push({id:'patch',uid:'patch'});assert.match(R.legal(g,1,{type:'play',uid:'patch',lane:0}),/damaged/);}
});
test('Weld and Repair Convoy restore ten-health bases',()=>{
 const g=make(['weld','market','hospital']),p=g.players[0];p.water=6;p.camps[1].hp=6;
 act(g,{type:'base',base:0,lane:1});assert.equal(p.camps[1].hp,10);assert(p.camps[0].wildUsed);
 p.camps[1].hp=3;p.hand.push({id:'repaircrew',uid:'repair'});act(g,{type:'play',uid:'repair',lane:1});nextOwnTurn(g);assert.equal(p.camps[1].hp,10);
});
test('paid move and swap charge only the selected person and preserve exhaustion',()=>{
 const g=make(),p=g.players[0],u=deploy(g,'medic',0),v=deploy(g,'marauder',4);p.water=6;u.ready=false;v.ready=true;
 act(g,{type:'reposition',from:0,to:3});assert.equal(p.water,4);assert.equal(p.units[3],u);assert.equal(u.ready,false);
 act(g,{type:'reposition',from:3,to:4});assert.equal(p.water,2);assert.equal(p.units[4],u);assert.equal(p.units[3],v);assert.equal(v.ready,true);assert.equal(u.ready,false);
});
test('reposition rejects anchored units, invalid slots and insufficient water without mutation',()=>{
 const g=make(),p=g.players[0];deploy(g,'turret',0);deploy(g,'medic',3);p.water=1;
 for(const a of [{from:0,to:1},{from:3,to:0},{from:3,to:4},{from:3,to:3},{from:3,to:6},{from:2,to:4}]){
  const before=JSON.stringify(g);assert.equal(R.apply(g,1,{type:'reposition',...a}).ok,false);assert.equal(JSON.stringify(g),before);
 }
});
test('moving updates bearer aura and does not enable a fresh Rush in Toxic Goo',()=>{
 const g=make(),p=g.players[0];deploy(g,'banner',3);const ally=deploy(g,'medic',4);assert.equal(ally.auraBonus,1);p.water=6;
 act(g,{type:'reposition',from:4,to:0});assert.equal(ally.auraBonus,0);assert.equal(ally.maxHp,3);
 const h=deploy(g,'hound',1);p.gooRows[1]=1;p.water=6;act(g,{type:'reposition',from:1,to:4});assert.equal(h.ready,false);
});
test('silo returns stored water immediately on the same turn with no generation',()=>{
 const g=make(['reservoir','barrier','hospital']),p=g.players[0],total=p.water;
 act(g,{type:'silo'});act(g,{type:'silo'});assert.equal(p.silo,2);act(g,{type:'emptySilo'});
 assert.equal(p.water,total);assert.equal(p.silo,0);assert.equal(p.bonusGenerated,0);assert.match(R.legal(g,1,{type:'emptySilo'}),/empty/);
 act(g,{type:'end'});assert.equal(p.water+p.silo,total);
});
test('refund never loses water above reserve capacity or works on opponent turn',()=>{
 const g=make(),p=g.players[0];p.water=6;p.silo=1;const before=JSON.stringify(g);
 assert.equal(R.apply(g,1,{type:'emptySilo'}).ok,false);assert.equal(JSON.stringify(g),before);assert.match(R.legal(g,2,{type:'emptySilo'}),/not your turn/);
});
test('Field Medic prioritizes wounded ally in its column over itself',()=>{
 const g=make(),medic=deploy(g,'medic',0),ally=deploy(g,'convoy',3);medic.hp=1;ally.hp=2;
 nextOwnTurn(g);assert.equal(ally.hp,3);assert.equal(medic.hp,1);assert(g.log.some(x=>x.includes('Field Medic restores 1 HP to Convoy Truck')));
});
test('Field Medic can heal itself when ally is full; no healing across columns or overheal',()=>{
 const g=make(),medic=deploy(g,'medic',3),ally=deploy(g,'convoy',0),other=deploy(g,'warden',1);medic.hp=1;other.hp=1;
 nextOwnTurn(g);assert.equal(medic.hp,2);assert.equal(ally.hp,5);assert.equal(other.hp,1);
 nextOwnTurn(g);assert.equal(medic.hp,3);nextOwnTurn(g);assert.equal(medic.hp,3);
});
test('Radio scans only its owners turn, after the opponent has drawn',()=>{
 const g=make();deploy(g,'radio',0);g.players[0].hand=[];g.sharedDeck=[{id:'cache',uid:'bottom'},{id:'medic',uid:'draw'},{id:'golem',uid:'revealed'}];nextOwnTurn(g);
 assert.equal(g.players[0].hand[0].id,'medic');assert.equal(g.reveals[0].cardId,'medic');
});
test('Radio turn-start high and low scans follow printed costs and disclose no other supply cards',()=>{
 for(const [top,expected,bottom] of [['golem','medic',true],['hound','hound',false]]){
  const g=make();deploy(g,'radio',0);g.players[0].hand=[];g.active=2;g.sharedDeck=[{id:'cache',uid:'secret'},{id:'medic',uid:'next'},{id:top,uid:'reveal'}];act(g,{type:'end'},2);
  assert.equal(g.players[0].hand[0].id,expected);assert.equal(g.reveals[0].movedToBottom,bottom);assert.equal(g.reveals[0].cardId,top);
  assert.deepEqual(R.project(g,2).reveals,g.reveals);assert.equal(R.project(g,2).players[0].hand,null);assert(!g.log.some(x=>x.includes('Water Cache')));
 }
});
test('Scrap Hound attacks an enemy person on deployment then exhausts',()=>{
 const g=make();g.active=2;const target=deploy(g,'medic',3,2);g.active=1;const h=deploy(g,'hound',3);
 assert.equal(h.ready,true);assert.equal(h.freshRush,true);act(g,{type:'attack',from:3,to:0});assert.equal(target.hp,1);assert.equal(h.hp,1);assert.equal(h.ready,false);
 assert.match(R.legal(g,1,{type:'attack',from:3,to:0}),/not ready/);
});
test('Hound Rush cannot attack an exposed base until its next turn; Goo blocks fresh Rush',()=>{
 const g=make(),h=deploy(g,'hound',3);assert.match(R.legal(g,1,{type:'attack',from:3,to:0}),/Rush cannot/);
 nextOwnTurn(g);assert.equal(h.freshRush,false);act(g,{type:'attack',from:3,to:0});assert.equal(g.players[1].camps[0].hp,8);
 const q=make();q.players[0].gooRows[1]=1;assert.equal(deploy(q,'hound',3).ready,false);
});
test('Scrap Hound also receives Rush when Bone Lottery deploys it',()=>{
 const g=make(['lottery','market','hospital']),p=g.players[0];p.water=6;p.hand=[{id:'cache',uid:'a'},{id:'patch',uid:'b'}];g.sharedDeck=[{id:'hound',uid:'hound'}];
 act(g,{type:'base',base:0});assert.equal(p.units[0].id,'hound');assert.equal(p.units[0].ready,true);assert.equal(p.units[0].freshRush,true);
});
test('history retains complete public event and tactic plays for both players, never hidden hands',()=>{
 const g=make();g.players[0].hand=[{id:'cache',uid:'cache'},{id:'supply',uid:'supply'}];act(g,{type:'play',uid:'cache'});act(g,{type:'play',uid:'supply'});
 for(let i=0;i<30;i++){g.players[0].water=3;act(g,{type:'silo'});act(g,{type:'emptySilo'});}
 const a=R.project(g,1),b=R.project(g,2);assert(a.log.length>45);assert.deepEqual(a.log,b.log);assert(a.log.some(x=>x.includes('Player 1 plays Water Cache [TACTIC]')));assert(a.log.some(x=>x.includes('Player 1 plays Supply Drop [EVENT]')));assert.equal(b.players[0].hand,null);
});
