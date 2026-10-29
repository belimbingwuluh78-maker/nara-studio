import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';

test('Google setup persists; OAuth validates state, denial, API failure and channel before connecting',async()=>{
 const data=await mkdtemp(join(tmpdir(),'nara-google-test-'));let proc;
 const base='http://localhost:3220';let headers;
 async function start(){
  proc=spawn(process.execPath,['--import','./test/google-fetch-fixture.mjs','server.mjs'],{env:{...process.env,PORT:'3220',STUDIO_DATA_DIR:data,GOOGLE_CLIENT_ID:'',GOOGLE_CLIENT_SECRET:''},windowsHide:true,stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Startup timeout')),10000);proc.stdout.once('data',()=>{clearTimeout(t);resolve();});proc.once('error',e=>{clearTimeout(t);reject(e);});});
  const boot=await fetch(base+'/api/bootstrap').then(r=>r.json());headers={'x-studio-token':boot.token,'Content-Type':'application/json'};
 }
 const post=(path,body)=>fetch(base+'/api/'+path,{method:'POST',headers,body:JSON.stringify(body)});
 const status=()=>fetch(base+'/api/status',{headers}).then(r=>r.json());
 const callback=(url,query)=>fetch(base+'/oauth/callback?'+new URLSearchParams({state:new URL(url).searchParams.get('state'),...query}));
 async function auth(){const r=await post('youtube/auth',{});assert.equal(r.status,200);return (await r.json()).url;}
 async function stop(){const done=once(proc,'exit');proc.kill();await done;proc=null;}
 try{
  await start();
  assert.equal((await post('youtube/auth',{})).status,503);
  const client={web:{client_id:'123-test.apps.googleusercontent.com',client_secret:'test-only-secret',redirect_uris:[base+'/oauth/callback']}};
  assert.equal((await fetch(base+'/api/youtube/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(client)})).status,403);
  assert.equal((await post('youtube/setup',{installed:client.web})).status,400);
  assert.equal((await post('youtube/setup',{web:{...client.web,redirect_uris:['http://localhost:3210/oauth/callback']}})).status,400);
  assert.equal((await post('youtube/setup',client)).status,200);
  assert.deepEqual(JSON.parse(await readFile(join(data,'google-client.json'),'utf8')),client);
  await stop();await start();assert.equal((await status()).googleLoginConfigured,true);
  const setup=await fetch(base+'/api/youtube/setup',{headers});assert.equal(setup.headers.get('cache-control'),'no-store');assert.ok(!(await setup.text()).includes('test-only-secret'));
  let url=await auth();const params=new URL(url).searchParams;assert.equal(params.get('redirect_uri'),base+'/oauth/callback');assert.equal(params.get('code_challenge_method'),'S256');assert.ok(params.get('code_challenge'));assert.equal(params.has('client_secret'),false);
  assert.equal((await callback(url,{state:'wrong',code:'ok'})).status,400);
  let result=await callback(url,{error:'access_denied'});assert.equal(result.status,400);assert.match(await result.text(),/test user/);
  assert.equal((await callback(url,{code:'ok'})).status,400);assert.equal((await status()).youtubeReady,false);
  url=await auth();result=await callback(url,{code:'no-channel'});assert.equal(result.status,400);assert.match(await result.text(),/belum memiliki channel/);assert.equal((await status()).youtubeReady,false);
  url=await auth();result=await callback(url,{code:'api-disabled'});assert.equal(result.status,400);assert.match(await result.text(),/Aktifkan YouTube Data API/);assert.equal((await status()).youtubeReady,false);
  url=await auth();result=await callback(url,{code:'ok'});assert.equal(result.status,200);assert.match(await result.text(),/Test &lt;channel&gt;/);assert.equal((await status()).youtubeReady,true);
  assert.equal((await callback(url,{code:'ok'})).status,400);
 }finally{if(proc)await stop();await rm(data,{recursive:true,force:true});}
});
