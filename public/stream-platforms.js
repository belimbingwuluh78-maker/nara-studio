// Shared by server validation and browser controls; no account credentials here.
export const streamPlatforms=Object.freeze({
 youtube:{name:'YouTube',label:'YouTube Live',icon:'▶',defaultServer:'rtmps://a.rtmps.youtube.com/live2',dashboard:'https://studio.youtube.com/',help:'Use the server URL and stream key from YouTube Studio. To read chat, connect your account and select a broadcast in the YouTube card.'},
 tiktok:{name:'TikTok',label:'TikTok · Stream key',icon:'♪',defaultServer:'',dashboard:'https://www.tiktok.com/',help:'Copy the server URL and stream key provided by TikTok for your account. Set up and manage LIVE on TikTok. Click Connect chat to read LIVE comments (experimental).'},
 twitch:{name:'Twitch',label:'Twitch · Stream key',icon:'◈',defaultServer:'rtmp://live.twitch.tv/app',dashboard:'https://dashboard.twitch.tv/',help:'Copy your stream key from the Twitch Creator Dashboard. The Twitch server is prefilled; you can choose another ingest server. Set your title and category on Twitch. Click Connect chat and enter your channel name to read comments.'},
 facebook:{name:'Facebook Live',label:'Facebook Live · Stream key',icon:'f',defaultServer:'',dashboard:'https://www.facebook.com/live/producer/',help:'Open Facebook Live Producer, select streaming software, then copy the server URL and stream key for that session. Check the preview and start or end LIVE on Facebook. Facebook chat is not connected.'},
 kick:{name:'Kick',label:'Kick · Stream key',icon:'K',defaultServer:'',dashboard:'https://dashboard.kick.com/',help:'In the Kick Creator Dashboard, open Channel → Stream URL and Key. Copy both values here. Set your title and category on Kick before sending media. Kick chat is not connected.'},
 custom:{name:'Custom RTMP',label:'Other · Custom RTMP/RTMPS',icon:'↗',defaultServer:'',dashboard:'',help:'For other platforms or servers that accept RTMP/RTMPS, paste the server URL and stream key from your provider. The studio sends video and audio to one destination; sign-in, chat, and LIVE management remain on that platform.'}
});
export const isStreamPlatform=id=>typeof id==='string'&&Object.hasOwn(streamPlatforms,id);
export const platformName=id=>streamPlatforms[id]?.name||'Platform';
export function streamConfirmation(s){
 if(s.platform==='youtube'&&s.broadcast?.autoStart)return 'AUTO-START is enabled: sending video may immediately start your YouTube broadcast. Continue?';
 const name=platformName(s.platform);
 return `Send video and audio to ${name} now? The broadcast may go live immediately. Check the preview and LIVE status on ${s.platform==='custom'?'the destination platform':name}.`;
}
