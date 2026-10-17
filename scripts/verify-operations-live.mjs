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
 ok((await api(null,'/dashboard')).location?.includes('login'),'unauthenticated dashboard redirects');
 const code='X-'+String(100000+Math.floor(Math.random()*899999));
 for(let n=1;n<=2;n++){
  const f=new FormData();for(const[k,v]of Object.entries(n===1?{client_code:code,trading_as:'Acceptance '+run,address:'Isolated test address',rate_1:'100',rate_2:'200',rate_3:'300',rate_4:'400'}:{client_id:clients[0]}))f.set(k,v);
  for(const[k,v]of Object.entries({case_prefix:'X',case_number:String(n),origin:'fresh',application_name:'ACCEPTANCE '+run+' '+n,nice_class:'3'}))f.set(k,v);
  const r=await api(admin,'/api/intake',f);assert.equal(r.status,201,JSON.stringify(r.data));cases.push(r.data.id);
  if(n===1)clients.push(cleanError(await service.from('cases').select('client_id').eq('id',r.data.id).single()).client_id);
 }
 ok(cases.length===2,'Admin registers two cases with manual case numbers');
 const charges=cleanError(await admin.client.from('suite_charges').select('*').in('case_id',cases));ok(charges.length===2&&charges.every(c=>Number(c.amount)===100),'live initial charges exactly once');
 const receiving=crypto.randomUUID(),payload={id:receiving,client_id:clients[0],amount:'150',date:'2026-10-17',payer_name:'Test payer',reference:run,allocations:charges.map(c=>({charge_id:c.id,amount:'50'}))};
 let r=await action(admin,'receiving',payload);assert.equal(r.status,200,JSON.stringify(r.data));
 let receipts=cleanError(await admin.client.from('suite_receipts').select('*').eq('receiving_id',receiving));ok(receipts.length===2,'live multi-case receiving creates two receipts');const numbers=receipts.map(x=>x.receipt_number).sort();
 r=await action(admin,'receiving',{...payload,version:1,amount:'160'});ok(r.status===200,'receiving edit succeeds');
 r=await action(admin,'receiving',{...payload,version:1});ok(r.status===409,'stale receiving edit rejected');
 receipts=cleanError(await viewer.client.from('suite_receipts').select('*').eq('receiving_id',receiving));ok(JSON.stringify(numbers)===JSON.stringify(receipts.map(x=>x.receipt_number).sort()),'Viewer receipt history preserves receipt numbers');
 r=await action(viewer,'receiving',payload);ok(r.status===403,'Viewer operations denied');
 ok(Boolean((await viewer.client.rpc('suite_action',{p_action:'receiving',p_data:payload})).error),'Viewer direct RPC denied');
 ok(Boolean((await admin.client.from('suite_receivings').update({amount:1}).eq('id',receiving)).error),'direct financial updates denied even to Admin');
 await event(admin,cases[0],'filed');await event(admin,cases[0],'acknowledged');
 const assoc=await action(admin,'associate',{name:'Acceptance '+run,default_fee:'1000'});assert.equal(assoc.status,200,JSON.stringify(assoc.data));associates.push(assoc.data.id);
 r=await action(admin,'assign',{case_id:cases[0],version:await version(cases[0]),stage:2,associate_id:associates[0],amount:'1000',date:'2026-10-17'});assert.equal(r.status,200,JSON.stringify(r.data));
 await event(admin,cases[0],'assigned');await event(admin,cases[0],'accepted');
 ok(cleanError(await admin.client.from('suite_charges').select('id').eq('case_id',cases[0]).eq('stage_no',3)).length===1,'Accepted creates Stage 3 charge live');
 const payment=await action(admin,'settlement',{id:crypto.randomUUID(),associate_id:associates[0],amount:'500',date:'2026-10-17',reference:run});assert.equal(payment.status,200,JSON.stringify(payment.data));
 ok(Number(cleanError(await admin.client.from('associate_fee_position').select('outstanding').eq('associate_id',associates[0]).single()).outstanding)===500,'partial associate settlement updates unpaid fees');
 r=await action(admin,'void_receiving',{id:receiving,client_id:clients[0],version:2});assert.equal(r.status,200,JSON.stringify(r.data));
 ok(cleanError(await service.from('cases').select('workflow_step').eq('id',cases[0]).single()).workflow_step==='accepted','receipt void leaves actual workflow unchanged');
 for(const path of ['/dashboard','/cases','/accounts','/accounts/'+clients[0],'/associates','/audit','/cases/'+cases[0],'/receipts/'+receipts[0].id,'/new-case']){r=await api(admin,path);ok(r.status===200,'hosted page '+path.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g,'fixture'));}
 const{chromium}=require('C:/Users/NADEEM/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const role of[admin,viewer]){const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/login');await page.getByLabel('EMAIL',{exact:true}).fill(role.email);await page.getByLabel('PASSWORD',{exact:true}).fill(role.password);await page.getByRole('button',{name:'SIGN IN',exact:true}).click();await page.waitForURL('**/dashboard');await page.goto(base+'/cases/'+cases[0]);await page.getByText('ACCEPTANCE '+run+' 1',{exact:true}).first().waitFor();ok(errors.length===0,'browser '+(role===admin?'Admin':'Viewer')+' renders case without errors');await context.close();}
 console.log(`${checks} hosted operation checks passed.`);
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
