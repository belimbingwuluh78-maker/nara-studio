import WebSocket from 'ws';
import {randomInt} from 'node:crypto';
import {parseIRC,twitchComment,chatFailure} from './chat-protocol.mjs';

export function connectTwitch(channel,send,Socket=WebSocket){
 const ws=new Socket('wss://irc-ws.chat.twitch.tv:443',{handshakeTimeout:12000,maxPayload:256*1024});
 let connected=false,closed=false,lastSeen=Date.now();
 const close=()=>{closed=true;clearInterval(heartbeat);ws.terminate();};
 const fail=message=>{if(closed)return;send({type:'error',message});close();};
 const heartbeat=setInterval(()=>{if(Date.now()-lastSeen>90000){fail('Chat Twitch tidak merespons. Hubungkan chat kembali.');return;}if(ws.readyState===1)ws.send('PING :nara');},30000);
 ws.on('open',()=>{for(const line of ['CAP REQ :twitch.tv/tags twitch.tv/commands','PASS SCHMOOPIIE','NICK justinfan'+randomInt(100000,999999)])ws.send(line);});
 ws.on('message',buffer=>{
  lastSeen=Date.now();
  for(const line of buffer.toString().split('\r\n')){
   const m=parseIRC(line);if(!m)continue;
   if(m.command==='PING')ws.send('PONG :'+m.text);
   if(m.command==='001')ws.send('JOIN #'+channel);
   if(m.command==='ROOMSTATE'&&m.params[0]==='#'+channel&&m.tags['room-id']&&!connected){connected=true;send({type:'connected'});}
   if(m.command==='RECONNECT'){fail('Twitch meminta koneksi ulang. Klik Hubungkan chat lagi.');return;}
   if(m.command==='NOTICE'&&(/authentication|improperly formatted|suspended|banned/i.test(m.text)||['msg_channel_suspended','msg_banned'].includes(m.tags['msg-id']))){fail(chatFailure('twitch'));return;}
   const row=twitchComment(m,channel);if(connected&&row)send({type:'comment',row});
  }
 });
 ws.on('error',()=>fail(chatFailure('twitch')));
 ws.on('close',()=>{clearInterval(heartbeat);if(!closed){closed=true;send({type:'error',message:chatFailure('twitch')});}});
 return close;
}


