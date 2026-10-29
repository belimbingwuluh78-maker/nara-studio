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
 if(!recording)$('sendBtn').textContent='Kirim ke '+platformName(s.platform)+' ↗';
 const supported=['youtube','twitch','tiktok'].includes(s.platform),info=s.chatInfo;
 const active=info?.platform===s.platform?info:null,phase=active?.status||'idle';
 $('chatBtn').disabled=!supported;$('quickChat').disabled=!supported;$('chatBadge').dataset.state=phase;$('chatConnectionStatus').dataset.state=phase;
 $('chatBtn').textContent=['connecting','waiting'].includes(phase)?'Batalkan koneksi':s.chat?'Putus chat':'Hubungkan chat';
 $('chatBadge').textContent=phase==='connecting'?'Menghubungkan…':phase==='waiting'?'Periksa browser':s.chat?'Membaca '+name:supported?'Terputus':'Chat belum tersedia';
 $('chatConnectionStatus').textContent=active?.message||(supported?(s.platform==='youtube'?'Pilih siaran lalu hubungkan chat.':`Hubungkan username ${name} untuk membaca komentar${s.platform==='tiktok'?' (eksperimental)':''}.`):'Konektor chat untuk platform ini belum tersedia.');
 $('chatHelp')?.replaceChildren(document.createTextNode(supported?`Komentar ${name} muncul setelah chat tersambung. Aktifkan Balas otomatis untuk jawaban suara avatar.`:`Komentar ${name} belum terhubung; gunakan simulasi untuk mencoba AI.`));
 $('broadcastBtn').disabled=!s.youtubeReady;
 $('goLiveBtn').disabled=!s.broadcast;$('endBtn').disabled=!s.broadcast;
 $('youtubeStatus').textContent=manual?(s.streamReady?`Tujuan ${name} tersimpan · belum berarti siaran sudah live.`:s.platform==='custom'?'Masukkan Server URL dan Stream Key dari penyedia siaranmu.':`Masukkan Server URL dan Stream Key dari akun ${name} kamu.`):
 s.broadcast?`${s.broadcast.title} · ${s.broadcast.privacy} · ${s.broadcast.status}${s.broadcast.autoStart?' · AUTO-START AKTIF':''}`:
 s.streamReady?'Tujuan manual tersimpan · verifikasi siaran di YouTube.':s.youtubeReady?'Terhubung: '+s.channel+' · Pilih siaran untuk melanjutkan.':s.googleLoginConfigured?'Siap login. Pilih akun Google pemilik channel YouTube.':'Aktivasi Google diperlukan untuk login. Stream key manual juga tersedia.';
}

