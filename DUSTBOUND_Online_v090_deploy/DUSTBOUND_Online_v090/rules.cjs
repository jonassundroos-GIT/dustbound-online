/* DUSTBOUND v0.8.8 - Rush cannot hit bases on deployment; End Turn waits for Silo. */
const RULES = (() => {
 const baseDefs = [
 ['condenser','Water Condenser','Economy','passive',0,'First card costing 3+ each turn: generate 1 water.'],
 ['reservoir','Reservoir Nine','Economy','passive',0,'Your Water Silo can store 2 water.'],
 ['market','Black Market Pump','Economy','discard',0,'Once per turn, discard a card to generate 1 water.'],
 ['furnace','Salvage Furnace','Economy','sacrifice',0,'Choose and sacrifice a friendly person to generate 2 water.'],
 ['railgun','Railgun Tower','Aggression','enemyUnit',2,'Deal 2 damage to any enemy person, including a protected back-row person. Cannot target bases.'],
 ['mortar','Mortar Battery','Aggression','enemy',2,'Deal 2 damage to frontmost enemy person, or 1 hit to an exposed base.'],
 ['warDrums','War Drums','Aggression','friendlyUnit',1,'A friendly person gains +1 attack until end of turn.'],
 ['breach','Breachworks','Aggression','none',3,'Your next successful attack on an exposed base this turn deals double attack damage.'],
 ['hospital','Field Hospital','Defense','friendlyUnit',2,'Restore 2 HP to a friendly person.'],
 ['barrier','Barrier Station','Defense','friendlyUnit',1,'Prevent the next instance of damage to a friendly person this turn.'],
 ['weld','Emergency Weld','Defense','friendlyBase',3,'Once per match: repair a damaged friendly base.'],
 ['decoy','Decoy Array','Defense','friendly',2,'Redirect the next hit on your frontmost person in a column to the other person in that column.'],
 ['scrapworks','Scrapworks','Intelligence','discard',1,'Discard a card, then draw 2.'],
 ['radar','Radar Station','Intelligence','none',2,'Draw the higher-cost of the next 2 cards; bottom-deck the other.'],
 ['intercept','Signal Intercept','Intelligence','none',1,'Reveal opponent hand cards for this turn.'],
 ['archive','Recovery Archive','Intelligence','none',2,'Return your oldest discarded tactic to the top of your deck.'],
 ['transport','Transport Yard','Engineering','move',1,'Move a friendly person to an empty slot.'],
 ['forge','Scrap Forge','Engineering','friendlyUnit',2,'Give a friendly person permanent +1 attack, once per person.'],
 ['armor','Armor Press','Engineering','friendlyUnit',2,'Give a friendly person permanent +2 maximum HP; heal 2, once per person.'],
 ['drone','Drone Assembly','Engineering','empty',2,'Create a 1/1 Drone in an empty friendly slot.'],
 ['beacon','Distress Beacon','Wasteland','none',1,'Advance a pending Raid by one step, or your first other event if no Raid is pending.'],
 ['ash','Ash Collector','Wasteland','passive',0,'First friendly event resolution each turn: draw 1.'],
 ['acid','Acid Rain Rig','Wasteland','enemy',2,'Schedule acid damage (1 to both units) to an enemy column next turn.'],
 ['redirect','Storm Redirector','Wasteland','enemy',1,'Choose a new column for your first column-targeted event.'],
 ['red','THE RED BUTTON','Wildcard','none',5,'Once per match: hit all surviving enemy bases. Destroy this base first.'],
 ['puppet','THE PUPPET MASTER','Wildcard','enemyUnit',4,'Once per match: sacrifice your frontmost person in that column, then steal the enemy frontmost person there into an empty slot.'],
 ['chrono','CHRONO BREAKER','Wildcard','none',5,'Once per match: discard your hand; gain an immediate extra turn after ending this turn.'],
 ['wormhole','THE WORMHOLE','Wildcard','enemy',4,'Once per match: swap the people in this base’s column with an enemy column. Deal one hit to this base.'],
 ['lottery','THE BONE LOTTERY','Wildcard','none',4,'Once per match: discard 2; reveal 5 from deck and automatically deploy up to 2 people in empty slots.'],
 ['doomsday','DOOMSDAY BEACON','Wildcard','enemy',4,'Once per match: sacrifice your frontmost person in this column, mark an enemy column. At your next turn, destroy people in both columns and hit exposed bases.']
 ].map(([id,name,category,target,cost,text])=>({id,name,category,target,cost,text,wild:category==='Wildcard'}));
 const baseMap=Object.fromEntries(baseDefs.map(x=>[x.id,x]));
 const defs={
 drone:{name:'Scrap Drone',kind:'unit',cost:0,atk:1,hp:1,art:'hound08',text:'Token unit. Cannot be included in decks.'},
 salvager:{name:'Scavenger',kind:'unit',cost:2,atk:1,hp:2,art:'scavenger08',text:'Deploy: draw 1 card.',effect:'draw1'},
 runner:{name:'Water Runner',kind:'unit',cost:2,atk:1,hp:3,art:'runner08',text:'Deploy: generate 2 water. At the start of each of your later turns, generate 1 water while this person survives.',effect:'water'},
 hound:{name:'Scrap Hound',kind:'unit',cost:2,atk:2,hp:2,art:'hound08',text:'Rush: may attack a frontmost enemy person on its deployment turn, but cannot attack a base until your next turn.',trait:'rush'},
 raider:{name:'Dune Raider',kind:'unit',cost:3,atk:3,hp:1,art:'raider08',text:'Rush: may attack a frontmost enemy person on its deployment turn, but cannot attack a base until your next turn.',trait:'rush'},
 marksman:{name:'Desert Marksman',kind:'unit',cost:3,atk:2,hp:2,art:'marksman08',text:'Sniper: can attack any column.',trait:'sniper'},
 convoy:{name:'Convoy Truck',kind:'unit',cost:3,atk:2,hp:5,art:'convoy08',text:'Heavy defender. Holds the line.'},
 marauder:{name:'Iron Marauder',kind:'unit',cost:4,atk:4,hp:4,art:'marauder08',text:'Heavy close-combat fighter.'},
 turret:{name:'Siege Crawler',kind:'unit',cost:4,atk:3,hp:6,art:'crawler08',text:'Siege unit. Cannot be moved.',trait:'anchored'},
 medic:{name:'Field Medic',kind:'unit',cost:2,atk:1,hp:3,art:'medic08',text:'At start of your turn, restore 1 HP to a damaged friendly person in this column, preferring the other person.',trait:'medic'},
 saboteur:{name:'Saboteur',kind:'unit',cost:3,atk:2,hp:3,art:'saboteur08',text:'When damaging an enemy base, opponent discards a random card.',trait:'saboteur'},
 stalker:{name:"Dust Stalker",kind:'unit',cost:1,atk:1,hp:1,art:'stalker081',text:"Front row: this person has +1 attack.",trait:'frontPower'},
 engineer:{name:"Junker Engineer",kind:'unit',cost:2,atk:2,hp:2,art:'engineer081',text:"Deploy: create a 1/1 Scrap Drone in another empty slot.",trait:'engineer'},
 warden:{name:"Road Warden",kind:'unit',cost:2,atk:2,hp:3,art:'warden081',text:"This person and adjacent allies cannot be moved by enemy base abilities.",trait:'warden'},
 cultist:{name:"Flame Cultist",kind:'unit',cost:3,atk:3,hp:2,art:'cultist081',text:"After this person destroys a defender in combat, hit its base if exposed.",trait:'cultist'},
 skimmer:{name:"Sand Skimmer",kind:'unit',cost:3,atk:2,hp:2,art:'skimmer081',text:"After attacking, switch to the empty row of this column, if available.",trait:'skimmer'},
 collector:{name:"Bone Collector",kind:'unit',cost:3,atk:2,hp:4,art:'collector081',text:"When destroyed: draw 2 cards.",trait:'collector'},
 harpoon:{name:"Harpoon Gunner",kind:'unit',cost:4,atk:4,hp:2,art:'harpoon081',text:"Attacks ignore shields and decoy redirection.",trait:'harpoon'},
 chem:{name:"Chem Thrower",kind:'unit',cost:4,atk:3,hp:3,art:'chem081',text:"Deploy: deal 2 damage to the enemy front-row person in this column.",trait:'chem'},
 golem:{name:"Scrap Golem",kind:'unit',cost:5,atk:5,hp:5,art:'golem081',text:"Anchored. When destroyed: deal 2 damage to all enemy people.",trait:'anchored'},
 radio:{name:"Radio Operator",kind:'unit',cost:2,atk:1,hp:4,art:'radio081',text:"At start of your turn, reveal the top supply card. If it costs 4 or more, put it on the bottom before your normal draw.",trait:'radio'},
 scrounge:{name:'Scrounge',kind:'tactic',cost:2,art:'scrounge',text:'Draw 2 cards.',effect:'draw2'},
 storm:{name:'Sandstorm',kind:'tactic',cost:4,art:'sandstorm',text:'Deal 2 damage to all enemy front-row people.',effect:'storm'},
 strike:{name:'Mortar Strike',kind:'tactic',cost:3,art:'turret',text:'Deal 3 to frontmost defender or 1 hit to exposed base.',effect:'strike',target:'enemy'},
 sabotage:{name:'Sabotage',kind:'tactic',cost:4,art:'raider',text:'Deal 1 direct base hit, bypassing defenders.',effect:'sabotage',target:'enemy'},
 patch:{name:'Patch Kit',kind:'tactic',cost:2,art:'runner',text:'Repair a damaged base, or heal frontmost damaged person by 2.',effect:'patch',target:'friendly'},
 cache:{name:'Water Cache',kind:'tactic',cost:0,art:'scrounge',text:'Generate 2 water. You cannot hold more than 6 water.',effect:'cache'},
 supply:{name:'Supply Drop',kind:'event',cost:1,art:'convoy',text:'After 1 of your turns: draw 2 cards.',effect:'supply',count:1},
 fallout:{name:'Fallout Front',kind:'event',cost:3,art:'sandstorm',text:'After 2 of your turns: deal 2 to enemy front row.',effect:'fallout',count:2},
 ambush:{name:'Dust Ambush',kind:'event',cost:2,art:'raider08',text:'After 1 of your turns: deal 2 to the frontmost enemy defender in a chosen column, or hit its base if exposed.',effect:'ambush',target:'enemy',count:1},
 caravan:{name:'Salvage Caravan',kind:'event',cost:2,art:'convoy08',text:'After 1 of your turns: generate 3 water, up to the six-water holding limit.',effect:'caravan',count:1},
 repaircrew:{name:'Repair Convoy',kind:'event',cost:2,art:'medic08',text:'After 1 of your turns: repair a damaged friendly base in the chosen column. Cannot revive a destroyed base.',effect:'repaircrew',target:'friendly',count:1},
 ashfall:{name:'Toxic Ashfall',kind:'event',cost:3,art:'sandstorm',text:'After 2 of your turns: deal 1 damage to every enemy person.',effect:'ashfall',count:2},
 crossfire:{name:'Crossfire',kind:'event',cost:3,art:'harpoon081',text:'After 1 of your turns: deal 2 damage to each enemy person in the chosen column.',effect:'crossfire',target:'enemy',count:1},
 barricade:{name:'Emergency Barricade',kind:'event',cost:2,art:'warden081',text:'After 1 of your turns: give both friendly people in a chosen column a shield against their next damage instance this turn.',effect:'barricade',target:'friendly',count:1},
 tempest:{name:'Scrap Tempest',kind:'event',cost:3,art:'sandstorm',text:'After 2 of your turns: deal 2 damage to ALL front-row people, including yours.',effect:'tempest',count:2},
 reinforcements:{name:'Reinforcement Signal',kind:'event',cost:3,art:'engineer081',text:'After 2 of your turns: deploy up to two 1/1 Scrap Drones into empty slots, front row first.',effect:'reinforcements',count:2},
 blackout:{name:'Nightfall Strike',kind:'event',cost:4,art:'marksman08',text:'After 2 of your turns: hit the enemy base in a chosen column only if it is exposed at resolution.',effect:'blackout',target:'enemy',count:2},
 recon:{name:'Recon Sweep',kind:'event',cost:1,art:'radio081',text:'After 1 of your turns: draw 1 card and generate 1 bonus water.',effect:'recon',count:1},
 gooalch:{name:'Goo Alchemist',kind:'unit',cost:3,atk:1,hp:3,art:'chem081',text:'Deploy: cover the enemy front row with Toxic Goo through their next turn (−1 attack; newly deployed Rush cannot attack).',trait:'gooAlchemist'},
 banner:{name:'War Standard Bearer',kind:'unit',cost:3,atk:1,hp:3,art:'warden081',text:'Aura: friendly people directly adjacent in this row gain +1 attack and +1 maximum/current health while this bearer survives.',trait:'banner'},
 herald:{name:'Bloodhorn Herald',kind:'unit',cost:2,atk:2,hp:2,art:'cultist081',text:'Deploy: your next deployed person gains Rush. Rush can attack enemy people immediately, not bases.',trait:'herald'},
 surgeon:{name:'Mutant Surgeon',kind:'unit',cost:3,atk:1,hp:4,art:'medic08',text:'Deploy: the other friendly person in this column gains +1 maximum HP and restores 1 HP; if alone, improve self.',trait:'surgeon'},
 spore:{name:'Spore Leech',kind:'unit',cost:2,atk:2,hp:2,art:'collector081',text:'When this person deals combat damage to another person that survives, reduce its attack by 1 until the end of its next turn.',trait:'spore'},
 conductor:{name:'Battle Conductor',kind:'unit',cost:4,atk:2,hp:3,art:'radio081',text:'Once each turn, the next other friendly person deployed in this row gains +1 attack until your turn ends.',trait:'conductor'},
 viscous:{name:'Viscous Flood',kind:'event',cost:2,art:'sandstorm',text:'After 1 of your turns: apply Toxic Goo to the chosen enemy row until the end of its next turn.',effect:'viscous',target:'enemyRow',count:1},
 rally:{name:'Rallying Cry',kind:'event',cost:2,art:'warden081',text:'After 1 of your turns: friendly people in the chosen row gain +1 attack until your turn ends.',effect:'rally',target:'friendlyRow',count:1},
 frenzy:{name:'Battle Frenzy',kind:'event',cost:2,art:'raider08',text:'After 1 of your turns: your next deployed person gains Rush and +1 attack for the turn (no immediate base attacks).',effect:'frenzy',count:1},
 corrosive:{name:'Corrosive Rain',kind:'event',cost:3,art:'sandstorm',text:'After 2 of your turns: deal 1 damage to enemy people in the chosen row and apply Toxic Goo for their next turn.',effect:'corrosive',target:'enemyRow',count:2}
 };
 // ONE shared draw pile: 30 established cards and 10 new synergy cards = 40 physical cards total.
 // Existing card types not included here remain defined but are not present in the default pool.
 const originalPool=['salvager','runner','hound','raider','marksman','convoy','marauder','turret','medic','saboteur','stalker','engineer','warden','cultist','skimmer','collector','harpoon','chem','golem','radio','cache','scrounge','strike','patch','supply','fallout','ambush','repaircrew','reinforcements','recon','caravan'];
 const addedPool=['gooalch','banner','herald','surgeon','spore','conductor','viscous','rally','frenzy','corrosive'];
 const decklist=[...originalPool,...addedPool];
 let uidCount=1;
 function uid(){return 'c'+uidCount++;} function card(id){return {id,uid:uid()};}
 function shuffle(a){const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
 function note(g,msg){g.log.unshift('T'+g.turn+' · '+msg);}
 function draftOffers(){const remaining=baseDefs.slice(),offers=[[],[]];for(let player=0;player<2;player++){
   for(const category of ['Economy','Aggression','Defense','Intelligence','Engineering','Wasteland','Wildcard']){
     const possible=remaining.filter(b=>b.category===category);const chosen=possible[Math.floor(Math.random()*possible.length)];offers[player].push(chosen.id);remaining.splice(remaining.indexOf(chosen),1);
   }
   const chosen=remaining[Math.floor(Math.random()*remaining.length)];offers[player].push(chosen.id);remaining.splice(remaining.indexOf(chosen),1);
   offers[player]=shuffle(offers[player]);
 }return offers;}
 function player(id,offer){return {id,water:3,maxWater:6,bonusGenerated:0,turnsStarted:id===1?1:0,camps:[],offer,selected:[],drafted:false,units:[null,null,null,null,null,null],silo:0,events:[],raids:[],hand:[],discard:[],revealHand:false,breach:false,extraTurn:false,ashUsed:false,gooRows:[0,0],nextRush:false,nextRushAtk:0};}
 function newGame(){const offers=draftOffers();const g={version:814,phase:'draft',active:1,turn:1,winner:0,sharedDeck:shuffle(decklist.map(card)),players:[player(1,offers[0]),player(2,offers[1])],log:[],revision:1};g.players.forEach(p=>{for(let i=0;i<4;i++)draw(g,p);});note(g,'Shared 41-card draw pile, including Salvage Caravan; four opening cards per player.');note(g,'Draft: each player selects 3 of 8 unique base offers.');return g;}
 function newTestGame(ids){
   if(!Array.isArray(ids)||ids.length!==3||new Set(ids).size!==3||ids.some(id=>!baseMap[id]))throw Error('Choose three different bases.');
   const g=newGame();
   g.version=814;g.testMode=true;
   for(const p of g.players){
     p.offer=ids.slice();p.selected=ids.slice();p.drafted=true;
     p.camps=ids.map((id,i)=>({id:i,baseId:id,name:baseMap[id].name,power:id,hp:10,maxHp:10,used:false,wildUsed:false}));
   }
   g.phase='battle';g.active=1;
   note(g,'QUICK TEST: mirrored bases, one freshly shuffled shared 41-card pile, random hands.');
   g.revision++;
   return g;
 }
 function own(g,actor){return g.players[actor-1];}function foe(g,actor){return g.players[actor===1?1:0];}
 function draw(g,p){
  if(!g.sharedDeck.length){const exhausted=g.players.flatMap(player=>player.discard);
   if(!exhausted.length){note(g,'Shared draw pile is empty and no discards are available.');return;}
   g.sharedDeck=shuffle(exhausted);g.players.forEach(player=>player.discard=[]);
   note(g,'Both players discards reshuffle together into the shared draw pile.');
  }
  const c=g.sharedDeck.pop();if(p.hand.length>=9){p.discard.push(c);note(g,'Player '+p.id+' burns a card (hand full).');}else p.hand.push(c);
 }
 function gain(g,p,amount){const n=Math.max(0,Math.min(amount,6-p.water));p.water+=n;p.bonusGenerated+=n;if(n)note(g,'Player '+p.id+' generates '+n+' water.');return n;}
 function isAlive(p,i){return !!p.camps[i]&&p.camps[i].hp>0;}
 function hitBase(g,p,col,n=1){const c=p.camps[col];if(!c||c.hp<=0||n<=0)return 0;const damage=Math.min(c.hp,n);c.hp-=damage;note(g,'Player '+p.id+' '+c.name+' takes '+damage+' damage ('+c.hp+'/'+c.maxHp+' HP)'+(c.hp===0?' — DESTROYED.':'.'));return damage;}
 function kill(g,p,slot){const u=p.units[slot];if(u&&u.hp<=0){if(defs[u.id]&&u.id!=='drone')p.discard.push({id:u.id,uid:u.uid});p.units[slot]=null;note(g,u.name+' is destroyed.');
  if(u.id==='collector'){draw(g,p);draw(g,p);note(g,'Bone Collector: draw 2.');}
  if(u.id==='golem'){const enemy=g.players.find(x=>x.id!==p.id);for(let i=0;i<6;i++)if(enemy.units[i])damageUnit(g,enemy,i,2);note(g,'Scrap Golem detonates across enemy formation.');}
  if(!p._auraBusy)refreshAuras(g,p);
 }}
 function damageUnit(g,p,slot,n,ignoreProtection=false){const u=p.units[slot];if(!u)return;if(u.shield&&!ignoreProtection){u.shield=0;note(g,u.name+' blocks a hit.');return;}if(u.decoy&&!ignoreProtection){const other=slot<3?slot+3:slot-3;if(p.units[other]){u.decoy=0;note(g,u.name+' diverts a hit to '+p.units[other].name+'.');damageUnit(g,p,other,n);return;}}u.hp=Math.max(0,u.hp-n);kill(g,p,slot);}
 function combatAtk(u,slot,owner){
  const goo=owner?.gooRows?.[slot>=3?1:0]>0?1:0;
  return Math.max(0,u.atk+(u.tempAtk||0)+(u.auraBonus||0)-(u.weakened||0)-goo+(u.id==='stalker'&&slot>=3?1:0));
 }
 function applyGoo(g,p,row){p.gooRows[row]=1;note(g,'Toxic Goo coats Player '+p.id+' '+(row?'front':'back')+' row through its next turn (−1 ATK; no fresh Rush).');}
 function refreshAuras(g,p){
  if(p._auraBusy)return;p._auraBusy=true;
  for(let pass=0;pass<6;pass++){
   let changed=false;
   for(let i=0;i<6;i++){
    const u=p.units[i];if(!u)continue;
    const row=Math.floor(i/3),col=i%3;
    const bonus=[col-1,col+1].some(c=>c>=0&&c<3&&p.units[row*3+c]?.id==='banner')?1:0;
    const prior=u.auraBonus||0,delta=bonus-prior;
    if(delta){u.auraBonus=bonus;u.maxHp+=delta;u.hp+=delta;changed=true;
      if(u.hp<=0){kill(g,p,i);}
    }
   }
   if(!changed)break;
  }
  p._auraBusy=false;
 }
 function weaken(g,target,owner){if(target){target.weakened=1;target.weakenedTurns=owner.id===g.active?2:1;note(g,target.name+' is weakened (−1 attack through its next turn).');}}
 
 function frontmost(p,col){return p.units[col+3]?col+3:p.units[col]?col:-1;}
 function hasTarget(p,col){return frontmost(p,col)!==-1||isAlive(p,col);}
 function deal(g,p,col,n,direct=false,baseHits=1){const pos=direct?-1:frontmost(p,col);if(pos>=0)damageUnit(g,p,pos,n);else hitBase(g,p,col,baseHits);}
 function frontDamage(g,p,n){for(let i=3;i<6;i++)if(p.units[i])damageUnit(g,p,i,n);}
 function checkWin(g){for(const p of g.players){if(g.phase==='battle'&&p.camps.every(x=>x.hp===0)){g.winner=p.id===1?2:1;note(g,'Player '+g.winner+' wins: all three enemy bases destroyed.');}}}
 function getBase(p,i){const c=p.camps[i];return c?baseMap[c.baseId]:null;}
 function firstDiscard(p){return p.hand[0];}
 function needPerson(p,col){return frontmost(p,col)>=0;}
 function validLane(x,n){return Number.isInteger(x)&&x>=0&&x<n;}
 function legal(g,actor,a){if(!g||g.winner||![1,2].includes(actor))return 'Invalid game or player.';
 if(!a||typeof a.type!=='string')return 'Invalid action.';
 const p=own(g,actor),en=foe(g,actor);
 if(g.phase==='draft'){
  if(a.type!=='draft')return 'Choose bases before the match.';
  if(p.drafted)return 'You already confirmed your bases.';
  if(!Array.isArray(a.bases)||a.bases.length!==3||new Set(a.bases).size!==3||a.bases.some(id=>!p.offer.includes(id)))return 'Choose exactly 3 different offered bases in desired left-to-right order.';
  return null;
 }
 if(g.active!==actor)return 'It is not your turn.';
 if(a.type==='end')return null;
 if(a.type==='draw')return p.water<2?'Drawing costs 2 water.':!g.sharedDeck.length&&!g.players.some(x=>x.discard.length)?'The shared draw pile is empty.':null;
 if(a.type==='silo')return p.silo>=(p.camps.some(c=>c.hp>0&&c.baseId==='reservoir')?2:1)?'Water Silo full.':p.water<1?'Need 1 water.':null;
 if(a.type==='emptySilo')return !p.silo?'The silo is empty.':p.water+p.silo>6?'Spend water first so all stored water fits within the 6-water limit.':null;
 if(a.type==='reposition'){
  if(!validLane(a.from,6)||!validLane(a.to,6)||a.from===a.to)return 'Choose two different friendly slots.';
  const moving=p.units[a.from],other=p.units[a.to];if(!moving)return 'Choose a friendly person to move.';
  if(defs[moving.id]?.trait==='anchored'||other&&defs[other.id]?.trait==='anchored')return 'Anchored people cannot move or swap.';
  return p.water<(defs[moving.id]?.cost||0)?'Moving '+moving.name+' costs '+defs[moving.id].cost+' water.':null;
 }
 if(a.type==='raid')return p.water<2?'Raid costs 2 water.':p.raids.length?null:!validLane(a.lane,3)?'Choose a column.':!hasTarget(en,a.lane)?'No target in column.':null;
 if(a.type==='attack'){
  if(!validLane(a.from,6)||!validLane(a.to,3))return 'Invalid slot.';const u=p.units[a.from];if(!u||!u.ready)return 'Person is not ready.';
  if(a.to!==a.from%3&&defs[u.id]?.trait!=='sniper')return 'Only snipers can attack other columns.';
  if(u.freshRush&&frontmost(en,a.to)===-1)return 'Rush cannot attack a base on its deployment turn. Attack a person or wait for your next turn.';
  return hasTarget(en,a.to)?null:'No target.';
 }
 if(a.type==='play'){
  const c=p.hand.find(c=>c.uid===a.uid);if(!c)return 'Card is not in hand.';const d=defs[c.id];if(!d)return 'Unknown card.';if(p.water<d.cost)return 'Not enough water.';
  if(d.kind==='event'&&p.events.length>=2)return 'Event queue full.';
  if(d.kind==='event'&&d.target&&!validLane(a.lane,d.target.endsWith('Row')?2:3))return d.target.endsWith('Row')?'Choose front (1) or back (0) row for the event.':'Choose a column for the event.';
  if(d.kind==='unit'&&(!validLane(a.lane,6)||p.units[a.lane]))return 'Choose an empty person slot.';
  if(d.kind!=='event'&&d.target==='enemy'&&(!validLane(a.lane,3)||!hasTarget(en,a.lane)))return 'Choose an enemy column with a target.';
  if(d.kind!=='event'&&d.target==='friendly'&&(!validLane(a.lane,3)||(!(p.camps[a.lane]?.hp>0&&p.camps[a.lane].hp<p.camps[a.lane].maxHp)&&![p.units[a.lane],p.units[a.lane+3]].some(u=>u&&u.hp<u.maxHp))))return 'Choose a damaged person or base.';
  return null;
 }
 if(a.type==='base'){
  if(!validLane(a.base,3))return 'Choose a base.';const c=p.camps[a.base],b=getBase(p,a.base);
  if(!isAlive(p,a.base)||!b)return 'Base destroyed.';if(c.used)return 'Base ability already used.';if(p.water<b.cost)return b.name+' costs '+b.cost+' water.';
  if((b.wild||b.id==='weld')&&c.wildUsed)return 'This one-time ability was already used.';
  if(b.target==='passive')return 'This power is automatic.';
  if(b.target==='none'){
   if(b.id==='breach'&&p.breach)return 'Breach already primed.';
   if(b.id==='beacon'&&!p.events.length&&!p.raids.length)return 'No Raid or event to advance.';
   if(b.id==='archive'&&!p.discard.some(c=>defs[c.id]?.kind==='tactic'))return 'No discarded tactic.';
   if(b.id==='lottery'&&p.hand.length<2)return 'Need 2 cards to discard.';
   if(b.id==='red'&&p.camps.filter(c=>c.hp>0).length===1&&!en.camps.some(c=>c.hp===1))return 'Cannot launch an unwinnable final self-destruction.';
  }
  if(b.target==='discard'&&(!a.uid||!p.hand.some(c=>c.uid===a.uid)))return 'Select a card to discard.';
  if(b.target==='enemy'&&(!validLane(a.lane,3)||(!hasTarget(en,a.lane)&&b.id!=='acid'&&b.id!=='wormhole'&&b.id!=='doomsday'&&b.id!=='redirect')))return 'Choose an enemy column.';
  if(b.id==='railgun'&&(!validLane(a.lane,6)||!en.units[a.lane]))return 'Railgun Tower must target an occupied enemy person slot, not a base.';
  if(b.target==='enemyUnit'&&b.id!=='railgun'&&(!validLane(a.lane,3)||frontmost(en,a.lane)===-1))return 'Choose an enemy column with a person.';
  if(b.target==='friendly'&&(!validLane(a.lane,3)||!needPerson(p,a.lane)))return 'Choose a friendly column with a person.';
  if(b.target==='friendlyUnit'&&(!validLane(a.lane,6)||!p.units[a.lane]))return 'Choose a friendly person.';
  if(b.target==='friendlyBase'&&(!validLane(a.lane,3)||p.camps[a.lane].hp<=0||p.camps[a.lane].hp>=p.camps[a.lane].maxHp))return 'Choose a damaged (not destroyed) friendly base.';
  if(b.target==='empty'&&(!validLane(a.lane,6)||p.units[a.lane]))return 'Choose an empty slot.';
  if(b.target==='sacrifice'&&(!validLane(a.lane,6)||!p.units[a.lane]))return 'Select an occupied friendly person slot to sacrifice.';
  if(b.target==='move'&&(!validLane(a.from,6)||!validLane(a.lane,6)||!p.units[a.from]||p.units[a.lane]||defs[p.units[a.from].id]?.trait==='anchored'))return 'Move a movable person to an empty slot.';
  if(b.id==='decoy'&&(!p.units[a.lane]||!p.units[a.lane+3]))return 'Need two people in the chosen column to redirect damage.';
  if(b.id==='acid'&&p.events.length>=2)return 'Event queue full.';
  if(b.id==='doomsday'&&p.events.length>=2)return 'Event queue full.';
  if(b.id==='puppet'&&(!needPerson(p,a.lane)||!p.units.some(x=>x===null)))return 'Need a friendly sacrifice in the targeted column and an empty slot.';
  if(b.id==='doomsday'&&!needPerson(p,a.base))return 'Need a friendly person in this base column as sacrifice.';
  if(b.id==='wormhole'&&p.units.some((u,i)=>u?.id==='warden'&&Math.abs((i%3)-a.base)<=1)||b.id==='wormhole'&&en.units.some((u,i)=>u?.id==='warden'&&Math.abs((i%3)-a.lane)<=1))return 'Road Warden prevents forced movement in that column.';
  if(b.id==='forge'&&p.units[a.lane]?.forged)return 'Already forged.';
  if(b.id==='armor'&&p.units[a.lane]?.armored)return 'Already armored.';
  if(b.id==='hospital'&&p.units[a.lane]?.hp===p.units[a.lane]?.maxHp)return 'Person is already fully healed.';
  if(b.id==='redirect'&&!p.events.some(e=>e.targeted))return 'No column-targeted event to redirect.';
  return null;
 }
 return 'Unknown action.';
 }
 function advanceRaid(g,p,raid,reason){
  if(!raid||!p.raids.includes(raid))return;
  raid.remaining=Math.max(0,raid.remaining-1);
  note(g,'Player '+p.id+' Raid advances to '+(2-raid.remaining)+'/2 ('+reason+').');
  if(raid.remaining===0){
   p.raids.splice(p.raids.indexOf(raid),1);
   deal(g,foe(g,p.id),raid.lane,2);
   note(g,'Player '+p.id+' Raid RESOLVES in column '+(raid.lane+1)+'.');
  }
 }
 function startTurn(g,actor){const p=own(g,actor);g.active=actor;g.turn++;p.turnsStarted++;const stored=p.silo;p.water=Math.min(6,(actor===2 && p.turnsStarted===1 ? 4 : 3)+stored);p.silo=0;p.bonusGenerated=0;p.siloGained=stored;for(const u of p.units)if(u?.id==='runner')gain(g,p,1);p.ashUsed=false;p.revealHand=false;p.breach=false;
  // Advance raids only on their owner's turn start. The newly launched raid does not tick until their NEXT turn.
  for(const raid of p.raids.slice())advanceRaid(g,p,raid,'turn start');
  p.camps.forEach(c=>c.used=false);g.reveals=[];
  if(p.units.some(u=>u?.id==='radio')&&g.sharedDeck.length){
   const top=g.sharedDeck[g.sharedDeck.length-1],d=defs[top.id],bottom=d.cost>=4;
   g.reveals.push({actor,cardId:top.id,name:d.name,cost:d.cost,movedToBottom:bottom});
   note(g,'Player '+actor+' Radio Operator reveals '+d.name+' ('+d.cost+' water)'+(bottom?' and puts it on the bottom.':' — kept on top for the normal draw.'));
   if(bottom)g.sharedDeck.unshift(g.sharedDeck.pop());
  }
  p.units.forEach((u,i)=>{if(u){u.ready=true;u.freshRush=false;u.tempAtk=0;u.shield=0;u.decoy=0;u.conductorUsed=false;
   if(u.id==='medic'){
    const opposite=i<3?i+3:i-3;
    const target=[p.units[opposite],u].find(person=>person&&person.hp<person.maxHp);
    if(target){target.hp++;note(g,'Player '+actor+' Field Medic restores 1 HP to '+target.name+' ('+target.hp+'/'+target.maxHp+' HP).');}
   }
  }});
  const ready=[];p.events=p.events.filter(e=>{e.remaining--;if(e.remaining<=0){ready.push(e);return false;}return true;});
  for(const e of ready){const en=foe(g,actor);
   if(e.id==='supply'){draw(g,p);draw(g,p);}
   else if(e.id==='fallout')frontDamage(g,en,2);
   else if(e.id==='acid')for(const slot of [e.lane,e.lane+3])damageUnit(g,en,slot,1);
   else if(e.id==='doomsday'){for(const slot of [e.lane,e.lane+3]){if(en.units[slot]){en.units[slot].hp=0;kill(g,en,slot);}if(p.units[slot]){p.units[slot].hp=0;kill(g,p,slot);}}if(frontmost(en,e.lane)<0)hitBase(g,en,e.lane);if(frontmost(p,e.lane)<0)hitBase(g,p,e.lane);}
   else if(e.id==='ambush')deal(g,en,e.lane,2);
   else if(e.id==='caravan')gain(g,p,3);
   else if(e.id==='repaircrew'){const c=p.camps[e.lane];if(c?.hp>0&&c.hp<c.maxHp){c.hp=c.maxHp;note(g,'Player '+actor+' Repair Convoy restores '+c.name+' to '+c.maxHp+' HP.');}}
   else if(e.id==='ashfall'){for(let slot=0;slot<6;slot++)if(en.units[slot])damageUnit(g,en,slot,1);}
   else if(e.id==='crossfire'){for(const slot of [e.lane,e.lane+3])if(en.units[slot])damageUnit(g,en,slot,2);}
   else if(e.id==='barricade'){for(const slot of [e.lane,e.lane+3])if(p.units[slot])p.units[slot].shield=1;}
   else if(e.id==='tempest'){for(const side of [p,en])for(let slot=3;slot<6;slot++)if(side.units[slot])damageUnit(g,side,slot,2);}
   else if(e.id==='reinforcements'){let created=0;for(const slot of [3,4,5,0,1,2]){if(!p.units[slot]){p.units[slot]={id:'drone',uid:uid(),name:'Scrap Drone',atk:1,hp:1,maxHp:1,ready:false,trait:'',shield:0,tempAtk:0};if(++created===2)break;}}}
   else if(e.id==='blackout'){if(frontmost(en,e.lane)===-1)hitBase(g,en,e.lane);}
   else if(e.id==='recon'){draw(g,p);gain(g,p,1);}
   else if(e.id==='viscous')applyGoo(g,en,e.row);
   else if(e.id==='rally'){for(let i=e.row*3;i<e.row*3+3;i++)if(p.units[i])p.units[i].tempAtk=(p.units[i].tempAtk||0)+1;note(g,'Rallying Cry grants +1 attack to the friendly '+(e.row?'front':'back')+' row for this turn.');}
   else if(e.id==='frenzy'){p.nextRush=true;p.nextRushAtk=1;note(g,'Battle Frenzy primes the next friendly deployment with Rush and +1 ATK.');}
   else if(e.id==='corrosive'){for(let i=e.row*3;i<e.row*3+3;i++)if(en.units[i])damageUnit(g,en,i,1);applyGoo(g,en,e.row);}
   if(e.id!=='acid'&&e.id!=='doomsday')p.discard.push({id:e.id,uid:e.uid});note(g,'Player '+actor+' '+e.name+' resolves.');
   if(!p.ashUsed&&p.camps.some(c=>c.hp>0&&c.baseId==='ash')){draw(g,p);p.ashUsed=true;}
  }
  draw(g,p);note(g,'Player '+actor+' begins: '+p.water+' water, draw 1.');checkWin(g);
 }
 function apply(g,actor,a){const err=legal(g,actor,a);if(err)return {ok:false,error:err};const p=own(g,actor),en=foe(g,actor);
 g.lastAction={type:a.type,actor,...(Number.isInteger(a.from)?{from:a.from}:{}),...(Number.isInteger(a.to)?{to:a.to}:{}),...(Number.isInteger(a.lane)?{lane:a.lane}:{}),...(Number.isInteger(a.base)?{base:a.base}:{}),...(a.type==='play'?{cardId:p.hand.find(c=>c.uid===a.uid)?.id}:{})};
 if(a.type==='draft'){
   p.selected=a.bases.slice();p.camps=a.bases.map((id,i)=>({id:i,baseId:id,name:baseMap[id].name,power:id,hp:10,maxHp:10,used:false,wildUsed:false}));p.drafted=true;
   note(g,'Player '+actor+' locked in three bases.');if(g.players.every(x=>x.drafted)){g.phase='battle';g.active=1;note(g,'Bases revealed. Player 1 begins.');}g.revision++;return {ok:true};
 }
 if(a.type==='draw'){p.water-=2;draw(g,p);note(g,'Player '+actor+' draws a card for 2 water.');}
 else if(a.type==='silo'){p.water--;p.silo++;note(g,'Player '+actor+' stores 1 water in the silo ('+p.silo+' stored).');}
 else if(a.type==='emptySilo'){const returned=p.silo;p.water+=returned;p.silo=0;note(g,'Player '+actor+' empties the silo and returns '+returned+' stored water to reserves.');}
 else if(a.type==='reposition'){
  const moving=p.units[a.from],other=p.units[a.to],cost=defs[moving.id]?.cost||0;p.water-=cost;
  p.units[a.to]=moving;p.units[a.from]=other||null;
  for(const slot of [a.from,a.to]){const u=p.units[slot];if(u?.freshRush&&p.gooRows[slot>=3?1:0])u.ready=false;}
  refreshAuras(g,p);
  const place=i=>(i>=3?'front':'back')+' row, column '+(i%3+1);
  note(g,'Player '+actor+' '+(other?'swaps '+moving.name+' with '+other.name:'moves '+moving.name)+' from '+place(a.from)+' to '+place(a.to)+' for '+cost+' water.');
 }
 else if(a.type==='raid'){p.water-=2;if(p.raids.length){advanceRaid(g,p,p.raids[0],'2-water boost');}else{p.raids.push({lane:a.lane,remaining:2});note(g,'Player '+actor+' launches Raid on column '+(a.lane+1)+' (2 owner turns).');}}
 else if(a.type==='attack'){
   const attacker=p.units[a.from];attacker.ready=false;const targetIndex=frontmost(en,a.to),target=targetIndex>=0?en.units[targetIndex]:null;
   if(target){const hit=combatAtk(attacker,a.from,p),ret=combatAtk(target,targetIndex,en);const attackerName=attacker.name,targetName=target.name;
    // Retaliation is simultaneous: a defender still strikes back even when defeated by the attack.
    // Apply the snapshotted retaliation first so death effects cannot erase the attacker's damage.
    damageUnit(g,p,a.from,ret);damageUnit(g,en,targetIndex,hit,attacker.id==='harpoon');
    if(attacker.id==='spore'&&en.units[targetIndex]&&hit>0)weaken(g,en.units[targetIndex],en);
    if(target.id==='spore'&&p.units[a.from]&&ret>0)weaken(g,p.units[a.from],p);
    note(g,attackerName+' ('+hit+' ATK) clashes with '+targetName+' ('+ret+' ATK).');
    if(attacker.id==='cultist'&&!en.units[targetIndex]&&frontmost(en,a.to)===-1&&en.camps[a.to].hp>0){hitBase(g,en,a.to);note(g,'Flame Cultist ignites exposed base.');}
    note(g,'Player '+actor+' '+attacker.name+' attacks '+target.name+'.');}
   else{const damage=combatAtk(attacker,a.from,p)*(p.breach?2:1);hitBase(g,en,a.to,damage);if(p.breach)p.breach=false;
     if(attacker.trait==='saboteur'||attacker.id==='saboteur'){const j=Math.floor(Math.random()*en.hand.length);if(en.hand.length)en.discard.push(en.hand.splice(j,1)[0]);}
     note(g,'Player '+actor+' '+attacker.name+' attacks the exposed base for '+damage+' damage.');}
   if(attacker.id==='skimmer'&&p.units[a.from]){const other=a.from<3?a.from+3:a.from-3;if(!p.units[other]){p.units[other]=p.units[a.from];p.units[a.from]=null;note(g,'Sand Skimmer changes rows.');}}
 }
 else if(a.type==='play'){
   const j=p.hand.findIndex(x=>x.uid===a.uid),c=p.hand.splice(j,1)[0],d=defs[c.id];p.water-=d.cost;
   if(d.kind==='unit'){
     const row=a.lane>=3?1:0;
     const grantedRush=p.nextRush;
     const isRush=d.trait==='rush'||grantedRush;
     const canRush=isRush&&!p.gooRows[row];
     p.units[a.lane]={id:c.id,uid:c.uid,name:d.name,atk:d.atk,hp:d.hp,maxHp:d.hp,ready:canRush,freshRush:canRush,trait:d.trait||'',shield:0,tempAtk:grantedRush?(p.nextRushAtk||0):0};
     if(grantedRush){p.nextRush=false;p.nextRushAtk=0;note(g,d.name+' receives Rush from the preparation effect.');}
     for(let i=Math.floor(a.lane/3)*3;i<Math.floor(a.lane/3)*3+3;i++){
       const ally=p.units[i];if(i!==a.lane&&ally?.id==='conductor'&&!ally.conductorUsed){p.units[a.lane].tempAtk++;ally.conductorUsed=true;note(g,'Battle Conductor gives +1 attack to '+d.name+' this turn.');break;}
     }
     if(c.id==='herald'){p.nextRush=true;note(g,'Bloodhorn Herald prepares Rush for the next friendly deployment.');}
     if(c.id==='gooalch')applyGoo(g,en,1);
     if(c.id==='surgeon'){
       const other=a.lane<3?a.lane+3:a.lane-3;
       const beneficiary=p.units[other]||p.units[a.lane];beneficiary.maxHp++;beneficiary.hp=Math.min(beneficiary.maxHp,beneficiary.hp+1);
       note(g,'Mutant Surgeon permanently improves '+beneficiary.name+' maximum health by 1.');
     }
     refreshAuras(g,p);
     if(d.effect==='water')gain(g,p,2);if(d.effect==='draw1')draw(g,p);
     if(isRush)note(g,'Player '+actor+' '+d.name+(canRush?' has RUSH and may attack an enemy person immediately.':' has its immediate Rush attack blocked by Toxic Goo.'));
     if(c.id==='engineer'){const order=[(a.lane+3)%6,0,1,2,3,4,5];const free=order.find(i=>!p.units[i]);if(free!==undefined){p.units[free]={id:'drone',uid:uid(),name:'Scrap Drone',atk:1,hp:1,maxHp:1,ready:false,trait:'',shield:0,tempAtk:0};note(g,'Junker Engineer deploys a Scrap Drone.');}}
     if(c.id==='chem'&&en.units[3+a.lane%3])damageUnit(g,en,3+a.lane%3,2);
   }else if(d.kind==='event')p.events.push({id:c.id,uid:c.uid,name:d.name,remaining:d.count,targeted:!!d.target,lane:d.target?a.lane:null,row:d.target?.endsWith('Row')?a.lane:null});
   else{if(d.effect==='draw2'){draw(g,p);draw(g,p);}if(d.effect==='cache')gain(g,p,2);
     if(d.effect==='storm')frontDamage(g,en,2);if(d.effect==='strike')deal(g,en,a.lane,3);if(d.effect==='sabotage')hitBase(g,en,a.lane);
     if(d.effect==='patch'){const c=p.camps[a.lane];if(c.hp>0&&c.hp<c.maxHp)c.hp=c.maxHp;else{const n=[p.units[a.lane+3],p.units[a.lane]].find(u=>u&&u.hp<u.maxHp);if(n)n.hp=Math.min(n.maxHp,n.hp+2);}}
     p.discard.push(c);
   }
   if(d.cost>=3&&p.camps.some(c=>c.hp>0&&c.baseId==='condenser'&&!c.used)){
     const condenser=p.camps.find(c=>c.hp>0&&c.baseId==='condenser'&&!c.used);condenser.used=true;gain(g,p,1);
   }
   note(g,'Player '+actor+' plays '+d.name+' ['+d.kind.toUpperCase()+'] for '+d.cost+' water'+(Number.isInteger(a.lane)?' in '+(d.target?.endsWith('Row')?(a.lane?'front':'back')+' row':d.kind==='unit'?(a.lane>=3?'front':'back')+' row, column '+(a.lane%3+1):'column '+(a.lane+1)):'')+'.');
 }
 else if(a.type==='base'){
   const c=p.camps[a.base],b=getBase(p,a.base);p.water-=b.cost;c.used=true;if(b.wild||b.id==='weld')c.wildUsed=true;
   if(b.id==='market'||b.id==='scrapworks'){const i=p.hand.findIndex(x=>x.uid===a.uid);p.discard.push(p.hand.splice(i,1)[0]);if(b.id==='market')gain(g,p,1);else{draw(g,p);draw(g,p);}}
   if(b.id==='furnace'){p.units[a.lane].hp=0;kill(g,p,a.lane);gain(g,p,2);}
   if(b.id==='railgun'){damageUnit(g,en,a.lane,2);}
   if(b.id==='mortar'){deal(g,en,a.lane,2);}
   if(b.id==='warDrums'){p.units[a.lane].tempAtk=(p.units[a.lane].tempAtk||0)+1;}
   if(b.id==='breach'){p.breach=true;}
   if(b.id==='hospital')p.units[a.lane].hp=Math.min(p.units[a.lane].maxHp,p.units[a.lane].hp+2);
   if(b.id==='barrier'){p.units[a.lane].shield=1;}
   if(b.id==='decoy'){p.units[frontmost(p,a.lane)].decoy=1;}
   if(b.id==='weld'){p.camps[a.lane].hp=p.camps[a.lane].maxHp;}
   if(b.id==='radar'){const x=[];for(let i=0;i<2&&g.sharedDeck.length;i++)x.push(g.sharedDeck.pop());if(x.length){x.sort((a,b)=>((defs[b.id]?.cost||0)-(defs[a.id]?.cost||0)));if(p.hand.length<9)p.hand.push(x[0]);else p.discard.push(x[0]);if(x[1])g.sharedDeck.unshift(x[1]);}}
   if(b.id==='intercept')p.revealHand=true;
   if(b.id==='archive'){const idx=p.discard.findIndex(c=>defs[c.id]?.kind==='tactic');if(idx>=0)g.sharedDeck.push(p.discard.splice(idx,1)[0]);}
   if(b.id==='transport'){p.units[a.lane]=p.units[a.from];p.units[a.from]=null;}
   if(b.id==='forge'){p.units[a.lane].atk++;p.units[a.lane].forged=true;}
   if(b.id==='armor'){p.units[a.lane].maxHp+=2;p.units[a.lane].hp+=2;p.units[a.lane].armored=true;}
   if(b.id==='drone')p.units[a.lane]={id:'drone',uid:uid(),name:'Scrap Drone',atk:1,hp:1,maxHp:1,ready:false,trait:'',shield:0,tempAtk:0};
   if(b.id==='beacon'){if(p.raids.length)advanceRaid(g,p,p.raids[0],'Distress Beacon');else p.events[0].remaining=Math.max(0,p.events[0].remaining-1);}
   if(b.id==='acid')p.events.push({id:'acid',name:'Acid Rain',remaining:1,lane:a.lane,targeted:true});
   if(b.id==='redirect'){const e=p.events.find(x=>x.targeted);e.lane=a.lane;}
   if(b.id==='red'){c.hp=0;en.camps.forEach((target,i)=>{if(target.hp>0)hitBase(g,en,i);});}
   if(b.id==='puppet'){const slot=frontmost(p,a.lane),target=frontmost(en,a.lane);p.units[slot].hp=0;kill(g,p,slot);const taken=en.units[target];en.units[target]=null;const free=p.units.findIndex(u=>u===null);p.units[free]={...taken,ready:false};}
   if(b.id==='chrono'){p.discard.push(...p.hand.splice(0));p.extraTurn=true;}
   if(b.id==='wormhole'){const x=a.base,y=a.lane;for(const d of [0,3]){const temp=p.units[x+d];p.units[x+d]=en.units[y+d];en.units[y+d]=temp;if(p.units[x+d])p.units[x+d].ready=false;if(en.units[y+d])en.units[y+d].ready=false;}hitBase(g,p,a.base);}
   if(b.id==='lottery'){p.discard.push(...p.hand.splice(0,2));const items=[];for(let i=0;i<5&&g.sharedDeck.length;i++)items.push(g.sharedDeck.pop());let deployed=0;for(const q of items){const free=p.units.findIndex(u=>!u);if(defs[q.id]?.kind==='unit'&&free>=0&&deployed<2){const d=defs[q.id],rush=d.trait==='rush'&&!p.gooRows[free>=3?1:0];p.units[free]={id:q.id,uid:q.uid,name:d.name,atk:d.atk,hp:d.hp,maxHp:d.hp,ready:rush,freshRush:rush,trait:d.trait||'',shield:0,tempAtk:0};deployed++;note(g,'Player '+actor+' deploys '+d.name+' from Bone Lottery'+(rush?' — RUSH READY.':'.'));}else p.discard.push(q);}}
   if(b.id==='doomsday'){const slot=frontmost(p,a.base);p.units[slot].hp=0;kill(g,p,slot);p.events.push({id:'doomsday',name:'Doomsday Marker',remaining:1,lane:a.lane,targeted:false});}
   note(g,b.name+' activates for Player '+actor+'.');
 }
 else if(a.type==='end'){
   const capacity=p.camps.some(c=>c.hp>0&&c.baseId==='reservoir')?2:1;const stored=Math.min(p.water,Math.max(0,capacity-p.silo));if(stored){p.water-=stored;p.silo+=stored;note(g,'Player '+actor+' automatically stores '+stored+' water in the silo.');}

   p.units.forEach(u=>{if(u){u.tempAtk=0;if(u.weakenedTurns){u.weakenedTurns--;if(!u.weakenedTurns)u.weakened=0;}}});p.gooRows=[0,0];
   if(p.extraTurn){p.extraTurn=false;startTurn(g,actor);note(g,'CHRONO BREAKER: extra turn.');}
   else startTurn(g,actor===1?2:1);
 }
 g.revision++;checkWin(g);return {ok:true};
 }
 function project(g,viewer){const projection=p=>({id:p.id,water:p.water,maxWater:p.maxWater,bonusGenerated:p.bonusGenerated,siloGained:p.siloGained||0,
  camps:p.camps.map(c=>({...c})),offer:p.id===viewer?p.offer.slice():null,selected:p.drafted&&g.phase==='battle'?p.selected.slice():p.id===viewer?p.selected.slice():[],drafted:p.drafted,
  units:p.units.map(u=>u?{...u}:null),silo:p.silo,events:p.events.map(e=>({...e})),raids:p.raids.map(r=>({...r})),gooRows:p.gooRows.slice(),nextRush:p.nextRush,deckCount:g.sharedDeck.length,discardCount:p.discard.length,
  handCount:p.hand.length,hand:p.id===viewer||g.players[viewer-1].revealHand?p.hand.map(x=>({...x})):null});
  return {phase:g.phase,active:g.active,turn:g.turn,winner:g.winner,lastAction:g.lastAction?{...g.lastAction}:null,reveals:(g.reveals||[]).map(r=>({...r})),sharedDeckCount:g.sharedDeck.length,sharedPoolSize:decklist.length,players:g.players.map(projection),log:g.log.slice(),revision:g.revision};
 }
 return {defs,baseDefs,baseMap,decklist,newGame,newTestGame,legal,apply,project};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=RULES;
