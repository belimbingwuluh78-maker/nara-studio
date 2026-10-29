import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';

const root=fileURLToPath(new URL('./',import.meta.url));
const python=process.env.OMNIVOICE_PYTHON||fileURLToPath(new URL(process.platform==='win32'?'./.venv/Scripts/python.exe':'./.venv/bin/python',import.meta.url));
export function voiceSettings(input={}) {
  const out={provider:input.provider||'windows',device:input.device||'cpu',mode:input.mode||'design',language:String(input.language||'en').slice(0,30),instruct:String(input.instruct||'female, young adult').slice(0,500),refText:String(input.refText||'').slice(0,2000),speed:Number(input.speed??1),steps:Number(input.steps??16)};
  if(!['windows','omnivoice'].includes(out.provider)||!['cpu','cuda'].includes(out.device)||!['auto','design','clone'].includes(out.mode))throw Error('Invalid voice option.');
  if(!Number.isFinite(out.speed)||out.speed<0.5||out.speed>2||![8,16,32].includes(out.steps))throw Error('Invalid speech speed or quality.');
  return out;
}
export class OmniVoiceEngine {
  constructor(notify=()=>{}){this.notify=notify;this.process=null;this.pending=null;this.state={phase:'off',message:'OmniVoice is not loaded',device:null};}
  status(){return {...this.state,installed:existsSync(python)};}
  update(phase,message){this.state={...this.state,phase,message};this.notify(this.status());}
  stop(){const p=this.process;this.process=null;p?.kill();if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(Error('OmniVoice stopped.'));this.pending=null;}this.state.device=null;this.update('off','Model unloaded from memory');}
  start(){
    if(this.process)return;
    if(!existsSync(python))throw Error('OmniVoice is not installed. Run setup-omnivoice.ps1 from the studio folder.');
    const child=spawn(python,['-u',root+'omnivoice-worker.py'],{cwd:root,windowsHide:true,env:{...process.env,PYTHONIOENCODING:'utf-8'},stdio:['pipe','pipe','pipe']});this.process=child;let buffer='';
    child.stdin.on('error',()=>{});child.stderr.on('data',()=>{});
    child.stdout.on('data',chunk=>{buffer+=chunk.toString();let index;while((index=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,index);buffer=buffer.slice(index+1);if(!line.startsWith('@@NARA@@'))continue;let d;try{d=JSON.parse(line.slice(8));}catch{continue;}
      if(d.type==='phase')this.update('loading',d.message);
      if(d.type==='result'&&d.id===this.pending?.id){const p=this.pending;this.pending=null;clearTimeout(p.timer);this.state.device=d.device;this.update('ready',`OmniVoice ready · ${d.device.toUpperCase()}${d.seconds?' · '+d.seconds+' s generation':''}`);p.resolve(d.audio?Buffer.from(d.audio,'base64'):this.status());}
      if(d.type==='error'&&d.id===this.pending?.id){const p=this.pending;this.pending=null;clearTimeout(p.timer);this.update('error',d.error);p.reject(Error(d.error));}
    }});
    child.on('error',()=>this.stop());child.on('close',()=>{if(this.process===child)this.stop();});
  }
  request(settings,text){
    if(this.pending)return Promise.reject(Error('OmniVoice is still processing. Wait or click Pause AI.'));
    this.start();const id=randomUUID();this.update(text?'generating':'loading',text?'Generating speech with OmniVoice…':'Loading OmniVoice…');
    return new Promise((resolve,reject)=>{const timer=setTimeout(()=>this.stop(),600000);this.pending={id,resolve,reject,timer};this.process.stdin.write(JSON.stringify({...settings,id,action:text?'speak':'load',text})+'\n');});
  }
}
