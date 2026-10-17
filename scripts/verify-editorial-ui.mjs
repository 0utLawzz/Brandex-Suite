import assert from 'node:assert/strict';
import {execSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
const require=createRequire(import.meta.url);require('@next/env').loadEnvConfig(process.cwd());
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,base=process.env.BRANDEX_TEST_BASE_URL||'https://brandex-suite.vercel.app';
assert.equal(new URL(url).hostname,'xogbpsnsmephupbqsfgb.supabase.co');
const key=JSON.parse(execSync('supabase projects api-keys --project-ref xogbpsnsmephupbqsfgb --output json',{encoding:'utf8',stdio:['ignore','pipe','pipe']})).find(k=>k.name==='service_role').api_key;
const service=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),users=[],clients=[],cases=[],associates=[],actors=[],run=crypto.randomUUID().slice(0,8);let checks=0,browser;
function ok(value,label){assert.ok(value,label);console.log('PASS '+label);checks++;}
function cleanError(r){assert.ifError(r.error);return r.data;}
async function staff(role){const email=`suite-ops-${run}-${role}@example.com`,password=crypto.randomUUID()+'Aa1!';const u=cleanError(await service.auth.admin.createUser({email,password,email_confirm:true})).user;users.push(u.id);actors.push(u.id);cleanError(await service.from('profiles').update({role}).eq('id',u.id));const jar=new Map();const client=createServerClient(url,anon,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:cs=>cs.forEach(c=>jar.set(c.name,c.value))}});cleanError(await client.auth.signInWithPassword({email,password}));return{client,email,password,cookie:[...jar].map(([n,v])=>`${n}=${v}`).join('; ')};}
async function api(role,path,body){const r=await fetch(base+path,{method:body?'POST':'GET',redirect:'manual',headers:{Cookie:role?.cookie||'',...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});const t=await r.text();let data;try{data=JSON.parse(t);}catch{data=t;}return{status:r.status,data,location:r.headers.get('location')};}
async function action(role,a,d){return api(role,'/api/operations',{action:a,data:d});}
async function version(id){return cleanError(await service.from('cases').select('updated_at').eq('id',id).single()).updated_at;}
async function event(role,id,name){const r=await action(role,'event',{case_id:id,version:await version(id),event:name,date:'2026-10-17',note:'Isolated acceptance test'});assert.equal(r.status,200,JSON.stringify(r.data));return r;}
try{
 const admin=await staff('admin'),viewer=await staff('viewer');
 const f=new FormData();for(const[k,v]of Object.entries({client_code:'X-'+String(100000+Math.floor(Math.random()*899999)),trading_as:'Acceptance '+run,address:'Design verification only',city:'Lahore',case_prefix:'X',case_number:'001',origin:'fresh',application_name:'DESIGN SAMPLE '+run,rate_1:'100'}))f.set(k,v);
 const r=await api(admin,'/api/intake',f);assert.equal(r.status,201);cases.push(r.data.id);clients.push(cleanError(await service.from('cases').select('client_id').eq('id',cases[0]).single()).client_id);
 const extra=new FormData();for(const[k,v]of Object.entries({client_id:clients[0],case_prefix:'X',case_number:'002',origin:'stage2',application_name:'UNPRICED DESIGN SAMPLE '+run}))extra.set(k,v);const unpriced=await api(admin,'/api/intake',extra);assert.equal(unpriced.status,201);cases.push(unpriced.data.id);
 const{chromium}=require('C:/Users/NADEEM/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const role of[admin,viewer]){
 const c=await browser.newContext(),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/login');await p.getByLabel('EMAIL',{exact:true}).fill(role.email);await p.getByLabel('PASSWORD',{exact:true}).fill(role.password);await p.getByRole('button',{name:'SIGN IN',exact:true}).click();await p.waitForURL('**/dashboard');
 for(const width of[1280,390]){await p.setViewportSize({width,height:900});for(const path of['/dashboard','/cases?q='+run,'/accounts?q='+run,'/accounts/'+clients[0],'/cases/'+cases[0],'/associates','/guide']){await p.goto(base+path);await p.locator('h1').first().waitFor();await p.evaluate(()=>document.fonts.ready);ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),(role===admin?'Admin':'Viewer')+' '+width+' contained '+path.split('?')[0].replace(/[a-f0-9-]{36}/g,'fixture'));}
 const zoom=await p.evaluate(()=>getComputedStyle(document.body).zoom);ok(Number(zoom)===(width===1280?0.9:1),'screen scale '+width+' equals '+zoom);
 if(role===admin){await p.screenshot({path:'work/design-review/guide-'+width+'.png',fullPage:width!==1280});await p.goto(base+'/accounts?q='+run);await p.getByRole('link',{name:'OPEN CLIENT LEDGER ↗',exact:true}).waitFor();await p.screenshot({path:'work/design-review/suite-accounts-'+width+'.png',fullPage:width!==1280});ok(await p.locator('.account-balance.needs-rate').count()===1,'unpriced charges stay explicitly marked for review');ok(await p.locator('[aria-current="page"]').filter({hasText:'Client Ledger'}).count()===1,'account navigation identifies current page');ok(await p.getByRole('button',{name:'SIGN OUT',exact:true}).isVisible(),'signed-in ledger shows sign out');}}
 await p.emulateMedia({media:'print'});ok(Number(await p.evaluate(()=>getComputedStyle(document.body).zoom))===1,'print keeps full scale');ok(errors.length===0,'no uncaught browser errors for '+(role===admin?'Admin':'Viewer'));await c.close();}
 console.log(`${checks} editorial UI checks passed.`);
}catch(error){console.error("PRIMARY FAILURE: "+error.message);throw error;}finally{
 if(browser)await browser.close();
 const recoveredClients=cleanError(await service.from('clients').select('id').eq('trading_as','Acceptance '+run));
 for(const row of recoveredClients)if(!clients.includes(row.id))clients.push(row.id);
 if(clients.length){const recoveredCases=cleanError(await service.from('cases').select('id').in('client_id',clients));for(const row of recoveredCases)if(!cases.includes(row.id))cases.push(row.id);}

 const refs=[...clients,...cases,...associates];
 for(const t of ['suite_charges','suite_receipts','suite_receivings','associate_payments','associate_fees']){const col=t==='suite_receivings'?'client_id':t==='associate_payments'?'associate_id':'case_id';const ids=col==='client_id'?clients:col==='associate_id'?associates:cases;refs.push(...cleanError(await service.from(t).select('id').in(col,ids)).map(x=>x.id));}
 for(const t of['suite_events','suite_allocations','associate_allocations','case_delivery','suite_receipts','suite_receivings','associate_payments','associate_fees','suite_charges']){
  let r;if(t==='suite_allocations'){const ids=cleanError(await service.from('suite_receivings').select('id').in('client_id',clients)).map(x=>x.id);r=await service.from(t).delete().in('receiving_id',ids);}
  else if(t==='associate_allocations'){const ids=cleanError(await service.from('associate_payments').select('id').in('associate_id',associates)).map(x=>x.id);r=await service.from(t).delete().in('payment_id',ids);}
  else r=await service.from(t).delete().in(['suite_receivings'].includes(t)?'client_id':['associate_payments'].includes(t)?'associate_id':'case_id',['suite_receivings'].includes(t)?clients:['associate_payments'].includes(t)?associates:cases);cleanError(r);
 }
 cleanError(await service.from('cases').delete().in('id',cases));cleanError(await service.from('clients').delete().in('id',clients));cleanError(await service.from('service_associates').delete().in('id',associates));
 cleanError(await service.from('suite_audit').delete().in('actor',actors));cleanError(await service.from('suite_audit').delete().in('row_ref',refs));
 for(const id of users)cleanError(await service.auth.admin.deleteUser(id));
 console.log('Only isolated test records/users removed.');
}
