import {streamPlatforms,platformName} from './stream-platforms.js';
export {platformName} from './stream-platforms.js';
export function initPlatformPicker(){
 const picker=document.getElementById('streamPlatform');
 picker.replaceChildren(...Object.entries(streamPlatforms).map(([id,p])=>new Option(p.label,id)));
}
export function renderPlatform(s,recording){
 const $=id=>document.getElementById(id),manual=s.platform!=='youtube',p=streamPlatforms[s.platform],name=platformName(s.platform);
 $('streamPlatform').value=s.platform;$('streamPlatform').disabled=s.encoder!=='idle'||recording;
 for(const id of ['connectBtn','googleSetupBtn','broadcastBtn','goLiveBtn','endBtn'])$(id).hidden=manual;
 $('streamSettingsBtn').disabled=s.encoder!=='idle'||recording;
 $('platformLogo').textContent=p.icon;$('platformLogo').dataset.platform=s.platform;
 if(!recording)$('sendBtn').textContent='Send to '+platformName(s.platform)+' ↗';
 const supported=['youtube','twitch','tiktok'].includes(s.platform),info=s.chatInfo;
 const active=info?.platform===s.platform?info:null,phase=active?.status||'idle';
 $('chatBtn').disabled=!supported;$('quickChat').disabled=!supported;$('chatBadge').dataset.state=phase;$('chatConnectionStatus').dataset.state=phase;
 $('chatBtn').textContent=['connecting','waiting'].includes(phase)?'Cancel connection':s.chat?'Disconnect chat':'Connect chat';
 $('chatBadge').textContent=phase==='connecting'?'Connecting…':phase==='waiting'?'Check browser':s.chat?'Reading '+name:supported?'Disconnected':'Chat unavailable';
 $('chatConnectionStatus').textContent=active?.message||(supported?(s.platform==='youtube'?'Select a broadcast, then connect chat.':`Connect a ${name} username to read comments${s.platform==='tiktok'?' (experimental)':''}.`):'A chat connector for this platform is not available yet.');
 $('chatHelp')?.replaceChildren(document.createTextNode(supported?`${name} comments appear after chat connects. Enable Auto-reply for spoken avatar replies.`:`${name} chat is not connected; try the AI with a simulated comment.`));
 $('broadcastBtn').disabled=!s.youtubeReady;
 $('goLiveBtn').disabled=!s.broadcast;$('endBtn').disabled=!s.broadcast;
 $('youtubeStatus').textContent=manual?(s.streamReady?`${name} destination saved · this does not mean the broadcast is live.`:s.platform==='custom'?'Enter the server URL and stream key from your streaming provider.':`Enter the server URL and stream key from your ${name} account.`):
 s.broadcast?`${s.broadcast.title} · ${s.broadcast.privacy} · ${s.broadcast.status}${s.broadcast.autoStart?' · AUTO-START ENABLED':''}`:
 s.streamReady?'Manual destination saved · check the broadcast on YouTube.':s.youtubeReady?'Connected: '+s.channel+' · Select a broadcast to continue.':s.googleLoginConfigured?'Ready to sign in. Choose the Google account that owns your YouTube channel.':'Set up Google to sign in. You can also use a stream key manually.';
}

