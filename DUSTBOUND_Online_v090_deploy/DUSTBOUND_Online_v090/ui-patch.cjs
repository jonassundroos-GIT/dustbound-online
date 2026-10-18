'use strict';
const fs=require('node:fs');
const path=require('node:path');
// Keep the original embedded art bundle unchanged. Apply the small, versioned
// client release at startup; server and browser always use the same rule source.
module.exports=function upgradePage(source){
 let html=source.toString('utf8').replaceAll('\r\n','\n');
 const replace=(a,b)=>{if(!html.includes(a))throw Error('UI patch anchor missing: '+a.slice(0,80));html=html.replace(a,b);};
 const rules=fs.readFileSync(path.join(__dirname,'rules.cjs'),'utf8').replaceAll('\r\n','\n');
 const engine=rules.slice(rules.indexOf('const RULES ='),rules.indexOf("if(typeof module!==")).trim();
 html=html.replace(/const RULES = \(\(\) => \{[\s\S]*?\n\}\)\(\);/,engine);
 replace('</head>','<link rel="stylesheet" href="/upgrade.css?v=0100">\n</head>');
 replace('DUSTBOUND — v0.8.15 | Full-Art Integration Preview','DUSTBOUND Online · v0.10.0');
 const a=html.indexOf('let handDrag=null,suppressDragClick=false;'),b=html.indexOf('// DUSTBOUND Online · server-mediated',a);
 if(a<0||b<0)throw Error('Old gesture anchors missing');html=html.slice(0,a)+html.slice(b);
 const roster=html.indexOf('function showRoster(){'),rosterEnd=html.indexOf("$('viewRoster')",roster);
 if(roster<0||rosterEnd<0)throw Error('Old catalogue anchors missing');
 html=html.slice(0,roster)+"function showRoster(){showCatalog('unit');}\n"+html.slice(rosterEnd);
 html=html.replace("if(action.type!=='draft'&&action.type!=='end')fxAfter(action,fxBefore);",'// Shared-state renderer handles effects for both players.');
 html=html.replace(/if\(action.type==='end'&&fxTurnHands\)fxAutomaticDraw\(fxTurnHands\[me-1\]\);/g,'');
 html=html.replace("if(game.phase==='battle'&&game.turn>1&&fxPendingHands)fxAutomaticDraw(fxPendingHands[me-1]);",'');
 replace("if(!isLaneTarget(owner,lane,part)){toast('That is not a valid target.');return;}","if(!isLaneTarget(owner,lane,part)){selected=null;render();return;}");
 replace("if(!selected||!projected())return false;","if(!selected||!projected()||projected().phase!=='battle')return false;");
 html=html.replace("defs[u.id].trait==='sniper'","defs[u.id]?.trait==='sniper'");
 html=html.replace(/<button type="button" class="unit-details"[\s\S]*?<\/button>/,'');
 html=html.replace(/<button type="button" class="card-inspect"[\s\S]*?<\/button>/,'');
 html=html.replace("'<div class=\"unit-drowsy\">⌛</div>'","'<div class=\"unit-drowsy\" aria-label=\"Exhausted\">EXHAUSTED</div>'");
 html=html.replace("const art='base_'+b.id;","const art='base_'+b.id+(c.hp<=0?'_destroyed':c.hp===1?'_damaged':'_intact');");
 // Apply health-state changes only to the client section, never rewrite the engine.
 const uiStart=html.indexOf('function isLaneTarget(');
 if(uiStart<0)throw Error('Client health anchors missing');
 html=html.slice(0,uiStart)+html.slice(uiStart)
  .replaceAll('c.hp===1',"(baseVisualState(c)==='damaged')")
  .replaceAll('p.camps[column].hp===1','(p.camps[column].hp>0&&p.camps[column].hp<p.camps[column].maxHp)')
  .replace('(50*c.hp)','(100*c.hp/c.maxHp)');
 html=html.replace('id="gameRoster">CHARACTERS','id="gameRoster">CATALOGUE').replace('id="viewRoster">VIEW 26 CHARACTERS','id="viewRoster">CARD CATALOGUE');
 html=html.replace('Twenty-six playable people and units','Card catalogue').replace('THE TWENTY-SIX','CARD CATALOGUE').replace('Twenty-six approved people · v0.8.15 full-art review','People, bases, events and tactics · complete rules and artwork');
 html=html.replace('DUSTBOUND — v0.9.0 RULES','DUSTBOUND — v0.10.0 RULES');
 html=html.replace('A base has 2 states of health:', 'Every base starts with 10 HP: intact at 6–10 HP, damaged at 1–5 HP, destroyed at 0 HP. Its visual states are:');
 html=html.replace('Units deal their attack damage to units, but each successful exposed base attack causes exactly 1 base hit.', 'People deal their current attack value as damage to people and exposed bases. Printed base-hit effects still deal 1 damage per hit.');
 html=html.replace('The Water Silo stores 1 water (2 with Reservoir Nine), bought for 1 water per stored water.', 'The Water Silo stores 1 water (2 with Reservoir Nine), bought for 1 water per stored water. EMPTY SILO returns all stored water immediately, including on the turn it was stored; make room within the 6-water reserve first. CHANGE LANES moves a friendly person to an empty slot or swaps with another friendly person for only the selected person’s printed water cost. Anchored people cannot move. Moving preserves readiness and exhaustion. HISTORY shows public plays and ability results for the whole match.');
 html=html.replace('Water Cache costs 0 water and generates 1 water.','Water Cache costs 0 and generates 2 water. Water Runner generates 2 on deployment, then 1 at each later turn start while it survives. Salvage Caravan costs 2 and generates 3 after 1 owner turn.');
 html=html.replace('The shared supply includes 10 new synergy cards (6 people and 4 delayed events). Both players draw from the same 40-card pile;','Both players draw from the same 41-card pile, including Salvage Caravan;');
 html=html.replace('Click a ready friendly person to attack; click its small i button (or right-click it) to read its ability.','Drag a ready friendly person onto a legal target to attack. Click any person to read its ability and select an attack. Click a hand card to select it; right-click or double-click to inspect. Click elsewhere or press Escape to cancel a selection. End Turn automatically stores leftover water up to your silo capacity.');
 html=html.replace("caravan:'Generate 2 water (6-water cap)'","caravan:'Generate 3 water (6-water cap)'");
 const marker='\nonlineFromInvite();\n})();';
 const assetManifest=JSON.parse(fs.readFileSync(path.join(__dirname,'public','artwork-manifest.json'),'utf8'));
 const artPatch=Object.entries(assetManifest).map(([key,value])=>'ART['+JSON.stringify(key)+']='+JSON.stringify(value.url)+';').join('\n')+'\n'+Object.keys(require('./rules.cjs').defs).filter(id=>assetManifest['card_'+id]).map(id=>'defs['+JSON.stringify(id)+'].art='+JSON.stringify('card_'+id)+';').join('\n');
 replace(marker,'\n'+artPatch+marker);
 replace(marker,'\n'+fs.readFileSync(path.join(__dirname,'client','upgrade.js'),'utf8').replaceAll('\r\n','\n')+marker);
 html=html.replace('</head>','<link rel="stylesheet" href="/blackwater.css">\n</head>');
 html=html.replace(marker,'\n'+fs.readFileSync(path.join(__dirname,'client','blackwater.js'),'utf8')+marker);
 return Buffer.from(html);
};
