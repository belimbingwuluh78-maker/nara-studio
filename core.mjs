export const providers = {
  deepseek: {url:'https://api.deepseek.com/chat/completions', model:'deepseek-flash'},
  kimi: {url:'https://api.moonshot.ai/v1/chat/completions', model:'kimi-k2.6'},
  openai: {url:'https://api.openai.com/v1/chat/completions', model:'gpt-4.1-mini'}
};
export function modelOptions(provider,model) {
  if(provider==='deepseek')return {max_tokens:350,thinking:{type:'disabled'}};
  if(provider==='kimi'&&/^kimi-k2\.[56]/.test(model))return {max_tokens:350,thinking:{type:'disabled'}};
  if(provider==='kimi')return {max_tokens:2048,...(/^kimi-k3/.test(model)?{reasoning_effort:'low'}:{})};
  return {max_tokens:350};
}
export function ingestUrl(server, key) {
  const url = new URL(server);
  if (!['rtmp:','rtmps:'].includes(url.protocol) || !url.hostname || url.username || url.password || url.search || url.hash || !key || /[\s#]/.test(key)) throw Error('Server harus berupa URL RTMP(S) tanpa query. Masukkan stream key lengkap, termasuk parameter jika ada, pada kolom stream key.');
  return server.replace(/\/$/,'')+'/'+key;
}
export function encoderArgs(target, encoder='libx264') {
  if (!['libx264','h264_nvenc','h264_qsv','h264_amf'].includes(encoder)) throw Error('Encoder tidak didukung.');
  return ['-hide_banner','-loglevel','warning','-fflags','+genpts','-i','pipe:0','-map','0:v:0','-map','0:a:0','-c:v',encoder,...(encoder==='libx264'?['-preset','veryfast','-tune','zerolatency']:[]),'-pix_fmt','yuv420p','-r','30','-g','60','-b:v','2500k','-maxrate','2500k','-bufsize','5000k','-c:a','aac','-b:a','128k','-ar','44100','-f','flv',target];
}
export function chatBatch(data, seen) {
  const rows=[];
  for(const x of data.items||[]) {
    if(seen.has(x.id)) continue;
    seen.add(x.id);
    if(x.snippet?.type==='textMessageEvent') rows.push({id:x.id,author:x.authorDetails?.displayName||'Viewer',text:x.snippet.displayMessage.slice(0,1000),source:'youtube'});
  }
  while(seen.size>2000) seen.delete(seen.values().next().value);
  return {rows,wait:Math.max(5000,Number(data.pollingIntervalMillis)||5000),next:data.nextPageToken};
}
