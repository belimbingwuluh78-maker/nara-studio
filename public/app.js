import {platformName,renderPlatform,initPlatformPicker} from './stream-controls.js';
import {streamPlatforms,streamConfirmation} from './stream-platforms.js';
import {hostState,voiceState,avatarRect,drawPNG,initHostControls,showEngine} from './host-controls.js';
const $=id=>document.getElementById(id);
const boot=await fetch('/api/bootstrap').then(r=>r.json());
const token=boot.token,canvas=$('stage'),ctx=canvas.getContext('2d');
let scene='game',screen=null,camera=null,mic=null,audioContext,destination,gameGain,micGain,aiGain,analyser,voiceSource,voiceResolve;
let screenVideo=document.createElement('video'),camVideo=document.createElement('video');
for(const v of [screenVideo,camVideo]){v.muted=true;v.playsInline=true;}
let recorder=null,localRecorder=null,socket=null,output=null,recordChunks=[],startAt=0,queue=[],busy=false,paused=false,generation=0,lastReply=0,responseCount=0,chatConnected=false,selected=null,avatarLevel=0;
let toastTimer,streamPlatform=boot.state.platform||'youtube',settingsPlatform=streamPlatform,chatSettingsPlatform=streamPlatform,chatPhase='idle';
function toast(s){$('toast').textContent=s;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',6500);}
async function api(path,body){const r=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',headers:{'x-studio-token':token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});const d=await r.json();if(!r.ok)throw Error(d.error||'Permintaan gagal');return d;}
function bind(id,fn){$(id).addEventListener('click',async()=>{try{await fn();}catch(e){toast(e.message);}});}
async function initAudio(){
 if(audioContext){await audioContext.resume();return;}
 audioContext=new AudioContext();destination=audioContext.createMediaStreamDestination();gameGain=audioContext.createGain();micGain=audioContext.createGain();aiGain=audioContext.createGain();analyser=audioContext.createAnalyser();analyser.fftSize=256;
 gameGain.connect(destination);micGain.connect(destination);aiGain.connect(analyser);analyser.connect(destination);aiGain.connect(audioContext.destination);
 // A silent track keeps the outgoing media format stable even before a mic is enabled.
 const osc=audioContext.createOscillator(),silent=audioContext.createGain();silent.gain.value=0;osc.connect(silent).connect(destination);osc.start();
 for(const [id,gain] of [['gameVolume',gameGain],['micVolume',micGain],['aiVolume',aiGain]]){gain.gain.value=Number($(id).value);$(id).oninput=()=>gain.gain.value=Number($(id).value);}
}
function composition(){if(!output){output=canvas.captureStream(30);for(const t of destination.stream.getAudioTracks())output.addTrack(t);}return output;}
function mime(){for(const s of ['video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus'])if(MediaRecorder.isTypeSupported(s))return s;throw Error('Gunakan Chrome atau Edge terbaru yang mendukung WebM/Opus.');}
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
 if(scene==='game'&&!screen){text('YOUR NEXT GREAT STREAM',76,265,17,'#ab9dcd',650);text('Let’s go live.',72,340,68,'#eef0fa',700);text('Pilih game atau layar untuk memulai.',76,389,24,'#99a8be');round(76,428,285,48,24,'#252d43');text('GAMEPLAY  +  AI CO-HOST',96,459,15,'#bcace8',600);}
 if(scene==='host'){text('JUST CHATTING',75,165,19,'#b3a3d4');text('Hey, chat.',72,235,64,'#f0edff',700);text('Nara siap menemani live kamu.',77,280,23,'#a9b3cc');}
 if(scene==='break'){text('WE’LL BE RIGHT BACK',80,277,20,'#bba5e7');text('Istirahat sebentar.',76,356,64,'#f0edff',700);text('Tetap di sini. Kita lanjut sebentar lagi.',80,409,24,'#b0b6cf');}
 if(analyser){const values=new Uint8Array(analyser.fftSize);analyser.getByteTimeDomainData(values);avatarLevel=Math.sqrt(values.reduce((a,v)=>a+((v-128)/128)**2,0)/values.length)*4;}
 if($('avatarEnabled').checked&&scene!=='break'){if(hostState.kind!=='png'||!hostState.images.idle||!drawPNG(ctx,avatarLevel,t)){const r=avatarRect(340,360);avatar(r.x+r.w/2,r.y+r.h/2,r.scale,t);}}
 if(camera&&scene!=='break'){round(25,463,272,194,15,'#a894ff');fit(camVideo,29,467,264,186);}
 round(25,674,1230,30,8,'#0b101ace');text('NARA  /  AI CO-HOST',40,695,12,'#c8b7f2',650);text('Suara & avatar AI',1080,695,12,'#a9b6cc');
 requestAnimationFrame(draw);
}requestAnimationFrame(draw);
bind('captureBtn',async()=>{await initAudio();const s=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:30,width:1280,height:720},audio:true});screen?.getTracks().forEach(t=>t.stop());screen=s;screenVideo.srcObject=s;await screenVideo.play();if(s.getAudioTracks().length)audioContext.createMediaStreamSource(s).connect(gameGain);$('screenStatus').textContent=s.getVideoTracks()[0].label+(s.getAudioTracks().length?' · audio aktif':' · tanpa audio');s.getVideoTracks()[0].onended=()=>{if(screen===s){screen=null;$('screenStatus').textContent='Capture berhenti';if(recorder)stopStream();}};});
bind('cameraBtn',async()=>{if(camera){camera.getTracks().forEach(t=>t.stop());camera=null;$('cameraBtn').textContent='Aktifkan';$('camStatus').textContent='Tidak aktif';return;}camera=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480},audio:false});camVideo.srcObject=camera;await camVideo.play();$('cameraBtn').textContent='Matikan';$('camStatus').textContent='Aktif';});
bind('micBtn',async()=>{await initAudio();if(mic){mic.getTracks().forEach(t=>t.stop());mic=null;$('micBtn').textContent='Aktifkan mic';return;}mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});audioContext.createMediaStreamSource(mic).connect(micGain);$('micBtn').textContent='Matikan mic';});
for(const b of document.querySelectorAll('[data-scene]'))b.onclick=()=>{scene=b.dataset.scene;document.querySelectorAll('[data-scene]').forEach(x=>x.classList.toggle('selected',x===b));};
function settings(){$('settings').showModal();}bind('settingsBtn',settings);bind('settingsNav',settings);bind('studioNav',()=>$('stage').scrollIntoView({behavior:'smooth'}));bind('closeSettings',()=>$('settings').close());
$('provider').onchange=()=>{$('model').value=boot.providers[$('provider').value].model;$('aiKey').value='';};
$('settingsForm').onsubmit=async e=>{e.preventDefault();try{const body={};for(const id of ['provider','model','aiKey','persona','encoder'])body[id]=$(id).value;await api('config',body);$('aiKey').value='';$('settings').close();toast('Pengaturan tersimpan selama server ini berjalan.');await status();}catch(e){toast(e.message);}};
initPlatformPicker();
$('streamPlatform').onchange=async()=>{
 const next=$('streamPlatform').value;$('streamPlatform').disabled=true;
 try{await api('stream/platform',{platform:next});streamPlatform=next;selected=null;queue=[];updateQueue();toast('Platform '+platformName(next)+' dipilih. Masukkan tujuan siaran untuk platform ini.');}
 catch(e){toast(e.message);}finally{await status();}
};
bind('streamSettingsBtn',async()=>{
 const d=await api('stream/settings');settingsPlatform=d.platform;
 $('streamSettingsTitle').textContent='Koneksi '+platformName(d.platform);
 const p=streamPlatforms[d.platform];$('streamSettingsHint').textContent=p.help;
 $('streamDashboard').hidden=!p.dashboard;if(p.dashboard){$('streamDashboard').href=p.dashboard;$('streamDashboard').textContent='Buka '+platformName(d.platform)+' ↗';}else{$('streamDashboard').removeAttribute('href');}
 $('server').value=d.server;$('streamKey').value='';$('streamKey').required=!d.keySaved;
 $('streamKeyHint').textContent=d.keySaved?'Key sudah tersimpan. Kosongkan untuk mempertahankannya jika server tetap sama.':'Tempel key lengkap, termasuk parameter tambahan jika ada.';
 $('streamSettings').showModal();
});
bind('closeStreamSettings',()=>$('streamSettings').close());
$('streamSettingsForm').onsubmit=async e=>{e.preventDefault();try{await api('stream/settings',{platform:settingsPlatform,server:$('server').value,streamKey:$('streamKey').value});$('streamKey').value='';selected=null;$('streamSettings').close();toast('Tujuan '+platformName(settingsPlatform)+' tersimpan. Belum mengirim siaran.');await status();}catch(e){toast(e.message);}};
let googleLoginUrl='';
async function googleSetup(){
 const s=await api('youtube/setup');$('googleRedirect').value=s.redirectUri;
 $('googleSetupStatus').textContent=s.configured?'Konfigurasi Google sudah aktif. Kamu bisa login sekarang.':'Aktivasi Google diperlukan satu kali untuk studio milikmu.';
 $('setupGoogleLogin').hidden=!s.configured;if(!$('loginInfo').open)$('loginInfo').showModal();
}
async function googleLogin(){
 const s=await api('status');if(!s.googleLoginConfigured){await googleSetup();return;}
 $('loginInfo').close();$('googleLoginMessage').textContent='Membuka browser utama…';googleLoginUrl='';$('copyGoogleLogin').disabled=true;
 if(!$('googleLoginProgress').open)$('googleLoginProgress').showModal();
 $('connectBtn').disabled=true;
 try{const d=await api('youtube/auth',{openBrowser:true});googleLoginUrl=d.url;$('copyGoogleLogin').disabled=false;$('googleLoginMessage').textContent=d.opened?'Pilih akun Google dan izinkan akses YouTube di browser yang terbuka.':'Browser belum terbuka. Salin tautan login dan buka di Chrome atau Edge.';}
 catch(e){$('googleLoginMessage').textContent=e.message;throw e;}finally{$('connectBtn').disabled=false;}
}
bind('connectBtn',googleLogin);bind('setupGoogleLogin',googleLogin);bind('googleSetupBtn',googleSetup);
bind('closeGoogleProgress',()=>$('googleLoginProgress').close());
bind('copyGoogleLogin',async()=>{if(googleLoginUrl){await navigator.clipboard.writeText(googleLoginUrl);toast('Tautan disalin. Tempel di bilah alamat Chrome atau Edge.');}});
bind('copyGoogleRedirect',async()=>{await navigator.clipboard.writeText($('googleRedirect').value);toast('Alamat kembali disalin.');});
bind('importGoogleClient',async()=>{
 const file=$('googleClientFile').files[0];if(!file)throw Error('Pilih file JSON dari Google Cloud dahulu.');
 if(file.size>30000)throw Error('File terlalu besar. Pilih JSON konfigurasi client Google.');
 $('importGoogleClient').disabled=true;
 try{let data;try{data=JSON.parse(await file.text());}catch{throw Error('File bukan JSON yang valid. Unduh ulang konfigurasi dari Google Cloud.');}
 await api('youtube/setup',data);$('googleClientFile').value='';$('googleSetupFeedback').textContent='Aktivasi tersimpan. Klik Login dengan Google di bawah.';await googleSetup();await status();}
 catch(e){$('googleSetupFeedback').textContent=e.message;}finally{$('importGoogleClient').disabled=false;}
});
bind('closeLoginInfo',()=>$('loginInfo').close());
bind('broadcastBtn',async()=>{$('broadcastDialog').showModal();$('broadcastList').textContent='Memuat siaran…';try{const d=await api('youtube/broadcasts');$('broadcastList').replaceChildren();if(!d.items.length)$('broadcastList').textContent='Belum ada siaran. Buat siaran encoder di YouTube Studio.';for(const b of d.items){const el=document.createElement('button');el.textContent=`${b.title} · ${b.privacy} · ${b.status}`;el.onclick=async()=>{try{selected=await api('youtube/select',{id:b.id});$('youtubeStatus').textContent=`${selected.title} · ${selected.privacy} · ${selected.status}${selected.autoStart?' · AUTO-START AKTIF':''}`;$('broadcastDialog').close();toast('Siaran dipilih. Stream key tersimpan di server.');}catch(e){toast(e.message);}};$('broadcastList').append(el);}}catch(e){$('broadcastList').textContent=e.message;}});
bind('closeBroadcast',()=>$('broadcastDialog').close());
bind('chatBtn',async()=>{
 if(chatConnected||['connecting','waiting'].includes(chatPhase)){await api('chat/stop',{});await status();return;}
 await initAudio();
 if(streamPlatform==='youtube'){await api('youtube/chat',{stop:false});await status();return;}
 if(!['twitch','tiktok'].includes(streamPlatform))return;
 chatSettingsPlatform=streamPlatform;$('chatSettingsTitle').textContent='Chat '+platformName(streamPlatform);
 $('chatSettingsHint').textContent=streamPlatform==='twitch'?'Masukkan nama channel Twitch. Studio membaca chat publik secara baca-saja; tidak perlu stream key atau login Google.':'Masukkan username akun TikTok yang sedang LIVE. Stream key siaran tidak dipakai untuk membaca komentar.';
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

function message(row){const list=$('messages');list.querySelector('.emptychat')?.remove();const el=document.createElement('div');el.className='message'+(row.source==='ai'?' ai':'');const meta=document.createElement('div');meta.className='meta';const name=document.createElement('b');name.textContent=row.author;const label=document.createElement('small');label.textContent=['youtube','twitch','tiktok'].includes(row.source)?row.source.toUpperCase()+(row.historical?' · RIWAYAT':''):row.source==='ai'?'AI CO-HOST':'SIMULASI';meta.append(name,label);const p=document.createElement('p');p.textContent=row.text;el.append(meta,p);if(row.source!=='ai'){const b=document.createElement('button');b.textContent='Balas dengan AI';b.onclick=async()=>{try{await initAudio();enqueue(row);}catch(e){toast(e.message);}};el.append(b);}list.append(el);while(list.children.length>150)list.firstElementChild.remove();list.scrollTop=list.scrollHeight;}
const queuedIds=new Set();function enqueue(row){if(paused){toast('AI dijeda. Klik Lanjut AI dahulu.');return;}if(queuedIds.has(row.id))return;if(queue.length>=10){toast('Antrean penuh (10 komentar).');return;}queuedIds.add(row.id);if(queuedIds.size>2000)queuedIds.delete(queuedIds.values().next().value);queue.push(row);updateQueue();}
function updateQueue(){$('queueStatus').textContent=`${queue.length} dalam antrean · ${responseCount} respons`;}
async function speak(text,gen){
 await initAudio();const r=await fetch('/api/voice',{method:'POST',headers:{'Content-Type':'application/json','x-studio-token':token},body:JSON.stringify({text})});if(!r.ok)throw Error((await r.json()).error);
 const buffer=await audioContext.decodeAudioData(await r.arrayBuffer());if(gen!==generation)return;
 await new Promise(resolve=>{voiceResolve=resolve;voiceSource=audioContext.createBufferSource();voiceSource.buffer=buffer;voiceSource.connect(aiGain);voiceSource.onended=()=>{voiceSource=null;voiceResolve=null;resolve();};voiceSource.start();});
}
async function consume(){
 if(busy||paused||!queue.length||Date.now()-lastReply<Number($('cooldown').value)*1000)return;
 if(responseCount>=Number($('responseLimit').value)){pauseAI();toast('Batas jumlah respons tercapai. Ubah batas di Pengaturan.');return;}
 busy=true;const gen=generation,row=queue.shift();updateQueue();$('aiStatus').textContent='Memikirkan jawaban…';
 try{const d=await api('ai/reply',row);if(gen!==generation)return;responseCount++;message({author:'Nara',text:d.text,source:'ai'});$('aiStatus').textContent='Sedang berbicara…';await speak(d.text,gen);}catch(e){if(gen===generation){toast(e.message);$('autoReply').checked=false;queue=[];}}finally{busy=false;lastReply=Date.now();updateQueue();$('aiStatus').textContent=paused?'Dijeda':'Siap mendengarkan chat';}
}setInterval(consume,500);
function pauseAI(){paused=true;generation++;queue=[];voiceSource?.stop();voiceResolve?.();void api('ai/pause',{}).catch(()=>{});$('pauseBtn').textContent='Lanjut AI';$('aiStatus').textContent='Dijeda';updateQueue();}
bind('pauseBtn',()=>{if(paused){paused=false;$('pauseBtn').textContent='Jeda AI';$('aiStatus').textContent='Siap mendengarkan chat';}else pauseAI();});
async function testVoice(){if(busy)throw Error('Tunggu suara yang sedang diproses.');busy=true;const gen=generation;$('aiStatus').textContent='Tes suara lokal…';try{await speak('Halo, saya Nara. Selamat datang di live kita.',gen);}finally{busy=false;$('aiStatus').textContent=paused?'Dijeda':'Tes suara selesai';}}
bind('voiceTestBtn',testVoice);
$('testForm').onsubmit=async e=>{e.preventDefault();const value=$('testText').value.trim();if(!value)return;await initAudio();const row={id:crypto.randomUUID(),author:'Kamu',text:value,source:'simulation'};message(row);$('testText').value='';if($('autoReply').checked)enqueue(row);};
const events=new EventSource('/api/events?token='+token);events.onmessage=e=>{const {type,data}=JSON.parse(e.data);if(type==='platform'){streamPlatform=data;clearReplies();selected=null;void status();}if(type==='chat-state'){if(data.status!=='connected')clearReplies();void status();}if(type==='chat'&&data.source===streamPlatform){message(data);if($('autoReply').checked&&!data.historical)enqueue(data);}if(type==='voice')showEngine(data);if(type==='notice')toast(data);if(type==='login-error'){$('googleLoginMessage').textContent=data;toast(data);}if(type==='connected'){selected=null;googleLoginUrl='';$('googleLoginProgress').close();toast('YouTube terhubung: '+data);void status();}if(type==='encoder'){$('streamStatus').textContent=data==='sending'?'Mengirim media · verifikasi status di '+platformName(streamPlatform):data==='starting'?'Menyiapkan encoder…':'Encoder berhenti';if(data==='idle'&&recorder)stopStream();}};
function stopStream(){if(recorder&&recorder.state!=='inactive')recorder.stop();recorder=null;if(socket){socket.close();socket=null;}$('sendBtn').textContent='Kirim ke '+platformName(streamPlatform)+' ↗';$('recordTag').textContent='OFFLINE';void api('stream/stop',{}).catch(()=>{});}
bind('sendBtn',async()=>{
 if(recorder){stopStream();return;}
 const s=await api('status');streamPlatform=s.platform;if(!s.streamReady)throw Error('Klik Atur stream key untuk '+platformName(s.platform)+(s.platform==='youtube'?' atau pilih siaran YouTube.':'.')); 
 if(!confirm(streamConfirmation(s)))return;
 await initAudio();const ws=new WebSocket(`ws://localhost:${location.port}/media?token=${token}`);socket=ws;
 ws.onmessage=e=>{const d=JSON.parse(e.data);if(d.error){toast(d.error);return;}if(d.ready){recorder=new MediaRecorder(composition(),{mimeType:mime(),videoBitsPerSecond:3500000,audioBitsPerSecond:128000});recorder.ondataavailable=async ev=>{if(ws.readyState!==WebSocket.OPEN||!ev.data.size)return;if(ws.bufferedAmount>8*1024*1024){toast('Koneksi tertinggal; encoder dihentikan.');stopStream();return;}ws.send(await ev.data.arrayBuffer());};recorder.onerror=()=>{toast('MediaRecorder gagal.');stopStream();};recorder.start(500);startAt=Date.now();$('sendBtn').textContent='Hentikan encoder';$('recordTag').textContent='ENCODING';}};
 ws.onclose=()=>{if(socket===ws)stopStream();};ws.onerror=()=>toast('Koneksi encoder gagal.');
});
bind('recordBtn',async()=>{
 if(localRecorder&&localRecorder.state!=='inactive'){localRecorder.stop();return;}await initAudio();recordChunks=[];localRecorder=new MediaRecorder(composition(),{mimeType:mime(),videoBitsPerSecond:3500000});
 localRecorder.ondataavailable=e=>{if(e.data.size)recordChunks.push(e.data);};localRecorder.onstop=()=>{const url=URL.createObjectURL(new Blob(recordChunks,{type:'video/webm'})),a=document.createElement('a');a.href=url;a.download=`nara-rehearsal-${new Date().toISOString().replace(/[:.]/g,'-')}.webm`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);recordChunks=[];localRecorder=null;$('recordBtn').textContent='● Rekam lokal';toast('Rekaman lokal diunduh.');};localRecorder.start(1000);$('recordBtn').textContent='■ Selesai rekam';toast('Rekaman lokal maksimal 5 menit; otomatis disimpan untuk membatasi RAM.');setTimeout(()=>{if(localRecorder?.state==='recording')localRecorder.stop();},300000);
});
bind('goLiveBtn',async()=>{if(!confirm('Mulai menayangkan siaran YouTube yang dipilih sekarang?'))return;const d=await api('youtube/live',{});toast(d.message||'Status YouTube: '+d.lifeCycleStatus);});
bind('endBtn',async()=>{if(!confirm('Akhiri siaran YouTube yang dipilih? Siaran ini tidak dapat dilanjutkan setelah selesai.'))return;await api('youtube/end',{});stopStream();toast('Siaran YouTube diakhiri.');});
async function status(){
 const s=await api('status');streamPlatform=s.platform;renderPlatform(s,!!recorder);
 $('connection').textContent=s.platform==='youtube'&&s.youtubeReady?'● '+(s.channel||'YouTube terhubung'):'● '+platformName(s.platform)+' · Localhost';
 if(!busy&&!paused)$('aiStatus').textContent=s.aiReady?'Siap mendengarkan chat':'Siapkan API key untuk mulai';
 $('stats').textContent=`720p · ${voiceState.provider==='omnivoice'?'OmniVoice':'Suara Windows'} · ${s.bytes?Math.round(s.bytes/1024/1024)+' MB terkirim':s.streamReady?'Tujuan '+platformName(s.platform)+' tersimpan':'Belum ada tujuan siaran'}`;
 chatConnected=s.chat;chatPhase=s.chatInfo?.status||'idle';
 $('aiReadyDot').dataset.ready=String(s.aiReady);$('captureStep').textContent=screen?'Sumber gambar aktif':'Tambahkan sumber gambar';$('aiStep').textContent=s.aiReady?'AI siap · atur model & persona':'Tambahkan API key AI';$('chatStep').textContent=s.chat?'Chat '+platformName(s.platform)+' terhubung':chatPhase==='waiting'?'Lanjutkan di jendela TikTok':'Hubungkan chat '+platformName(s.platform);
 $('quickCapture').dataset.ready=String(!!screen);$('quickAI').dataset.ready=String(s.aiReady);$('quickChat').dataset.ready=String(s.chat);
}

setInterval(()=>{if(recorder)$('elapsed').textContent=new Date(Date.now()-startAt).toISOString().slice(11,19);void status().catch(()=>{});},5000);await status();
window.addEventListener('beforeunload',e=>{if(recorder||localRecorder){e.preventDefault();e.returnValue='';}});

await initHostControls({api,token,toast,speakTest:testVoice});

