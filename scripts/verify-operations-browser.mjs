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
 const admin=await staff('admin');
 const{chromium}=require('C:/Users/NADEEM/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const context=await browser.newContext(),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/login');await page.getByLabel('EMAIL',{exact:true}).fill(admin.email);await page.getByLabel('PASSWORD',{exact:true}).fill(admin.password);await page.getByRole('button',{name:'SIGN IN',exact:true}).click();await page.waitForURL('**/dashboard');
 await page.goto(base+'/intake');await page.waitForURL('**/new-case');ok(await page.getByRole('heading',{name:'Case Registration',exact:true}).isVisible(),'old Intake route redirects to Case Registration');
 await page.getByRole('button',{name:'CREATE NEW CLIENT',exact:true}).click();const num=String(100000+Math.floor(Math.random()*899999));
 for(const[k,v]of Object.entries({'#client-number':num,'#trading-as':'Acceptance '+run,'#address':'Isolated browser test','#case-number':'001','#mark':'BROWSER ACCEPTANCE '+run,'#rate-1':'100','#rate-2':'200','#rate-3':'300','#rate-4':'400'}))await page.locator(k).fill(v);
 await page.locator('#terms').selectOption('advance');const response=page.waitForResponse(r=>r.url().endsWith('/api/intake')&&r.request().method()==='POST');await page.getByRole('button',{name:'REGISTER CASE',exact:true}).click();const saved=await response;assert.equal(saved.status(),201);await page.waitForURL(/\/cases\/[0-9a-f-]{36}$/);const record={id:page.url().split('/').pop()};cases.push(record.id);clients.push(cleanError(await service.from('cases').select('client_id').eq('id',record.id).single()).client_id);ok(true,'browser creates new client, rates and case');
 await page.locator('#case-event').selectOption('filed');let wait=page.waitForResponse(r=>r.url().endsWith('/api/operations')&&r.request().method()==='POST');await page.getByRole('button',{name:'RECORD EVENT',exact:true}).click();let rr=await wait;ok(rr.status()===400,'Advance unpaid filing is blocked through browser');
 await page.goto(base+'/accounts/'+clients[0]);await page.getByRole('button',{name:'ADD LINE',exact:true}).first().click();await page.locator('#receiving-amount').fill('125');await page.locator('[id^="allocate-"]').fill('100');await page.locator('#receiving-payer').fill('Browser payer');wait=page.waitForResponse(r=>r.url().endsWith('/api/operations')&&r.request().method()==='POST');await page.getByRole('button',{name:'SAVE RECEIVING',exact:true}).click();rr=await wait;assert.equal(rr.status(),200,JSON.stringify(await rr.json()));
 let summary=cleanError(await admin.client.rpc('suite_account_summary',{p_client:clients[0]}));ok(Number(summary.allocated)===100&&Number(summary.received)===125,'browser allocation leaves exact unallocated advance');
 const receipt=cleanError(await admin.client.from('suite_receipts').select('id').eq('case_id',cases[0]).single());await page.goto(base+'/receipts/'+receipt.id);await page.getByRole('heading',{name:'Receipt',exact:true}).waitFor();ok(await page.getByRole('button',{name:'PRINT',exact:false}).isVisible(),'case receipt exposes print control');await page.pdf({path:'work/operations-verification/receipt.pdf',format:'A4',printBackground:true});
 await page.goto(base+'/cases/'+cases[0]);await page.locator('#case-event').selectOption('filed');wait=page.waitForResponse(r=>r.url().endsWith('/api/operations')&&r.request().method()==='POST');await page.getByRole('button',{name:'RECORD EVENT',exact:true}).click();rr=await wait;ok(rr.status()===200,'Advance case files after actual full allocation');await page.reload();ok(cleanError(await service.from('cases').select('workflow_step').eq('id',cases[0]).single()).workflow_step==='filed','browser event persists to case workflow');
 await page.setViewportSize({width:390,height:844});await page.goto(base+'/accounts/'+clients[0]);await page.getByRole('heading',{name:'Charges & allocations',exact:true}).waitFor();ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'mobile ledger contains its tables without page overflow');await page.screenshot({path:'work/operations-verification/mobile-ledger.png',fullPage:true});
 ok(errors.length===0,'registration, receiving, print and event browser flow has no uncaught errors');await context.close();console.log(`${checks} browser write-flow checks passed.`);
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
