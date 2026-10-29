import {fork} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chatChannel,normalizeComment} from './chat-protocol.mjs';
export class LiveChat {
 constructor({onState,onMessage,createWorker}={}){this.onState=onState||(()=>{});this.onMessage=onMessage||(()=>{});this.createWorker=createWorker||(()=>fork(fileURLToPath(new URL('./chat-worker.mjs',import.meta.url)),[],{windowsHide:true,stdio:['ignore','ignore','ignore','ipc']}));this.info={status:'idle',platform:null,channel:'',message:'Chat belum terhubung',count:0};}
 publish(patch){this.info={...this.info,...patch};this.onState({...this.info});}
 retire(child){if(!child)return Promise.resolve();return new Promise(resolve=>{const timer=setTimeout(()=>{child.kill();resolve();},30000);timer.unref?.();child.once('exit',()=>{clearTimeout(timer);resolve();});try{child.send({type:'stop'});}catch{child.kill();clearTimeout(timer);resolve();}});}
 stop(){clearTimeout(this.timer);const child=this.child;this.child=null;const done=this.retire(child);this.publish({status:'idle',platform:null,channel:'',message:'Chat terputus',count:0});return done;}
 connect({platform,channel}){
  channel=chatChannel(platform,channel);
  this.stop();const startedAt=Date.now(),seen=new Set();
  const child=this.child=this.createWorker();
  const finish=(status,message)=>{if(this.child!==child)return;clearTimeout(this.timer);this.child=null;void this.retire(child);this.publish({status,message});};
  this.publish({platform,channel,status:'connecting',message:'Menghubungkan chat…',count:0});
  this.timer=setTimeout(()=>finish('error','Koneksi chat terlalu lama. Periksa browser dan internet, lalu coba lagi.'),60000);
  child.on('message',data=>{
   if(this.child!==child)return;
   if(data.type==='connected'){clearTimeout(this.timer);this.publish({status:'connected',message:data.message||'Membaca chat @'+channel});}
   if(data.type==='waiting'&&platform==='tiktok'){clearTimeout(this.timer);this.publish({status:'waiting',message:data.message});}
   if(data.type==='error'||data.type==='ended')finish(data.type,data.message);
   if(data.type==='comment'&&this.info.status==='connected'){
    const row=normalizeComment(platform,channel,data.row,startedAt);if(!row||seen.has(row.id))return;
    seen.add(row.id);if(seen.size>2000)seen.delete(seen.values().next().value);
    this.info.count++;this.onMessage(row);
   }
  });
  child.on('error',()=>finish('error','Konektor chat tidak dapat dijalankan. Periksa instalasi studio.'));
  child.on('exit',()=>finish('error','Konektor chat berhenti. Hubungkan kembali.'));
  child.send({platform,channel});
  return this.info;
 }
}
