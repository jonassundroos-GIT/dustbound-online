const {test}=require('node:test'),assert=require('node:assert/strict');
const R=require('../rules.cjs'),F=require('../client/feedback.js');
const game=()=>R.newTestGame(['market','barrier','hospital']);
function apply(g,actor,action){const r=R.apply(g,actor,action);assert(r.ok,r.error);}
let serial=0;
function deploy(g,id,lane,actor=1){const p=g.players[actor-1],uid='feedback-'+(++serial);p.hand.push({id,uid});p.water=6;apply(g,actor,{type:'play',uid,lane});return p.units[lane];}
test('effects planning is read-only and repeated projections cannot replay effects',()=>{
 const g=game(),before=R.project(g,1);deploy(g,'hound',3);const after=R.project(g,1),snapshot=JSON.stringify([before,after]);
 assert(F.plan(before,after).some(e=>e.kind==='deploy'&&e.rush));assert.equal(JSON.stringify([before,after]),snapshot);
 assert.deepEqual(F.plan(after,after),[]);assert.deepEqual(F.plan(after,before),[]);
});
test('both players plan the same public abilities without requiring hidden hands',()=>{
 const g=game(),medic=deploy(g,'medic',0),ally=deploy(g,'convoy',3);ally.hp=2;apply(g,1,{type:'end'});
 const one=R.project(g,1),two=R.project(g,2);apply(g,2,{type:'end'});
 const a=F.plan(one,R.project(g,1)),b=F.plan(two,R.project(g,2));assert.deepEqual(a,b);assert(a.some(e=>e.kind==='heal'&&e.slot===3&&e.medic===0&&e.amount===1));
 assert.equal(R.project(g,2).players[0].hand,null);assert.equal(medic.hp,3);
});
test('moving a person is movement, not a new deployment, and shields expire without a false block',()=>{
 const g=game();deploy(g,'warden',3);g.players[0].water=6;apply(g,1,{type:'base',base:1,lane:3});const before=R.project(g,1);
 apply(g,1,{type:'reposition',from:3,to:0});const moved=R.project(g,1),fx=F.plan(before,moved);assert(fx.some(e=>e.kind==='move'&&e.from===3&&e.slot===0));assert(!fx.some(e=>e.kind==='deploy'));
 apply(g,1,{type:'end'});const turn=R.project(g,1);apply(g,2,{type:'end'});assert(!F.plan(turn,R.project(g,1)).some(e=>e.kind==='block'));
});
test('increased maximum health from a bearer is not mislabelled as Medic healing',()=>{
 const g=game();deploy(g,'medic',0);deploy(g,'convoy',3);const before=R.project(g,1);deploy(g,'banner',4);
 assert(g.players[0].units[3].maxHp>before.players[0].units[3].maxHp);assert(!F.plan(before,R.project(g,1)).some(e=>e.kind==='heal'));
});
test('event resolution needs public confirmation; radio reveals are emitted only at turn change',()=>{
 const g=game();deploy(g,'radio',0);g.players[0].hand.push({id:'supply',uid:'supply'});apply(g,1,{type:'play',uid:'supply'});apply(g,1,{type:'end'});
 const before=R.project(g,2);apply(g,2,{type:'end'});const after=R.project(g,2),fx=F.plan(before,after);assert(fx.some(e=>e.kind==='event'&&e.id==='supply'));assert(fx.some(e=>e.kind==='scan'));
 const later=structuredClone(after);later.revision++;later.lastAction={type:'silo',actor:1};assert(!F.plan(after,later).some(e=>e.kind==='scan'));
 const missing=structuredClone(before);missing.revision++;missing.players[0].events=[];assert(!F.plan(before,missing).some(e=>e.kind==='event'));
});
test('water resets are not spending, silo refunds are separate, and damaged effects cross five HP once',()=>{
 const g=game();const before=R.project(g,1);apply(g,1,{type:'silo'});const stored=R.project(g,1);assert(F.plan(before,stored).some(e=>e.kind==='store'));
 apply(g,1,{type:'emptySilo'});assert(F.plan(stored,R.project(g,1)).some(e=>e.kind==='refund'&&e.amount===1));
 const a=R.project(g,1),b=structuredClone(a);b.revision++;b.players[1].camps[0].hp=5;assert(F.plan(a,b).some(e=>e.kind==='base-damaged'));
 const c=structuredClone(b);c.revision++;c.players[1].camps[0].hp=4;assert(!F.plan(b,c).some(e=>e.kind==='base-damaged'));
 const end=R.project(g,1);apply(g,1,{type:'end'});assert(!F.plan(end,R.project(g,1)).some(e=>e.kind==='water'&&e.actor===2));
});
