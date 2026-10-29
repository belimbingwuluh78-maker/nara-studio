import {readTikTokPage} from './tiktok-dom.mjs';
import {chatChannel} from './chat-protocol.mjs';
const messages={
 location:'Buka kembali halaman LIVE akun ini di jendela pembaca TikTok. Pembacaan dijeda selama halaman berbeda.',
 captcha:'TikTok meminta verifikasi. Selesaikan CAPTCHA sendiri di jendela TikTok; pembacaan lanjut otomatis.',
 login:'TikTok meminta login. Masuk sendiri di jendela TikTok; pembacaan lanjut otomatis.',
 comments:'Browser terbuka. Menunggu komentar yang dapat dikenali. Pastikan akun sedang LIVE dan panel chat terlihat.'
};
export function createTikTokBrowserReader(channel,send,{loadChromium=async()=> (await import('playwright-core')).chromium,intervalMs=700}={}){
 channel=chatChannel('tiktok',channel);
 let browser,page,timer,launching,closed=false,polling=false,lastState='',ready=false,emptySince=0;
 const emit=data=>{if(!closed)send(data);};
 const status=(type,message)=>{const key=type+message;if(key!==lastState){lastState=key;emit({type,message});}};
 const close=async()=>{if(closed)return;closed=true;clearInterval(timer);if(launching)await launching.catch(()=>{});await browser?.close().catch(()=>{});};
 const start=(async()=>{
  const chromium=await loadChromium();
  for(const channel of ['msedge','chrome']){
   if(closed)return;
   try{launching=chromium.launch({channel,headless:false,timeout:20000,args:['--mute-audio']});browser=await launching;break;}catch{}finally{launching=null;}
  }
  if(!browser){emit({type:'error',message:'Browser pembaca tidak dapat dibuka. Pastikan Microsoft Edge atau Google Chrome terpasang dan diizinkan berjalan.'});return;}
  if(closed){await browser.close();return;}
  browser.on('disconnected',()=>{if(!closed){emit({type:'error',message:'Jendela TikTok ditutup. Klik Hubungkan chat untuk membuka kembali.'});void close();}});
  const context=await browser.newContext({viewport:{width:1100,height:800},acceptDownloads:false});
  page=await context.newPage();
  page.on('close',()=>{if(!closed){emit({type:'error',message:'Tab pembaca TikTok ditutup. Hubungkan chat kembali.'});void close();}});
  status('waiting','Jendela TikTok dibuka. Jika diminta, selesaikan login atau CAPTCHA sendiri di browser.');
  try{await page.goto(`https://www.tiktok.com/@${channel}/live`,{waitUntil:'domcontentloaded',timeout:45000});}
  catch{if(closed)return;status('waiting','Halaman TikTok belum termuat. Periksa internet lalu muat ulang halaman di jendela TikTok.');}
  if(closed)return;
  const poll=async()=>{
   if(closed||polling)return;polling=true;
   try{
    const snapshot=await page.evaluate(readTikTokPage,channel);
    if(closed)return;
    if(snapshot.status==='ended'){status('ended','LIVE TikTok telah berakhir atau akun belum LIVE.');await close();return;}
    if(snapshot.status==='connected'){
     ready=true;emptySince=0;status('connected','Membaca chat @'+channel+' lewat browser lokal');
     for(const row of snapshot.rows)emit({type:'comment',row});
    }else{
     // An empty chat after verified connection is normal. Navigation/login still pauses it.
     if(ready&&snapshot.reason==='comments'){emptySince||=Date.now();if(Date.now()-emptySince<10000)return;}
     ready=false;status('waiting',messages[snapshot.reason]||messages.comments);
    }
   }catch{if(!closed){ready=false;status('waiting','Halaman sedang berubah. Tunggu TikTok selesai dimuat atau muat ulang halaman.');}}
   finally{polling=false;}
  };
  timer=setInterval(()=>void poll(),intervalMs);await poll();
 })().catch(async()=>{emit({type:'error',message:'Pembaca browser TikTok gagal dijalankan. Tutup koneksi lalu coba lagi.'});await close();});
 return {close,start};
}
