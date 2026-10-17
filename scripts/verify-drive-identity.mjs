import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
let token,createdFolder;
async function drive(path,init={}){const r=await fetch('https://www.googleapis.com/drive/v3/'+path,{...init,headers:{Authorization:'Bearer '+token,...init.headers}});assert.ok(r.ok,'Drive verification '+r.status);return r.status===204?null:r.json();}
try{
 const admin=await staff('admin'),viewer=await staff('viewer');
 const cred=JSON.parse(readFileSync('G:/Brandex Workspace/private-config/google-drive-credentials.json','utf8'));
 const tr=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:cred.client_id,client_secret:cred.client_secret,refresh_token:cred.refresh_token,grant_type:'refresh_token'})});const tj=await tr.json();assert.ok(tr.ok&&tj.access_token,'Google authorization');token=tj.access_token;
 const f=new FormData();for(const[k,v]of Object.entries({client_code:'X-'+String(100000+Math.floor(Math.random()*899999)),trading_as:'Acceptance '+run,address:'Private isolated Drive test',case_prefix:'X',case_number:'123456',origin:'fresh',application_name:'DRIVE ACCEPTANCE '+run,nice_class:'3',rate_1:'100'}))f.set(k,v);
 const reg=await api(admin,'/api/intake',f);assert.equal(reg.status,201,JSON.stringify(reg.data));cases.push(reg.data.id);clients.push(cleanError(await service.from('cases').select('client_id').eq('id',cases[0]).single()).client_id);
 const{chromium}=require('C:/Users/NADEEM/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const context=await browser.newContext(),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/login');await page.getByLabel('EMAIL',{exact:true}).fill(admin.email);await page.getByLabel('PASSWORD',{exact:true}).fill(admin.password);await page.getByRole('button',{name:'SIGN IN',exact:true}).click();await page.waitForURL('**/dashboard');await page.goto(base+'/cases/'+cases[0]);
 const pdf=Buffer.from('%PDF-1.4\nBrandex isolated Drive verification\n%%EOF');await page.locator('#drive-file').setInputFiles({name:'operations-verification.pdf',mimeType:'application/pdf',buffer:pdf});await page.getByRole('button',{name:'UPLOAD TO DRIVE',exact:true}).click();await page.getByRole('link',{name:'operations-verification.pdf',exact:true}).waitFor({timeout:120000});
 const binding=cleanError(await admin.client.from('drive_cases').select('folder_id').eq('case_id',cases[0]).single());createdFolder=cleanError(await admin.client.from('drive_clients').select('folder_id').eq('client_id',clients[0]).single()).folder_id;
 const file=cleanError(await admin.client.from('drive_files').select('*').eq('case_id',cases[0]).single());ok(Boolean(file.file_id),'browser uploads real PDF into restricted X root');
 const perms=await drive('files/'+file.file_id+'/permissions?fields=permissions(type),nextPageToken');ok(!perms.nextPageToken&&!perms.permissions.some(p=>['anyone','domain'].includes(p.type)),'uploaded file remains private');
 const tm=String(100000+Math.floor(Math.random()*899999));await page.locator('#case-tm').fill(tm);await page.getByRole('button',{name:'SAVE IDENTITY',exact:true}).click();
 await page.waitForResponse(r=>r.url().includes('/functions/v1/suite-drive-upload')&&r.request().method()==='POST'&&r.status()===200,{timeout:120000});
 const after=await drive('files/'+binding.folder_id+'?fields=id,name');ok(after.id===binding.folder_id&&after.name.includes(tm),'identity save renames same Drive folder ID with TM');
 const kept=await drive('files/'+file.file_id+'?fields=id,parents');ok(kept.parents.includes(binding.folder_id),'rename preserves uploaded file and parent');
 ok(cleanError(await admin.client.from('suite_charges').select('id').eq('case_id',cases[0])).length===1,'TM addition creates no duplicate stage charge');
 const rf=new FormData();rf.set('case_id',cases[0]);rf.set('action','sync');let response=await fetch(url+'/functions/v1/suite-drive-upload',{method:'POST',headers:{apikey:anon,Origin:base,Authorization:'Bearer '+(await viewer.client.auth.getSession()).data.session.access_token},body:rf});ok(response.status===403,'Viewer cannot rename folders');
 await page.locator('.eyebrow').filter({hasText:tm}).first().waitFor();
 await page.screenshot({path:'work/operations-verification/admin-case-drive.png',fullPage:true});ok(errors.length===0,'Drive upload and identity browser flow has no uncaught errors');
 await context.close();console.log(`${checks} hosted Drive identity checks passed.`);
}catch(error){console.error("PRIMARY FAILURE: "+error.message);throw error;}finally{
 if(browser)await browser.close();
 const recoveredClients=cleanError(await service.from('clients').select('id').eq('trading_as','Acceptance '+run));
 for(const row of recoveredClients)if(!clients.includes(row.id))clients.push(row.id);
 if(clients.length){const recoveredCases=cleanError(await service.from('cases').select('id').in('client_id',clients));for(const row of recoveredCases)if(!cases.includes(row.id))cases.push(row.id);}

 if(clients.length){const binding=cleanError(await service.from('drive_clients').select('folder_id').in('client_id',clients));for(const x of binding)if(token)await drive('files/'+x.folder_id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({trashed:true})});}
 for(const t of['drive_files','drive_cases'])cleanError(await service.from(t).delete().in('case_id',cases));cleanError(await service.from('drive_clients').delete().in('client_id',clients));
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
