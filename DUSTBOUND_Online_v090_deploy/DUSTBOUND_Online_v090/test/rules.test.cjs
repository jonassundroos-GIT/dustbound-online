const {test}=require('node:test');
const assert=require('node:assert/strict');
const R=require('../rules.cjs');
const make=()=>R.newTestGame(['reservoir','barrier','condenser']);
const apply=(g,actor,a)=>{const result=R.apply(g,actor,a);assert.equal(result.ok,true,result.error);};
const give=(g,actor,id)=>{const p=g.players[actor-1];const c={id,uid:'test-'+actor+'-'+id};p.hand.push(c);return c.uid;};
test('shared pool includes Caravan and private projections hide hands and draft choices',()=>{
 const g=R.newGame();assert.equal(R.decklist.length,41);assert(R.decklist.includes('caravan'));
 assert.equal(g.sharedDeck.length+g.players.reduce((n,p)=>n+p.hand.length,0),41);
 const v=R.project(g,1);assert.equal(v.players[1].hand,null);assert.equal(v.players[1].offer,null);
});
test('ending a turn stores remaining water up to capacity, then consumes silo once',()=>{
 const g=make();apply(g,1,{type:'end'});assert.equal(g.players[0].silo,2);assert.equal(g.players[0].water,1);assert.equal(g.players[1].water,4);
 apply(g,2,{type:'end'});assert.equal(g.players[0].water,5);assert.equal(g.players[0].silo,0);assert.equal(g.players[0].siloGained,2);
});
test('regular silo stores one and does not overwrite existing stored water',()=>{
 const g=R.newTestGame(['market','barrier','condenser']);apply(g,1,{type:'silo'});assert.equal(g.players[0].silo,1);const w=g.players[0].water;apply(g,1,{type:'end'});assert.equal(g.players[0].silo,1);assert.equal(g.players[0].water,w);
});
test('Water Cache generates two with the holding limit enforced',()=>{
 const g=make();g.players[0].water=5;const uid=give(g,1,'cache');apply(g,1,{type:'play',uid});assert.equal(g.players[0].water,6);assert.equal(g.players[0].bonusGenerated,1);
 assert.deepEqual(R.project(g,2).lastAction,{type:'play',actor:1,cardId:'cache'});assert.equal(R.project(g,2).players[0].hand,null);
});
test('Water Runner refunds two on deploy and generates one on a later turn',()=>{
 const g=R.newTestGame(['market','barrier','hospital']);const uid=give(g,1,'runner');apply(g,1,{type:'play',uid,lane:0});assert.equal(g.players[0].water,3);assert.equal(g.players[0].bonusGenerated,2);
 apply(g,1,{type:'end'});apply(g,2,{type:'end'});assert.equal(g.players[0].water,5);assert.equal(g.players[0].bonusGenerated,1);
});
test('Caravan resolves after one owner turn and generates three',()=>{
 const g=R.newTestGame(['market','barrier','hospital']);const uid=give(g,1,'caravan');apply(g,1,{type:'play',uid});assert.equal(g.players[0].events[0].remaining,1);
 g.players[0].water=0;apply(g,1,{type:'end'});apply(g,2,{type:'end'});assert.equal(g.players[0].events.length,0);assert.equal(g.players[0].water,6);assert.equal(g.players[0].bonusGenerated,3);
});
test('Barrier blocks one damage instance and exposed-base attacks use attack damage',()=>{
 const g=make();g.players[0].water=6;const uid=give(g,1,'warden');apply(g,1,{type:'play',uid,lane:3});apply(g,1,{type:'base',base:1,lane:3});assert.equal(g.players[0].units[3].shield,1);
 g.players[1].water=6;g.active=2;const enemy=give(g,2,'hound');apply(g,2,{type:'play',uid:enemy,lane:3});const hp=g.players[0].units[3].hp;apply(g,2,{type:'attack',from:3,to:0});assert.equal(g.players[0].units[3].hp,hp);assert.equal(g.players[0].units[3].shield,0);
 g.active=1;g.players[0].units[3].ready=true;g.players[1].units[3]=null;apply(g,1,{type:'attack',from:3,to:0});assert.equal(g.players[1].camps[0].hp,8);assert.equal(R.project(g,2).lastAction.type,'attack');
});
test('Rush still cannot hit exposed bases on deployment',()=>{
 const g=make();const uid=give(g,1,'hound');apply(g,1,{type:'play',uid,lane:3});assert.match(R.legal(g,1,{type:'attack',from:3,to:0}),/Rush cannot/);
});
