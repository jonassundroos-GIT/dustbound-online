const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'../public'),manifest=require('../public/artwork-manifest.json'),R=require('../rules.cjs');
test('every event and tactic has a distinct verified delivery image',()=>{
 const cards=Object.entries(R.defs).filter(([id,d])=>d.kind!=='unit');
 const urls=new Set();for(const [id] of cards){const a=manifest['card_'+id];assert(a,id+' artwork is missing');assert(a.width>=600&&a.height>=700);urls.add(a.url);}
 assert.equal(urls.size,cards.length);
});
test('all replacement files match their manifest and base prototypes have full-size distinct states',()=>{
 for(const a of Object.values(manifest)){assert.match(a.url,/^\/art\/[a-z_]+\.webp$/);const bytes=fs.readFileSync(path.join(root,a.url.slice(1)));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),a.sha256);}
 for(const id of ['acid','ash','redirect']){const hashes=new Set();for(const state of ['intact','damaged','destroyed']){const a=manifest['base_'+id+'_'+state];assert(a.width>=1024&&a.height>=900);hashes.add(a.sha256);}assert.equal(hashes.size,3);}
});
test('approved battlefield is unchanged',()=>{
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'dustbound_blackwater_arena.png'))).digest('hex'),'a6554db518c87cdad07b28b7cd1a6c5e5eef20a6c72534b6552bbffe531c5c9d');
});
