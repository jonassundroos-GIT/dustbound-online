const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=require('../ui-patch.cjs')(fs.readFileSync(path.join(root,'public','index.html'))).toString('utf8');
test('browser scripts parse and the embedded rules equal the authoritative server rules',()=>{
 for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
 const rules=fs.readFileSync(path.join(root,'rules.cjs'),'utf8').replaceAll('\r\n','\n');
 const engine=rules.slice(rules.indexOf('const RULES ='),rules.indexOf("if(typeof module!==")).trim();
 assert.equal(html.match(/const RULES = \(\(\) => \{[\s\S]*?\n\}\)\(\);/)[0],engine);
 const upgrade=fs.readFileSync(path.join(root,'client','upgrade.js'),'utf8').replaceAll('\r\n','\n');
 assert(html.includes(upgrade),'Browser UI must be rebuilt after editing the upgrade source.');
});
