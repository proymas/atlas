import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
const failures=[];
const jsFiles=[];

async function walk(dir){
  for(const entry of await fs.readdir(dir,{withFileTypes:true})){
    if(entry.name==='node_modules'||entry.name==='.git')continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())await walk(full);
    else if(entry.isFile()&&entry.name.endsWith('.js'))jsFiles.push(full);
  }
}

await walk(path.join(root,'src'));
await walk(path.join(root,'api'));

for(const file of jsFiles){
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(result.status!==0)failures.push(`Syntax: ${path.relative(root,file)}\n${result.stderr.trim()}`);
}

const read=async file=>fs.readFile(path.join(root,file),'utf8');
const billing=await read('api/billing.js');
const free=await read('src/free-stable.js');
const i18nUi=await read('src/i18n-ui.js');

if(!billing.includes("ATLAS_BILLING_MODE||'live'"))failures.push('Billing must default to live mode explicitly.');
if(!billing.includes("event.livemode"))failures.push('Billing webhook must reject Stripe mode mismatches.');
if(/Join Atlas Pro waitlist|Apuntarme a Atlas Pro|\/api\/waitlist/.test(free))failures.push('Legacy Pro waitlist logic returned to free-stable.js.');
if(!i18nUi.includes("'./billing-client.js'"))failures.push('Billing client is not loaded by the application bootstrap.');

const apiEntries=(await fs.readdir(path.join(root,'api'),{withFileTypes:true})).filter(entry=>entry.isFile()&&entry.name.endsWith('.js'));
if(apiEntries.length>12)failures.push(`Vercel Hobby function budget exceeded: ${apiEntries.length} API files.`);

if(failures.length){
  console.error(`Architecture smoke failed (${failures.length})\n`);
  failures.forEach((failure,index)=>console.error(`${index+1}. ${failure}\n`));
  process.exit(1);
}

console.log(`Architecture smoke passed: ${jsFiles.length} JS files checked, ${apiEntries.length} API functions.`);
