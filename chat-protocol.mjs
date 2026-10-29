import {createHash} from 'node:crypto';

export function chatChannel(platform,value){
 const channel=String(value||'').trim().replace(/^[@#]/,'').toLowerCase();
 const valid=platform==='twitch'?/^[a-z0-9_]{1,25}$/:platform==='tiktok'?/^[a-z0-9_.]{1,24}$/:null;
 if(!valid||!valid.test(channel))throw Error('Masukkan username '+(platform==='twitch'?'Twitch':'TikTok')+' saja, tanpa URL atau spasi.');
 return channel;
}
const unescapeTag=s=>s.replace(/\\([s:nr\\])/g,(_,c)=>({s:' ',':':';',n:'\n',r:'\r','\\':'\\'}[c]));
export function parseIRC(line){
 const tags={};let prefix='',rest=line;
 if(rest.startsWith('@')){const at=rest.indexOf(' ');if(at<0)return null;for(const pair of rest.slice(1,at).split(';')){const i=pair.indexOf('=');if(i>=0)tags[pair.slice(0,i)]=unescapeTag(pair.slice(i+1));}rest=rest.slice(at+1);}
 if(rest.startsWith(':')){const at=rest.indexOf(' ');if(at<0)return null;prefix=rest.slice(1,at);rest=rest.slice(at+1);}
 const at=rest.indexOf(' :'),text=at>=0?rest.slice(at+2):'';
 const [command,...params]=(at>=0?rest.slice(0,at):rest).split(' ');
 return {tags,prefix,command,params,text};
}
export function twitchComment(m,channel){
 if(m?.command!=='PRIVMSG'||m.params[0]!=='#'+channel)return null;
 // Avoid answering messages from another channel inside Twitch Shared Chat.
 if(m.tags['source-room-id']&&m.tags['room-id']!==m.tags['source-room-id'])return null;
 return {id:m.tags.id,author:m.tags['display-name']||m.prefix.split('!')[0],text:m.text.replace(/^\x01ACTION (.*)\x01$/s,'$1'),timestamp:Number(m.tags['tmi-sent-ts'])||Date.now()};
}
export function normalizeComment(platform,channel,row,startedAt=0){
 const text=String(row?.text||'').trim().slice(0,1000);if(!text)return null;
 const timestamp=Number(row.timestamp)||Date.now();if(timestamp<startedAt-2000)return null;
 const author=String(row.author||'Viewer').slice(0,80);
 const id=String(row.id||createHash('sha256').update(`${author}|${text}|${Math.floor(timestamp/2000)}`).digest('hex')).slice(0,150);
 return {id:`${platform}:${channel}:${id}`,author,text,source:platform,channel,historical:false};
}
export function chatFailure(platform,error){
 const name=String(error?.name||''),s=String(error?.message||error||'');
 if(platform==='tiktok')return 'Pembaca chat TikTok berhenti. Periksa jendela browser, status LIVE dan internet, lalu hubungkan kembali.';
 return 'Chat Twitch terputus atau koneksi baca-saja ditolak. Periksa channel dan internet, lalu hubungkan lagi.';
}

