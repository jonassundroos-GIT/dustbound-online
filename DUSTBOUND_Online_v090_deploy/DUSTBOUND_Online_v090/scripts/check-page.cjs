const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const page=require('../ui-patch.cjs')(fs.readFileSync(path.join(root,'public','index.html'))).toString('utf8');
for(const script of page.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);
console.log('Browser page assembled and all scripts validated.');
