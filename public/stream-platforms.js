// Shared by server validation and browser controls; no account credentials here.
export const streamPlatforms=Object.freeze({
 youtube:{name:'YouTube',label:'YouTube Live',icon:'▶',defaultServer:'rtmps://a.rtmps.youtube.com/live2',dashboard:'https://studio.youtube.com/',help:'Gunakan Server URL dan Stream Key dari YouTube Studio. Untuk membaca chat, hubungkan akun dan pilih siaran melalui kartu YouTube.'},
 tiktok:{name:'TikTok',label:'TikTok · Stream key',icon:'♪',defaultServer:'',dashboard:'https://www.tiktok.com/',help:'Salin Server URL dan Stream Key yang disediakan TikTok untuk akunmu. Siapkan dan kelola LIVE dari TikTok. Klik Hubungkan chat untuk membaca komentar LIVE (eksperimental).'},
 twitch:{name:'Twitch',label:'Twitch · Stream key',icon:'◈',defaultServer:'rtmp://live.twitch.tv/app',dashboard:'https://dashboard.twitch.tv/',help:'Salin stream key dari dashboard kreator Twitch. Server Twitch sudah diisi dan bisa diganti dengan ingest server pilihanmu. Atur judul dan kategori di Twitch. Klik Hubungkan chat dan isi nama channel untuk membaca komentar.'},
 facebook:{name:'Facebook Live',label:'Facebook Live · Stream key',icon:'f',defaultServer:'',dashboard:'https://www.facebook.com/live/producer/',help:'Buka Facebook Live Producer, pilih sumber software streaming, lalu salin Server URL dan Stream Key sesi tersebut. Periksa preview dan mulai atau akhiri LIVE dari Facebook. Chat Facebook belum terhubung.'},
 kick:{name:'Kick',label:'Kick · Stream key',icon:'K',defaultServer:'',dashboard:'https://dashboard.kick.com/',help:'Di dashboard kreator Kick, buka Channel → Stream URL and Key. Salin kedua nilai tersebut ke sini. Atur judul dan kategori siaran di Kick sebelum mengirim. Chat Kick belum terhubung.'},
 custom:{name:'Custom RTMP',label:'Lainnya · Custom RTMP/RTMPS',icon:'↗',defaultServer:'',dashboard:'',help:'Untuk platform atau server lain yang menerima RTMP/RTMPS, tempel Server URL dan Stream Key dari penyedianya. Studio mengirim video dan audio ke satu tujuan; login, chat, dan pengelolaan LIVE tetap dilakukan di platform tersebut.'}
});
export const isStreamPlatform=id=>typeof id==='string'&&Object.hasOwn(streamPlatforms,id);
export const platformName=id=>streamPlatforms[id]?.name||'Platform';
export function streamConfirmation(s){
 if(s.platform==='youtube'&&s.broadcast?.autoStart)return 'AUTO-START aktif: mengirim video dapat langsung menayangkan siaran YouTube. Lanjutkan?';
 const name=platformName(s.platform);
 return `Kirim video dan audio ke ${name} sekarang? Siaran dapat langsung tayang. Periksa preview dan status LIVE di ${s.platform==='custom'?'platform tujuan':name}.`;
}
