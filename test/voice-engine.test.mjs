import test from 'node:test';
import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import {EventEmitter} from 'node:events';
const savedPython=process.env.OMNIVOICE_PYTHON;process.env.OMNIVOICE_PYTHON=process.execPath;
const {OmniVoiceEngine}=await import('../voice-engine.mjs');
if(savedPython===undefined)delete process.env.OMNIVOICE_PYTHON;else process.env.OMNIVOICE_PYTHON=savedPython;
function worker(t){
 const child=new EventEmitter(),writes=[];let kills=0;
 child.stdin=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stdin.write=line=>writes.push(JSON.parse(line));child.kill=()=>{kills++;};
 t.mock.method(childProcess,'spawn',()=>child);syncBuiltinESMExports();
 const engine=new OmniVoiceEngine();t.after(()=>{engine.stop();t.mock.restoreAll();syncBuiltinESMExports();});
 return {engine,child,writes,kills:()=>kills,result:data=>child.stdout.emit('data',Buffer.from('@@NARA@@'+JSON.stringify({type:'result',...data})+'\n'))};
}
test('cancel rejects speech without killing the worker, clears its timer and ignores late results',async t=>{
 const w=worker(t),pending=w.engine.request({device:'cpu'},'First'),rejected=assert.rejects(pending,{message:'Suara dibatalkan.'});
 let expired=false;clearTimeout(w.engine.pending.timer);w.engine.pending.timer=setTimeout(()=>{expired=true;},20);
 w.engine.cancel();await rejected;
 assert.equal(w.engine.pending,null);assert.equal(w.engine.process,w.child);assert.equal(w.kills(),0);assert.equal(w.engine.status().phase,'ready');
 await new Promise(resolve=>setTimeout(resolve,40));assert.equal(expired,false);
 const next=w.engine.request({device:'cpu'},'Second');
 w.result({id:w.writes[0].id,device:'cpu',audio:Buffer.from('old').toString('base64')});assert.equal(w.engine.pending.id,w.writes[1].id);
 w.result({id:w.writes[1].id,device:'cpu',audio:Buffer.from('new').toString('base64')});assert.equal((await next).toString(),'new');assert.equal(w.kills(),0);
 w.engine.cancel();assert.equal(w.engine.status().phase,'ready');
});
test('worker failure retains at most 2 KB of stderr and reports only the last line, capped at 300 characters',async t=>{
 const w=worker(t),pending=w.engine.request({device:'cpu'},'Hello'),last='ModuleNotFoundError: '+ 'x'.repeat(400);
 const rejected=assert.rejects(pending,{message:'OmniVoice stopped. '+last.slice(0,300)});
 w.child.stderr.emit('data',Buffer.from('discarded\n'+'a'.repeat(4000)));w.child.stderr.emit('data',Buffer.from('\n'+last+'\r\n'));
 assert.equal(w.engine.stderr.length,2048);assert.equal(w.engine.stderr.includes('discarded'),false);
 w.child.emit('close',1);await rejected;
 assert.equal(w.engine.status().phase,'error');assert.equal(w.engine.status().message,'OmniVoice stopped. '+last.slice(0,300));assert.equal(w.engine.pending,null);assert.equal(w.engine.process,null);
});
test('a new worker clears old stderr and explicit unload still kills its process',async t=>{
 const w=worker(t);w.engine.stderr=Buffer.from('old error');w.engine.start();assert.equal(w.engine.stderr.length,0);
 const pending=w.engine.request({device:'cpu'},'Hello'),rejected=assert.rejects(pending,{message:'OmniVoice stopped.'});
 w.engine.stop();await rejected;assert.equal(w.kills(),1);assert.equal(w.engine.status().phase,'off');
 w.child.emit('close',1);assert.equal(w.engine.status().phase,'off');
});
