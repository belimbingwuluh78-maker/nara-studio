const $=id=>document.getElementById(id);
export const hostState={kind:'builtin',size:100,x:92,y:92,motion:'breathe',blink:true,images:{}};
export const voiceState={provider:'windows'};
export function avatarRect(width,height,settings=hostState){
  const scale=Math.min(Number(settings.size)/100*320/width,560/height);
  const w=width*scale,h=height*scale;
  return {x:(1280-w)*Number(settings.x)/100,y:(660-h)*Number(settings.y)/100,w,h,scale};
}
export function pngFrame(images,level,blink){return blink&&images.blink?images.blink:level>.045&&images.talk?images.talk:images.idle;}
export function drawPNG(ctx,level,t){
  const image=pngFrame(hostState.images,level,hostState.blink&&Math.sin(t/1600)>.995);
  if(!image)return false;
  const r=avatarRect(hostState.images.idle.naturalWidth,hostState.images.idle.naturalHeight);
  const bob=hostState.motion==='none'?0:Math.sin(t/700)*4;
  ctx.save();ctx.translate(r.x+r.w/2,r.y+r.h/2+bob);
  if(hostState.motion==='sway')ctx.rotate(Math.sin(t/1100)*.025);
  ctx.drawImage(image,-r.w/2,-r.h/2,r.w,r.h);ctx.restore();return true;
}
let db;
async function database(){if(db)return db;db=await new Promise((resolve,reject)=>{const r=indexedDB.open('nara-avatar',1);r.onupgradeneeded=()=>r.result.createObjectStore('assets');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return db;}
async function storage(key,value){const d=await database();return new Promise((resolve,reject)=>{const tx=d.transaction('assets',value===undefined?'readonly':'readwrite'),store=tx.objectStore('assets');const r=value===undefined?store.get(key):value===null?store.delete(key):store.put(value,key);tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);});}
async function imageFrom(blob){const img=new Image(),url=URL.createObjectURL(blob);try{img.src=url;await img.decode();if(img.naturalWidth>4096||img.naturalHeight>4096)throw Error('Maximum resolution: 4096 × 4096.');return img;}catch(e){URL.revokeObjectURL(url);throw e;}}
function persist(){const {images,...settings}=hostState;localStorage.setItem('nara-avatar-settings',JSON.stringify(settings));}
function refresh(){for(const [id,key] of [['avatarKind','kind'],['avatarSize','size'],['avatarX','x'],['avatarY','y'],['avatarMotion','motion']])$(id).value=hostState[key];$('avatarBlink').checked=hostState.blink;$('pngFields').hidden=hostState.kind!=='png';$('avatarSummary').textContent=hostState.kind==='png'?(hostState.images.idle?'Your PNG avatar · lip sync':'No PNG selected · using Nara'):'Nara · built-in avatar';$('avatarSizeValue').textContent=hostState.size+'%';}
export async function initHostControls({api,token,toast,speakTest}){
  try{const saved=JSON.parse(localStorage.getItem('nara-avatar-settings')||'{}');for(const k of ['kind','size','x','y','motion','blink'])if(saved[k]!==undefined)hostState[k]=saved[k];
    for(const key of ['idle','talk','blink']){const blob=await storage(key);if(blob){hostState.images[key]=await imageFrom(blob);$('asset-'+key).textContent='Saved in this browser';}}
  }catch(e){toast('Avatar storage unavailable: '+e.message);}
  refresh();
  $('hostBtn').onclick=()=>{$('hostDialog').showModal();void loadVoice();};$('closeHost').onclick=()=>$('hostDialog').close();
  for(const [id,key] of [['avatarKind','kind'],['avatarSize','size'],['avatarX','x'],['avatarY','y'],['avatarMotion','motion']])$(id).oninput=()=>{hostState[key]=['size','x','y'].includes(key)?Number($(id).value):$(id).value;try{persist();}catch{}refresh();};
  $('avatarBlink').onchange=()=>{hostState.blink=$('avatarBlink').checked;persist();};
  for(const key of ['idle','talk','blink']){
    $('upload-'+key).onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>5*1024*1024)throw Error('Maximum PNG size: 5 MB.');const magic=new Uint8Array(await file.slice(0,8).arrayBuffer());if(magic.join(',')!=='137,80,78,71,13,10,26,10')throw Error('Use a valid PNG image.');const img=await imageFrom(file);await storage(key,file);if(hostState.images[key])URL.revokeObjectURL(hostState.images[key].src);hostState.images[key]=img;$('asset-'+key).textContent=file.name;if(key==='idle')hostState.kind='png';persist();refresh();toast('Avatar saved in this browser.');}catch(e){toast(e.message);}};
    $('clear-'+key).onclick=async()=>{try{await storage(key,null);if(hostState.images[key])URL.revokeObjectURL(hostState.images[key].src);delete hostState.images[key];$('upload-'+key).value='';$('asset-'+key).textContent='No image selected';refresh();}catch(e){toast(e.message);}};
  }
  $('resetAvatar').onclick=()=>{Object.assign(hostState,{kind:'builtin',size:100,x:92,y:92,motion:'breathe',blink:true});persist();refresh();};
  function voiceFields(){$('omniFields').hidden=$('voiceProvider').value!=='omnivoice';$('voiceDesignField').hidden=$('voiceMode').value!=='design';$('voiceCloneFields').hidden=$('voiceMode').value!=='clone';}
  async function loadVoice(){try{const d=await api('voice/settings');voiceState.provider=d.settings.provider;for(const [id,key] of [['voiceProvider','provider'],['voiceDevice','device'],['voiceMode','mode'],['voiceLanguage','language'],['voiceInstruct','instruct'],['voiceRefText','refText'],['voiceSpeed','speed'],['voiceSteps','steps']])$(id).value=d.settings[key];$('referenceStatus').textContent=d.reference?'Voice reference saved locally':'No voice reference selected';showEngine(d.engine);voiceFields();}catch(e){toast(e.message);}}
  $('voiceProvider').onchange=voiceFields;$('voiceMode').onchange=voiceFields;
  async function saveVoice(){const body={};for(const [id,key] of [['voiceProvider','provider'],['voiceDevice','device'],['voiceMode','mode'],['voiceLanguage','language'],['voiceInstruct','instruct'],['voiceRefText','refText'],['voiceSpeed','speed'],['voiceSteps','steps']])body[key]=$(id).value;await api('voice/settings',body);voiceState.provider=body.provider;}
  $('saveVoice').onclick=async()=>{try{await saveVoice();toast('Voice settings saved on this computer.');}catch(e){toast(e.message);}};
  $('loadOmni').onclick=async()=>{try{await saveVoice();$('voiceEngineStatus').textContent='Loading model…';showEngine(await api('voice/load',{}));}catch(e){toast(e.message);$('voiceEngineStatus').textContent=e.message;}};
  $('unloadOmni').onclick=async()=>{try{await api('voice/unload',{});$('voiceEngineStatus').textContent='Model unloaded from memory.';}catch(e){toast(e.message);}};
  $('hostTestVoice').onclick=async()=>{try{await saveVoice();await speakTest();}catch(e){toast(e.message);}};
  $('referenceAudio').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>12*1024*1024)throw Error('Maximum recording size: 12 MB.');$('referenceStatus').textContent='Saving recording…';const r=await fetch('/api/voice/reference',{method:'POST',headers:{'x-studio-token':token,'Content-Type':'application/octet-stream'},body:file});const d=await r.json();if(!r.ok)throw Error(d.error);$('referenceStatus').textContent='Saved: '+file.name+' (maximum 30 seconds)';}catch(e){$('referenceStatus').textContent=e.message;toast(e.message);}};
  await loadVoice();
}
export function showEngine(s){$('voiceEngineStatus').textContent=s.message;}
