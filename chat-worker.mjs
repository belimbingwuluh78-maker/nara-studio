import {connectTwitch} from './chat-connectors.mjs';
import {createTikTokBrowserReader} from './tiktok-browser.mjs';
import {chatFailure} from './chat-protocol.mjs';
const send=data=>{if(process.connected)process.send(data);};
let close=()=>{},stopping=false,started=false;
async function stop(){if(stopping)return;stopping=true;await close();process.exit();}
process.on('message',async data=>{
 if(data.type==='stop'){await stop();return;}
 if(started||stopping)return;started=true;
 const {platform,channel}=data;
 try{
  if(platform==='twitch')close=connectTwitch(channel,send);
  else if(platform==='tiktok'){const reader=createTikTokBrowserReader(channel,send);close=reader.close;await reader.start;}
 }catch(e){send({type:'error',message:chatFailure(platform,e)});}
});
process.on('disconnect',()=>void stop());
process.on('SIGTERM',()=>void stop());
process.on('SIGINT',()=>void stop());
