import {platformName,renderPlatform,initPlatformPicker} from './stream-controls.js';
import {streamPlatforms,streamConfirmation} from './stream-platforms.js';
import {hostState,voiceState,avatarRect,drawPNG,initHostControls,showEngine} from './host-controls.js';
const $=id=>document.getElementById(id);
const boot=await fetch('/api/bootstrap').then(r=>r.json());
const token=boot.token,canvas=$('stage'),ctx=canvas.getContext('2d');
let scene='game',screen=null,camera=null,mic=null,audioContext,destination,gameGain,micGain,aiGain,monitorGain,analyser,voiceSource,voiceResolve;
let screenVideo=document.createElement('video'),camVideo=document.createElement('video');
for(const v of [screenVideo,camVideo]){v.muted=true;v.playsInline=true;}
let recorder=null,localRecorder=null,socket=null,output=null,recordChunks=[],startAt=0,queue=[],busy=false,paused=false,generation=0,lastReply=0,responseCount=0,chatConnected=false,selected=null,avatarLevel=0;
let toastTimer,streamPlatform=boot.state.platform||'youtube',settingsPlatform=streamPlatform,chatSettingsPlatform=streamPlatform,chatPhase='idle';
function toast(s){$('toast').textContent=s;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',6500);}
async function api(path,body){const r=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',headers:{'x-studio-token':token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d;}
function bind(id,fn){$(id).addEventListener('click',async()=>{try{await fn();}catch(e){toast(e.message);}});}
try{$('aiMonitor').checked=localStorage.getItem('nara-ai-monitor')!=='false';}catch{}
$('aiMonitor').onchange=()=>{if(monitorGain)monitorGain.gain.value=$('aiMonitor').checked?1:0;try{localStorage.setItem('nara-ai-monitor',String($('aiMonitor').checked));}catch{}};
async function initAudio(){
 if(audioContext){await audioContext.resume();return;}
 audioContext=new AudioContext();destination=audioContext.createMediaStreamDestination();gameGain=audioContext.createGain();micGain=audioContext.createGain();aiGain=audioContext.createGain();monitorGain=audioContext.createGain();monitorGain.gain.value=$('aiMonitor').checked?1:0;analyser=audioContext.createAnalyser();analyser.fftSize=256;
 gameGain.connect(destination);micGain.connect(destination);aiGain.connect(analyser);analyser.connect(destination);aiGain.connect(monitorGain);monitorGain.connect(audioContext.destination);
 // A silent track keeps the outgoing media format stable even before a mic is enabled.
 const osc=audioContext.createOscillator(),silent=audioContext.createGain();silent.gain.value=0;osc.connect(silent).connect(destination);osc.start();
 for(const [id,gain] of [['gameVolume',gameGain],['micVolume',micGain],['aiVolume',aiGain]]){gain.gain.value=Number($(id).value);$(id).oninput=()=>gain.gain.value=Number($(id).value);}
}
function composition(){if(!output){output=canvas.captureStream(30);for(const t of destination.stream.getAudioTracks())output.addTrack(t);}return output;}
function mime(){for(const s of ['video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus'])if(MediaRecorder.isTypeSupported(s))return s;throw Error('Use a recent version of Chrome or Edge that supports WebM/Opus.');}
function fit(v,x,y,w,h){if(!v.videoWidth)return;const ratio=Math.min(w/v.videoWidth,h/v.videoHeight),dw=v.videoWidth*ratio,dh=v.videoHeight*ratio;ctx.drawImage(v,x+(w-dw)/2,y+(h-dh)/2,dw,dh);}
function round(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function text(s,x,y,size,color='#e7eafa',weight=500){ctx.fillStyle=color;ctx.font=`${weight} ${size}px Segoe UI, sans-serif`;ctx.fillText(s,x,y);}
function avatar(x,y,scale,t){
 ctx.save();ctx.translate(x,y+(hostState.motion==='none'?0:Math.sin(t/700)*4));if(hostState.motion==='sway')ctx.rotate(Math.sin(t/1100)*.025);ctx.scale(scale,scale);
 // Original procedural avatar: no external asset or model license dependency.
 const glow=ctx.createRadialGradient(0,0,10,0,0,160);glow.addColorStop(0,'#9e73f429');glow.addColorStop(1,'#9e73f400');ctx.fillStyle=glow;ctx.fillRect(-170,-180,340,360);
 round(-63,52,126,128,40,'#7160ba');round(-52,68,104,112,34,'#282442');
 ctx.fillStyle='#ad8df2';ctx.beginPath();ctx.ellipse(0,-30,83,100,0,0,Math.PI*2);ctx.fill();
 round(-59,-62,118,134,48,'#f1c7c2');
 ctx.fillStyle='#b49cf3';ctx.beginPath();ctx.moveTo(-76,-20);ctx.bezierCurveTo(-75,-132,74,-145,81,-22);ctx.lineTo(45,-65);ctx.lineTo(16,-24);ctx.lineTo(2,-57);ctx.lineTo(-24,-18);ctx.lineTo(-34,-54);ctx.closePath();ctx.fill();
 ctx.fillStyle='#e2cfff';ctx.beginPath();ctx.moveTo(-65,-58);ctx.lineTo(-72,-118);ctx.lineTo(-30,-92);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(35,-95);ctx.lineTo(75,-120);ctx.lineTo(70,-55);ctx.closePath();ctx.fill();
 const blink=hostState.blink&&Math.sin(t/1600)>.995;for(const ex of [-25,25]){round(ex-10,2,20,blink?3:23,9,'#403756');if(!blink)round(ex-4,4,5,7,3,'#ffffff');round(ex-17,32,30,8,4,'#e59aa866');}
 ctx.strokeStyle='#a45f79';ctx.lineWidth=3;ctx.beginPath();if(avatarLevel>.03){ctx.fillStyle='#743953';ctx.ellipse(0,43,8,3+Math.min(17,avatarLevel*55),0,0,Math.PI*2);ctx.fill();}else{ctx.arc(0,35,9,0.2,Math.PI-.2);ctx.stroke();}
 ctx.save();ctx.translate(63,85);ctx.rotate(busy?-.5+Math.sin(t/220)*.25:.1);round(-3,-6,22,77,11,'#7160ba');round(-3,55,22,24,10,'#f1c7c2');ctx.restore();
 round(-22,91,44,18,8,'#b79ff9');text('✦',-9,105,15,'#35254b');ctx.restore();
}
function draw(t){
 ctx.fillStyle='#101623';ctx.fillRect(0,0,1280,720);
 const bg=ctx.createLinearGradient(0,0,1280,720);bg.addColorStop(0,'#172938');bg.addColorStop(.55,'#1c2239');bg.addColorStop(1,'#33264a');ctx.fillStyle=bg;ctx.fillRect(0,0,1280,720);
 ctx.strokeStyle='#93a5cc0b';ctx.lineWidth=1;for(let x=0;x<1280;x+=55){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,720);ctx.stroke();}for(let y=0;y<720;y+=55){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1280,y);ctx.stroke();}
 if(scene==='game'&&screen)fit(screenVideo,0,0,1280,720);
 if(scene==='game'&&!screen){text('YOUR NEXT GREAT STREAM',76,265,17,'#ab9dcd',650);text('Let’s go live.',72,340,68,'#eef0fa',700);text('Choose a game or screen to get started.',76,389,24,'#99a8be');round(76,428,285,48,24,'#252d43');text('GAMEPLAY  +  AI CO-HOST',96,459,15,'#bcace8',600);}
 if(scene==='host'){text('JUST CHATTING',75,165,19,'#b3a3d4');text('Hey, chat.',72,235,64,'#f0edff',700);text('Nara is ready to join your stream.',77,280,23,'#a9b3cc');}
 if(scene==='break'){text('WE’LL BE RIGHT BACK',80,277,20,'#bba5e7');text('Taking a short break.',76,356,64,'#f0edff',700);text('Stay tuned. We will be back soon.',80,409,24,'#b0b6cf');}
 if(analyser){const values=new Uint8Array(analyser.fftSize);analyser.getByteTimeDomainData(values);avatarLevel=Math.sqrt(values.reduce((a,v)=>a+((v-128)/128)**2,0)/values.length)*4;}
 if($('avatarEnabled').checked&&scene!=='break'){if(hostState.kind!=='png'||!hostState.images.idle||!drawPNG(ctx,avatarLevel,t)){const r=avatarRect(340,360);avatar(r.x+r.w/2,r.y+r.h/2,r.scale,t);}}
 if(camera&&scene!=='break'){round(25,463,272,194,15,'#a894ff');fit(camVideo,29,467,264,186);}
 round(25,674,1230,30,8,'#0b101ace');text('NARA  /  AI CO-HOST',40,695,12,'#c8b7f2',650);text('AI voice & avatar',1080,695,12,'#a9b6cc');
 requestAnimationFrame(draw);
}requestAnimationFrame(draw);
bind('captureBtn',async()=>{await initAudio();const s=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:30,width:1280,height:720},audio:true,systemAudio:'exclude',selfBrowserSurface:'exclude'});screen?.getTracks().forEach(t=>t.stop());screen=s;screenVideo.srcObject=s;await screenVideo.play();if(s.getAudioTracks().length)audioContext.createMediaStreamSource(s).connect(gameGain);$('screenStatus').textContent=s.getVideoTracks()[0].label+(s.getAudioTracks().length?' · audio enabled':' · no audio');s.getVideoTracks()[0].onended=()=>{if(screen===s){screen=null;$('screenStatus').textContent='Capture stopped';if(recorder)stopStream();}};});
bind('cameraBtn',async()=>{if(camera){camera.getTracks().forEach(t=>t.stop());camera=null;$('cameraBtn').textContent='Enable';$('camStatus').textContent='Inactive';return;}camera=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480},audio:false});camVideo.srcObject=camera;await camVideo.play();$('cameraBtn').textContent='Disable';$('camStatus').textContent='Active';});
bind('micBtn',async()=>{await initAudio();if(mic){mic.getTracks().forEach(t=>t.stop());mic=null;$('micBtn').textContent='Enable mic';return;}mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});audioContext.createMediaStreamSource(mic).connect(micGain);$('micBtn').textContent='Disable mic';});
for(const b of document.querySelectorAll('[data-scene]'))b.onclick=()=>{scene=b.dataset.scene;document.querySelectorAll('[data-scene]').forEach(x=>x.classList.toggle('selected',x===b));};
function settings(){$('settings').showModal();}bind('settingsBtn',settings);bind('settingsNav',settings);bind('studioNav',()=>$('stage').scrollIntoView({behavior:'smooth'}));bind('closeSettings',()=>$('settings').close());
$('provider').onchange=()=>{$('model').value=boot.providers[$('provider').value].model;$('aiKey').value='';};
$('settingsForm').onsubmit=async e=>{e.preventDefault();try{const body={};for(const id of ['provider','model','aiKey','persona','encoder'])body[id]=$(id).value;await api('config',body);$('aiKey').value='';$('settings').close();toast('Settings saved for this server session.');await status();}catch(e){toast(e.message);}};
initPlatformPicker();
$('streamPlatform').onchange=async()=>{
 const next=$('streamPlatform').value;$('streamPlatform').disabled=true;
 try{await api('stream/platform',{platform:next});streamPlatform=next;selected=null;queue=[];updateQueue();toast('Platform '+platformName(next)+' selected. Set a streaming destination for this platform.');}
 catch(e){toast(e.message);}finally{await status();}
};
bind('streamSettingsBtn',async()=>{
 const d=await api('stream/settings');settingsPlatform=d.platform;
 $('streamSettingsTitle').textContent='Connection: '+platformName(d.platform);
 const p=streamPlatforms[d.platform];$('streamSettingsHint').textContent=p.help;
 $('streamDashboard').hidden=!p.dashboard;if(p.dashboard){$('streamDashboard').href=p.dashboard;$('streamDashboard').textContent='Open '+platformName(d.platform)+' ↗';}else{$('streamDashboard').removeAttribute('href');}
 $('server').value=d.server;$('streamKey').value='';$('streamKey').required=!d.keySaved;
 $('streamKeyHint').textContent=d.keySaved?'A key is saved. Leave this blank to keep it if the server stays the same.':'Paste the full key, including any additional parameters.';
 $('streamSettings').showModal();
});
bind('closeStreamSettings',()=>$('streamSettings').close());
$('streamSettingsForm').onsubmit=async e=>{e.preventDefault();try{await api('stream/settings',{platform:settingsPlatform,server:$('server').value,streamKey:$('streamKey').value});$('streamKey').value='';selected=null;$('streamSettings').close();toast('Destination: '+platformName(settingsPlatform)+' saved. No media is being sent yet.');await status();}catch(e){toast(e.message);}};
let googleLoginUrl='';
async function googleSetup(){
 const s=await api('youtube/setup');$('googleRedirect').value=s.redirectUri;
 $('googleSetupStatus').textContent=s.configured?'Google is configured. You can sign in now.':'Set up Google once for your studio.';
 $('setupGoogleLogin').hidden=!s.configured;if(!$('loginInfo').open)$('loginInfo').showModal();
}
async function googleLogin(){
 const s=await api('status');if(!s.googleLoginConfigured){await googleSetup();return;}
 $('loginInfo').close();$('googleLoginMessage').textContent='Opening your default browser…';googleLoginUrl='';$('copyGoogleLogin').disabled=true;
 if(!$('googleLoginProgress').open)$('googleLoginProgress').showModal();
 $('connectBtn').disabled=true;
 try{const d=await api('youtube/auth',{openBrowser:true});googleLoginUrl=d.url;$('copyGoogleLogin').disabled=false;$('googleLoginMessage').textContent=d.opened?'Choose your Google account and allow YouTube access in the browser that opens.':'The browser did not open. Copy the sign-in link and open it in Chrome or Edge.';}
 catch(e){$('googleLoginMessage').textContent=e.message;throw e;}finally{$('connectBtn').disabled=false;}
}
bind('connectBtn',googleLogin);bind('setupGoogleLogin',googleLogin);bind('googleSetupBtn',googleSetup);
bind('closeGoogleProgress',()=>$('googleLoginProgress').close());
bind('copyGoogleLogin',async()=>{if(googleLoginUrl){await navigator.clipboard.writeText(googleLoginUrl);toast('Link copied. Paste it into the Chrome or Edge address bar.');}});
bind('copyGoogleRedirect',async()=>{await navigator.clipboard.writeText($('googleRedirect').value);toast('Redirect URI copied.');});
bind('importGoogleClient',async()=>{
 const file=$('googleClientFile').files[0];if(!file)throw Error('Choose the JSON file from Google Cloud first.');
 if(file.size>30000)throw Error('File too large. Choose the Google client configuration JSON.');
 $('importGoogleClient').disabled=true;
 try{let data;try{data=JSON.parse(await file.text());}catch{throw Error('This file is not valid JSON. Download the configuration again from Google Cloud.');}
 await api('youtube/setup',data);$('googleClientFile').value='';$('googleSetupFeedback').textContent='Setup saved. Click Sign in with Google below.';await googleSetup();await status();}
 catch(e){$('googleSetupFeedback').textContent=e.message;}finally{$('importGoogleClient').disabled=false;}
});
bind('closeLoginInfo',()=>$('loginInfo').close());
bind('broadcastBtn',async()=>{$('broadcastDialog').showModal();$('broadcastList').textContent='Loading broadcasts…';try{const d=await api('youtube/broadcasts');$('broadcastList').replaceChildren();if(!d.items.length)$('broadcastList').textContent='No broadcasts yet. Create an encoder broadcast in YouTube Studio.';for(const b of d.items){const el=document.createElement('button');el.textContent=`${b.title} · ${b.privacy} · ${b.status}`;el.onclick=async()=>{try{selected=await api('youtube/select',{id:b.id});$('youtubeStatus').textContent=`${selected.title} · ${selected.privacy} · ${selected.status}${selected.autoStart?' · AUTO-START ENABLED':''}`;$('broadcastDialog').close();toast('Broadcast selected. The stream key is saved on the server.');}catch(e){toast(e.message);}};$('broadcastList').append(el);}}catch(e){$('broadcastList').textContent=e.message;}});
bind('closeBroadcast',()=>$('broadcastDialog').close());
bind('chatBtn',async()=>{
 if(chatConnected||['connecting','waiting'].includes(chatPhase)){await api('chat/stop',{});await status();return;}
 await initAudio();
 if(streamPlatform==='youtube'){await api('youtube/chat',{stop:false});await status();return;}
 if(!['twitch','tiktok'].includes(streamPlatform))return;
 chatSettingsPlatform=streamPlatform;$('chatSettingsTitle').textContent=platformName(streamPlatform)+' chat';
 $('chatSettingsHint').textContent=streamPlatform==='twitch'?'Enter the Twitch channel name. The studio reads public chat without posting; no stream key or Google sign-in is required.':'Enter the username of a TikTok account that is LIVE. Reading comments does not use the broadcast stream key.';
 $('tiktokChatOptions').hidden=streamPlatform!=='tiktok';$('chatSetupFeedback').textContent='';
 $('chatChannel').value=localStorage.getItem('nara-chat-'+streamPlatform)||'';$('chatSettings').showModal();
});
bind('quickCapture',()=>$('captureBtn').click());bind('quickAI',()=>$('settingsBtn').click());bind('quickChat',()=>$('chatBtn').click());
bind('closeChatSettings',()=>$('chatSettings').close());
$('chatSettingsForm').onsubmit=async e=>{e.preventDefault();$('startChatBtn').disabled=true;try{
 await initAudio();const channel=$('chatChannel').value;
 const d=await api('chat/connect',{platform:chatSettingsPlatform,channel});
 localStorage.setItem('nara-chat-'+chatSettingsPlatform,d.channel);$('chatSettings').close();await status();
 }catch(e){$('chatSetupFeedback').textContent=e.message;}finally{$('startChatBtn').disabled=false;}};
