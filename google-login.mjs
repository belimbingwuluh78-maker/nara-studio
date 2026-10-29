import {spawn} from 'node:child_process';

export function googleClient(document,redirectUri){
  const c=document?.web;
  if(!c)throw Error('Pilih file JSON client Google berjenis Web application. File akun layanan atau Desktop app tidak cocok.');
  if(typeof c.client_id!=='string'||!/^[-\w]+\.apps\.googleusercontent\.com$/.test(c.client_id)||typeof c.client_secret!=='string'||!c.client_secret.trim()||c.client_secret.length>500)throw Error('File Google tidak memuat Client ID dan Client Secret yang valid. Unduh ulang dari Google Cloud.');
  if(!Array.isArray(c.redirect_uris)||!c.redirect_uris.includes(redirectUri))throw Error('Alamat kembali belum cocok. Tambahkan '+redirectUri+' pada Authorized redirect URIs, lalu unduh ulang file JSON.');
  return {clientId:c.client_id,clientSecret:c.client_secret};
}

export function googleError(error){
  const s=String(error?.message||error);
  if(/access_denied|Izin YouTube/.test(s))return 'Login dibatalkan atau izin YouTube belum diberikan. Coba lagi dan izinkan akses YouTube. Jika aplikasi masih Testing, tambahkan Gmail kamu sebagai test user di Google Cloud.';
  if(/redirect_uri_mismatch/.test(s))return 'Alamat kembali tidak cocok. Samakan Authorized redirect URIs di Google Cloud dengan alamat yang ditampilkan di Aktivasi Google.';
  if(/invalid_client|deleted_client/.test(s))return 'Konfigurasi aplikasi Google ditolak. Unduh file JSON client terbaru lalu impor melalui Aktivasi Google.';
  if(/accessNotConfigured|SERVICE_DISABLED|has not been used|is disabled/.test(s))return 'Aktifkan YouTube Data API v3 pada project Google Cloud aplikasi ini, lalu login lagi.';
  if(/invalid_grant/.test(s))return 'Sesi Google kedaluwarsa atau sudah dipakai. Klik Login dengan Google lagi.';
  if(/fetch failed|timeout|aborted/i.test(s))return 'Koneksi ke Google gagal atau terlalu lama. Periksa internet lalu coba lagi.';
  return s.slice(0,450);
}

const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function loginPage(ok,message){
  return '<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Login YouTube · Nara</title><link rel="stylesheet" href="/style.css"><body class="loginResult"><main class="card"><div class="eyebrow">NARA / YOUTUBE</div><h1>'+ (ok?'YouTube terhubung':'Login belum selesai')+'</h1><p>'+escape(message)+'</p><p>Kamu dapat menutup tab ini dan kembali ke studio yang sudah terbuka.</p><a href="/">Buka studio →</a></main></body></html>';
}

// Only server-generated Google authorization URLs are accepted. Never invoke a shell with user input.
export async function openGoogleBrowser(url){
  const u=new URL(url);
  if(u.origin!=='https://accounts.google.com'||u.pathname!=='/o/oauth2/v2/auth')throw Error('Alamat login tidak valid.');
  if(process.platform!=='win32')return false;
  const command="Start-Process -FilePath $env:NARA_GOOGLE_LOGIN_URL";
  return new Promise(resolve=>{
    const p=spawn('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(command,'utf16le').toString('base64')],{windowsHide:true,env:{...process.env,NARA_GOOGLE_LOGIN_URL:url},stdio:'ignore'});
    const timer=setTimeout(()=>{p.kill();resolve(false);},10000);
    p.once('error',()=>{clearTimeout(timer);resolve(false);});
    p.once('exit',code=>{clearTimeout(timer);resolve(code===0);});
  });
}
