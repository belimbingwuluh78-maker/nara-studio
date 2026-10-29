import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ffmpeg from 'ffmpeg-static';
import {encoderArgs} from '../core.mjs';
import {WebSocket} from 'ws';
import {once} from 'node:events';
test('real FFmpeg pipeline converts WebM video and audio into H264/AAC FLV',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'nara-test-'));
 try{
 const source=join(folder,'source.webm'),dest=join(folder,'encoded.flv');
 const make=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc=size=640x360:rate=30','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','2','-c:v','libvpx','-c:a','libopus',source],{windowsHide:true});
 assert.equal(make.status,0,String(make.stderr));
 const encode=spawnSync(ffmpeg,encoderArgs(dest),{input:await readFile(source),windowsHide:true,maxBuffer:1024*1024});
 assert.equal(encode.status,0,String(encode.stderr));assert.equal((await readFile(dest)).subarray(0,3).toString(),'FLV');
 const check=spawnSync(ffmpeg,['-i',dest,'-f','null','-'],{windowsHide:true});assert.equal(check.status,0);assert.match(check.stderr.toString(),/Video: h264/);assert.match(check.stderr.toString(),/Audio: aac/);
 }finally{await rm(folder,{recursive:true,force:true});}
});
test('server protects mutations, isolates streaming platforms and generates local WAV speech',async(t)=>{
 const data=await mkdtemp(join(tmpdir(),'nara-settings-test-'));
 const proc=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'3219',STUDIO_DATA_DIR:data},windowsHide:true,stdio:['ignore','pipe','pipe']});
 try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server startup timeout')),10000);proc.stdout.once('data',()=>{clearTimeout(timer);resolve();});proc.once('error',reject);});
 const base='http://localhost:3219';const boot=await fetch(base+'/api/bootstrap').then(r=>r.json());
 assert.equal((await fetch(base+'/api/config',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
 const post=(path,body)=>fetch(base+'/api/'+path,{method:'POST',headers:{'x-studio-token':boot.token,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await post('ai/reply',{text:'hi'})).status,400);
 const auth=await post('youtube/auth',{});assert.equal(auth.status,503);assert.equal((await auth.json()).code,'GOOGLE_LOGIN_NOT_CONFIGURED');
 const status=await fetch(base+'/api/status',{headers:{'x-studio-token':boot.token}}).then(r=>r.json());assert.equal(status.googleLoginConfigured,false);assert.equal(status.clientSecret,undefined);
 const cross=await fetch(base+'/api/config',{method:'POST',headers:{Origin:'https://evil.example','x-studio-token':boot.token,'Content-Type':'application/json'},body:'{}'});assert.equal(cross.status,403);
 assert.equal((await post('voice/settings',{provider:'omnivoice',speed:-1})).status,400);
 assert.equal((await post('voice/settings',{provider:'windows',speed:1.2})).status,200);
 const persisted=JSON.parse(await readFile(join(data,'voice.json'),'utf8'));assert.equal(persisted.speed,1.2);
 const bad=await fetch(base+'/api/voice/reference',{method:'POST',headers:{'x-studio-token':boot.token,'Content-Type':'application/octet-stream'},body:Buffer.from('not audio')});assert.equal(bad.status,400);
 // Manual TikTok requires no Google login. Never contact an external ingest server in this test.
 const get=path=>fetch(base+'/api/'+path,{headers:{'x-studio-token':boot.token}}).then(r=>r.json());
 assert.equal((await post('stream/platform',{platform:'unknown'})).status,400);
 assert.equal((await post('stream/platform',{platform:'tiktok'})).status,200);
 await t.test('chat API rejects mismatched platforms and invalid names',async()=>{
  assert.equal((await post('chat/connect',{platform:'twitch',channel:'twitch'})).status,400);
  assert.equal((await post('chat/connect',{platform:'tiktok',channel:'https://tiktok.com',allowCommunity:true})).status,400);
  assert.equal((await get('status')).chat,false);
  assert.equal(JSON.stringify(await get('status')).includes('test-secret'),false);
  assert.equal((await post('chat/stop',{})).status,200);
 });
 assert.equal((await get('status')).platform,'tiktok');assert.equal((await get('status')).streamReady,false);
 assert.equal((await post('youtube/chat',{})).status,400);assert.equal((await post('youtube/auth',{})).status,400);assert.equal((await post('youtube/live',{})).status,400);
 assert.equal((await post('stream/settings',{platform:'youtube',server:'rtmps://example.com/live',streamKey:'test'})).status,400);
 assert.equal((await post('stream/settings',{platform:'tiktok',server:'file:///tmp',streamKey:'test'})).status,400);
 assert.equal((await post('stream/settings',{platform:'tiktok',server:'rtmps://example.com/live',streamKey:'test?sign=abc&expire=123'})).status,200);
 assert.equal((await get('status')).streamReady,true);assert.equal((await get('status')).youtubeReady,false);
 assert.equal((await get('stream/settings')).streamKey,undefined);
 assert.equal((await post('stream/settings',{platform:'tiktok',server:'rtmps://example.com/live',streamKey:''})).status,200);
 assert.equal((await post('stream/settings',{platform:'tiktok',server:'rtmps://other.example.com/live',streamKey:''})).status,400);
 await post('config',{provider:'deepseek',server:'rtmps://wrong.example.com/live',streamKey:'wrong'});
 assert.equal((await get('stream/settings')).server,'rtmps://example.com/live');
 await post('stream/platform',{platform:'youtube'});assert.equal((await get('status')).streamReady,false);
 await post('stream/platform',{platform:'tiktok'});assert.equal((await get('stream/settings')).server,'');assert.equal((await get('status')).streamReady,false);
 for(const platform of ['twitch','facebook','kick','custom'])await t.test(platform+' accepts manual ingest without Google and clears previous credentials',async()=>{
  assert.equal((await post('stream/platform',{platform})).status,200);
  let settings=await get('stream/settings');
  assert.equal(settings.platform,platform);assert.equal(settings.keySaved,false);
  assert.equal(settings.server,platform==='twitch'?'rtmp://live.twitch.tv/app':'');
  assert.equal((await post('youtube/auth',{})).status,400);
  assert.equal((await post('youtube/live',{})).status,400);
  const server='rtmps://example.invalid/'+platform,streamKey='test-'+platform+'?sign=a%2Fb&expires=123';
  assert.equal((await post('stream/settings',{platform,server,streamKey})).status,200);
  settings=await get('stream/settings');assert.equal(settings.server,server);assert.equal(settings.keySaved,true);assert.equal(settings.streamKey,undefined);
  const state=await get('status');assert.equal(state.platform,platform);assert.equal(state.streamReady,true);assert.equal(state.youtubeReady,false);assert.equal(state.chat,false);assert.equal(state.broadcast,null);
  assert.equal(JSON.stringify(state).includes(streamKey),false);
  assert.equal((await post('stream/settings',{platform:'youtube',server,streamKey:'wrong-platform'})).status,400);
  assert.equal((await post('stream/platform',{platform:'__proto__'})).status,400);
  assert.equal((await get('status')).platform,platform);
 });
 await t.test('active encoder blocks platform and destination changes',async()=>{
  // No media is sent: FFmpeg waits for input and never connects to an ingest server.
  await post('stream/settings',{platform:'custom',server:'rtmp://127.0.0.1:19359/live',streamKey:'local-test-only'});
  const ws=new WebSocket('ws://localhost:3219/media?token='+boot.token,{origin:base});
  try{
   const [message]=await once(ws,'message',{signal:AbortSignal.timeout(5000)});assert.equal(JSON.parse(message).ready,true);
   assert.equal((await post('stream/platform',{platform:'twitch'})).status,400);
   assert.equal((await post('stream/settings',{platform:'custom',server:'rtmp://127.0.0.1:19359/other',streamKey:'other'})).status,400);
   assert.equal((await get('status')).platform,'custom');
  }finally{const closed=once(ws,'close');ws.close();await closed;}
 });
 if(process.platform==='win32'){
 const voice=await post('voice',{text:'Halo, saya Nara.'});const buf=Buffer.from(await voice.arrayBuffer());assert.equal(voice.status,200,buf.toString());assert.equal(buf.subarray(0,4).toString(),'RIFF');assert.ok(buf.length>1000);
 }
 }finally{proc.kill();await rm(data,{recursive:true,force:true});}
});