$('autoReply').onchange=async()=>{if($('autoReply').checked){try{await initAudio();}catch(e){$('autoReply').checked=false;toast(e.message);}}};
function clearReplies(){generation++;queue=[];voiceSource?.stop();voiceResolve?.();if(busy)void api('ai/pause',{}).catch(()=>{});updateQueue();}

function message(row){const list=$('messages');list.querySelector('.emptychat')?.remove();const el=document.createElement('div');el.className='message'+(row.source==='ai'?' ai':'');const meta=document.createElement('div');meta.className='meta';const name=document.createElement('b');name.textContent=row.author;const label=document.createElement('small');label.textContent=['youtube','twitch','tiktok'].includes(row.source)?row.source.toUpperCase()+(row.historical?' · HISTORY':''):row.source==='ai'?'AI CO-HOST':'SIMULATION';meta.append(name,label);const p=document.createElement('p');p.textContent=row.text;el.append(meta,p);if(row.source!=='ai'){const b=document.createElement('button');b.textContent='Reply with AI';b.onclick=async()=>{try{await initAudio();enqueue(row);}catch(e){toast(e.message);}};el.append(b);}list.append(el);while(list.children.length>150)list.firstElementChild.remove();list.scrollTop=list.scrollHeight;}
const queuedIds=new Set();function enqueue(row){if(paused){toast('AI is paused. Click Resume AI first.');return;}if(queuedIds.has(row.id))return;if(queue.length>=10){toast('The queue is full (10 comments).');return;}queuedIds.add(row.id);if(queuedIds.size>2000)queuedIds.delete(queuedIds.values().next().value);queue.push(row);updateQueue();}
function updateQueue(){$('queueStatus').textContent=`${queue.length} queued · ${responseCount} replies`;}
async function speak(text,gen){
 await initAudio();const r=await fetch('/api/voice',{method:'POST',headers:{'Content-Type':'application/json','x-studio-token':token},body:JSON.stringify({text})});if(!r.ok)throw Error((await r.json()).error);
 const buffer=await audioContext.decodeAudioData(await r.arrayBuffer());if(gen!==generation)return;
 await new Promise(resolve=>{voiceResolve=resolve;voiceSource=audioContext.createBufferSource();voiceSource.buffer=buffer;voiceSource.connect(aiGain);voiceSource.onended=()=>{voiceSource=null;voiceResolve=null;resolve();};voiceSource.start();});
}
async function consume(){
 if(busy||paused||!queue.length||Date.now()-lastReply<Number($('cooldown').value)*1000)return;
 if(responseCount>=Number($('responseLimit').value)){pauseAI();toast('Reply limit reached. Change the limit in Settings.');return;}
 busy=true;const gen=generation,row=queue.shift();updateQueue();$('aiStatus').textContent='Thinking of a reply…';
 try{const d=await api('ai/reply',row);if(gen!==generation)return;responseCount++;message({author:'Nara',text:d.text,source:'ai'});$('aiStatus').textContent='Speaking…';await speak(d.text,gen);}catch(e){if(gen===generation){toast(e.message);$('autoReply').checked=false;queue=[];}}finally{busy=false;lastReply=Date.now();updateQueue();$('aiStatus').textContent=paused?'Paused':'Ready to listen to chat';}
}setInterval(consume,500);
function pauseAI(){paused=true;generation++;queue=[];voiceSource?.stop();voiceResolve?.();void api('ai/pause',{}).catch(()=>{});$('pauseBtn').textContent='Resume AI';$('aiStatus').textContent='Paused';updateQueue();}
bind('pauseBtn',()=>{if(paused){paused=false;$('pauseBtn').textContent='Pause AI';$('aiStatus').textContent='Ready to listen to chat';}else pauseAI();});
async function testVoice(){if(busy)throw Error('Wait for the current voice request to finish.');busy=true;const gen=generation;$('aiStatus').textContent='Testing local speech…';try{await speak('Hello, I am Nara. Welcome to our stream.',gen);}finally{busy=false;$('aiStatus').textContent=paused?'Paused':'Voice test complete';}}
bind('voiceTestBtn',testVoice);
$('testForm').onsubmit=async e=>{e.preventDefault();const value=$('testText').value.trim();if(!value)return;await initAudio();const row={id:crypto.randomUUID(),author:'You',text:value,source:'simulation'};message(row);$('testText').value='';if($('autoReply').checked)enqueue(row);};
const events=new EventSource('/api/events?token='+token);events.onmessage=e=>{const {type,data}=JSON.parse(e.data);if(type==='platform'){streamPlatform=data;clearReplies();selected=null;void status();}if(type==='chat-state'){if(data.status!=='connected')clearReplies();void status();}if(type==='chat'&&data.source===streamPlatform){message(data);if($('autoReply').checked&&!data.historical)enqueue(data);}if(type==='voice')showEngine(data);if(type==='notice')toast(data);if(type==='login-error'){$('googleLoginMessage').textContent=data;toast(data);}if(type==='connected'){selected=null;googleLoginUrl='';$('googleLoginProgress').close();toast('YouTube connected: '+data);void status();}if(type==='encoder'){$('streamStatus').textContent=data==='sending'?'Sending media · check status on '+platformName(streamPlatform):data==='starting'?'Starting encoder…':'Encoder stopped';if(data==='idle'&&recorder)stopStream();}};
function stopStream(){if(recorder&&recorder.state!=='inactive')recorder.stop();recorder=null;if(socket){socket.close();socket=null;}$('sendBtn').textContent='Send to '+platformName(streamPlatform)+' ↗';$('recordTag').textContent='OFFLINE';void api('stream/stop',{}).catch(()=>{});}
bind('sendBtn',async()=>{
 if(recorder){stopStream();return;}
 const s=await api('status');streamPlatform=s.platform;if(!s.streamReady)throw Error('Click Set stream key for '+platformName(s.platform)+(s.platform==='youtube'?' or select a YouTube broadcast.':'.')); 
 if(!confirm(streamConfirmation(s)))return;
 await initAudio();const ws=new WebSocket(`ws://localhost:${location.port}/media?token=${token}`);socket=ws;
 ws.onmessage=e=>{const d=JSON.parse(e.data);if(d.error){toast(d.error);return;}if(d.ready){recorder=new MediaRecorder(composition(),{mimeType:mime(),videoBitsPerSecond:3500000,audioBitsPerSecond:128000});recorder.ondataavailable=async ev=>{if(ws.readyState!==WebSocket.OPEN||!ev.data.size)return;if(ws.bufferedAmount>8*1024*1024){toast('Connection falling behind; encoder stopped.');stopStream();return;}ws.send(await ev.data.arrayBuffer());};recorder.onerror=()=>{toast('MediaRecorder failed.');stopStream();};recorder.start(500);startAt=Date.now();$('sendBtn').textContent='Stop encoder';$('recordTag').textContent='ENCODING';}};
 ws.onclose=()=>{if(socket===ws)stopStream();};ws.onerror=()=>toast('Encoder connection failed.');
});
bind('recordBtn',async()=>{
 if(localRecorder&&localRecorder.state!=='inactive'){localRecorder.stop();return;}await initAudio();recordChunks=[];localRecorder=new MediaRecorder(composition(),{mimeType:mime(),videoBitsPerSecond:3500000});
 localRecorder.ondataavailable=e=>{if(e.data.size)recordChunks.push(e.data);};localRecorder.onstop=()=>{const url=URL.createObjectURL(new Blob(recordChunks,{type:'video/webm'})),a=document.createElement('a');a.href=url;a.download=`nara-rehearsal-${new Date().toISOString().replace(/[:.]/g,'-')}.webm`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);recordChunks=[];localRecorder=null;$('recordBtn').textContent='● Record locally';toast('Local recording downloaded.');};localRecorder.start(1000);$('recordBtn').textContent='■ Stop recording';toast('Local recordings are limited to 5 minutes and saved automatically to limit RAM use.');setTimeout(()=>{if(localRecorder?.state==='recording')localRecorder.stop();},300000);
});
bind('goLiveBtn',async()=>{if(!confirm('Start the selected YouTube broadcast now?'))return;const d=await api('youtube/live',{});toast(d.message||'Status YouTube: '+d.lifeCycleStatus);});
bind('endBtn',async()=>{if(!confirm('End the selected YouTube broadcast? It cannot be resumed once ended.'))return;await api('youtube/end',{});stopStream();toast('YouTube broadcast ended.');});
async function status(){
 const s=await api('status');streamPlatform=s.platform;renderPlatform(s,!!recorder);
 $('connection').textContent=s.platform==='youtube'&&s.youtubeReady?'● '+(s.channel||'YouTube connected'):'● '+platformName(s.platform)+' · Localhost';
 if(!busy&&!paused)$('aiStatus').textContent=s.aiReady?'Ready to listen to chat':'Add an API key to get started';
 $('stats').textContent=`720p · ${voiceState.provider==='omnivoice'?'OmniVoice':'Windows speech'} · ${s.bytes?Math.round(s.bytes/1024/1024)+' MB sent':s.streamReady?'Destination: '+platformName(s.platform)+' saved':'No streaming destination'}`;
 chatConnected=s.chat;chatPhase=s.chatInfo?.status||'idle';
 $('aiReadyDot').dataset.ready=String(s.aiReady);$('captureStep').textContent=screen?'Capture source active':'Add a capture source';$('aiStep').textContent=s.aiReady?'AI ready · adjust model & persona':'Add your AI API key';$('chatStep').textContent=s.chat?platformName(s.platform)+' chat connected':chatPhase==='waiting'?'Continue in the TikTok window':'Connect '+platformName(s.platform)+' chat';
 $('quickCapture').dataset.ready=String(!!screen);$('quickAI').dataset.ready=String(s.aiReady);$('quickChat').dataset.ready=String(s.chat);
}

setInterval(()=>{if(recorder)$('elapsed').textContent=new Date(Date.now()-startAt).toISOString().slice(11,19);void status().catch(()=>{});},5000);await status();
window.addEventListener('beforeunload',e=>{if(recorder||localRecorder){e.preventDefault();e.returnValue='';}});

await initHostControls({api,token,toast,speakTest:testVoice});

