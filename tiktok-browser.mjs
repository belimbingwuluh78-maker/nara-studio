import {readTikTokPage} from './tiktok-dom.mjs';
import {chatChannel} from './chat-protocol.mjs';
const messages={
 location:'Reopen this account\'s LIVE page in the TikTok reader window. Reading is paused while on another page.',
 captcha:'TikTok requires verification. Complete the CAPTCHA yourself in the TikTok window; reading will resume automatically.',
 login:'TikTok requires sign-in. Sign in yourself in the TikTok window; reading will resume automatically.',
 comments:'Browser open. Waiting for recognizable comments. Make sure the account is LIVE and the chat panel is visible.'
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
  if(!browser){emit({type:'error',message:'The reader browser could not open. Make sure Microsoft Edge or Google Chrome is installed and allowed to run.'});return;}
  if(closed){await browser.close();return;}
  browser.on('disconnected',()=>{if(!closed){emit({type:'error',message:'The TikTok window was closed. Click Connect chat to reopen it.'});void close();}});
  const context=await browser.newContext({viewport:{width:1100,height:800},acceptDownloads:false});
  page=await context.newPage();
  page.on('close',()=>{if(!closed){emit({type:'error',message:'The TikTok reader tab was closed. Reconnect chat.'});void close();}});
  status('waiting','TikTok window opened. If prompted, complete sign-in or the CAPTCHA yourself in the browser.');
  try{await page.goto(`https://www.tiktok.com/@${channel}/live`,{waitUntil:'domcontentloaded',timeout:45000});}
  catch{if(closed)return;status('waiting','The TikTok page has not loaded. Check your internet connection, then reload the page in the TikTok window.');}
  if(closed)return;
  const poll=async()=>{
   if(closed||polling)return;polling=true;
   try{
    const snapshot=await page.evaluate(readTikTokPage,channel);
    if(closed)return;
    if(snapshot.status==='ended'){status('ended','TikTok LIVE has ended or the account is not LIVE yet.');await close();return;}
    if(snapshot.status==='connected'){
     ready=true;emptySince=0;status('connected','Reading chat @'+channel+' through the local browser');
     for(const row of snapshot.rows)emit({type:'comment',row});
    }else{
     // An empty chat after verified connection is normal. Navigation/login still pauses it.
     if(ready&&snapshot.reason==='comments'){emptySince||=Date.now();if(Date.now()-emptySince<10000)return;}
     ready=false;status('waiting',messages[snapshot.reason]||messages.comments);
    }
   }catch{if(!closed){ready=false;status('waiting','The page is changing. Wait for TikTok to load or reload the page.');}}
   finally{polling=false;}
  };
  timer=setInterval(()=>void poll(),intervalMs);await poll();
 })().catch(async()=>{emit({type:'error',message:'The TikTok browser reader failed to start. Disconnect and try again.'});await close();});
 return {close,start};
}
