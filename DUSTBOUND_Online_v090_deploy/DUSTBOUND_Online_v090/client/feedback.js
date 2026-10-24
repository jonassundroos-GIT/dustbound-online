/* Read-only presentation planning from public match projections. */
const LIFE_FEEDBACK=(()=>{
 function plan(before,after){
  if(!before||!after||before.phase!=='battle'||after.phase!=='battle'||after.revision<=before.revision)return [];
  const out=[],action=after.lastAction||{},turnChanged=before.turn!==after.turn||before.active!==after.active;
  const newLog=after.log.slice(0,Math.max(0,after.log.length-before.log.length));
  for(const p of after.players){
   const old=before.players.find(x=>x.id===p.id);if(!old)continue;
   const prior=new Map(old.units.filter(Boolean).map(u=>[u.uid,u]));
   p.units.forEach((u,slot)=>{
    if(!u)return;const previous=prior.get(u.uid);
    if(!previous){out.push({kind:'deploy',actor:p.id,slot,rush:!!u.freshRush&&u.ready});return;}
    const from=old.units.findIndex(x=>x?.uid===u.uid);
    if(from!==slot)out.push({kind:'move',actor:p.id,slot,from});
    if(u.hp>previous.hp&&u.maxHp===previous.maxHp){
     const medic=turnChanged&&after.active===p.id?p.units.findIndex((x,i)=>x?.id==='medic'&&i%3===slot%3):-1;
     out.push({kind:'heal',actor:p.id,slot,amount:u.hp-previous.hp,medic});
    }
    if(u.shield&&!previous.shield)out.push({kind:'shield',actor:p.id,slot});
    if(previous.shield&&!u.shield&&action.type!=='end')out.push({kind:'block',actor:p.id,slot});
   });
   p.camps.forEach((c,slot)=>{
    const previous=old.camps[slot];if(!previous)return;
    if(previous.hp>5&&c.hp>0&&c.hp<=5)out.push({kind:'base-damaged',actor:p.id,slot});
    if(c.hp>previous.hp)out.push({kind:'repair',actor:p.id,slot,amount:c.hp-previous.hp});
   });
   const stored=p.silo-old.silo;
   if(stored>0)out.push({kind:'store',actor:p.id,amount:stored});
   if(stored<0&&(action.type==='emptySilo'||turnChanged&&p.id===after.active))out.push({kind:'refund',actor:p.id,amount:-stored});
   if(!(turnChanged&&p.id===after.active)&&p.water!==old.water)out.push({kind:'water',actor:p.id,amount:p.water-old.water});
   // A disappearing queue item is a resolution only if the public log confirms it.
   for(const event of old.events){
    if(p.events.some(e=>event.uid?e.uid===event.uid:e.id===event.id&&e.name===event.name))continue;
    if(newLog.some(line=>line.includes('Player '+p.id+' '+event.name+' resolves.')))out.push({kind:'event',actor:p.id,id:event.id,name:event.name,lane:event.lane,row:event.row});
   }
  }
  if(turnChanged)for(const r of after.reveals||[])out.push({kind:'scan',...r});
  if(after.winner&&!before.winner)out.push({kind:'victory',actor:after.winner});
  return out;
 }
 return {plan};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=LIFE_FEEDBACK;
