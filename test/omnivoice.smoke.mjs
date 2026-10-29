import {OmniVoiceEngine,voiceSettings} from '../voice-engine.mjs';
import {writeFile} from 'node:fs/promises';
const engine=new OmniVoiceEngine(s=>console.log(s.phase+': '+s.message));
try{
 const settings=voiceSettings({provider:'omnivoice',device:process.env.OMNIVOICE_TEST_DEVICE||'cuda',mode:'design',instruct:'female, young adult',steps:16,language:'en'});
 const start=Date.now();const audio=await engine.request(settings,'Hello, I am Nara. Welcome to our stream.');
 await writeFile(new URL('../../omnivoice-sample.wav',import.meta.url),audio);
 console.log(JSON.stringify({bytes:audio.length,seconds:(Date.now()-start)/1000,format:audio.subarray(0,4).toString()}));
}finally{engine.stop();}
