import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {LiveChat} from '../live-chat.mjs';
import {chatChannel,parseIRC,twitchComment,normalizeComment,chatFailure} from '../chat-protocol.mjs';
import {connectTwitch} from '../chat-connectors.mjs';

test('chat input rejects URLs and IRC injection; protocol preserves tagged text and ignores shared-room messages',()=>{
 assert.equal(chatChannel('twitch',' @My_Channel '),'my_channel');
 assert.throws(()=>chatChannel('twitch','name\r\nJOIN #other'));
 assert.throws(()=>chatChannel('tiktok','https://tiktok.com/@name'));
 const m=parseIRC('@id=abc;display-name=Viewer\\sSatu;tmi-sent-ts=12345 :viewer!viewer@host PRIVMSG #my_channel :Halo: game apa?');
 const row=twitchComment(m,'my_channel');assert.equal(row.author,'Viewer Satu');assert.equal(row.text,'Halo: game apa?');
 assert.equal(twitchComment(m,'another'),null);
 m.tags['room-id']='1';m.tags['source-room-id']='2';assert.equal(twitchComment(m,'my_channel'),null);
 assert.equal(normalizeComment('twitch','test',{...row,timestamp:1},Date.now()),null);
 assert.ok(!chatFailure('tiktok',Error('401 secret-key-value')).includes('secret-key-value'));
});

test('Twitch sends separate IRC frames, acknowledges PING and waits for room confirmation before emitting comments',()=>{
 let ws;class Socket extends EventEmitter{constructor(){super();ws=this;this.sent=[];this.readyState=1;}send(s){this.sent.push(s);}terminate(){this.emit('close');}}
 const messages=[],stop=connectTwitch('channel',x=>messages.push(x),Socket);
 try{
  ws.emit('open');assert.equal(ws.sent.length,3);assert.ok(ws.sent[2].startsWith('NICK justinfan'));
  ws.emit('message',Buffer.from(':tmi.twitch.tv 001 nick :welcome\r\nPING :tmi.twitch.tv\r\n'));
  assert.ok(ws.sent.includes('JOIN #channel'));assert.ok(ws.sent.includes('PONG :tmi.twitch.tv'));
  const comment='@id=1;display-name=Alice :alice!a@a PRIVMSG #channel :Halo Nara!\r\n';
  ws.emit('message',Buffer.from(comment));assert.equal(messages.length,0);
  ws.emit('message',Buffer.from('@room-id=123 :tmi.twitch.tv ROOMSTATE #channel\r\n'+comment));
  assert.equal(messages[0].type,'connected');assert.equal(messages[1].row.text,'Halo Nara!');
  ws.emit('message',Buffer.from(':tmi.twitch.tv RECONNECT\r\n'));assert.equal(messages.at(-1).type,'error');
 }finally{stop();}
});

test('chat lifecycle drops duplicates, history and late events after disconnect or platform switch',()=>{
 const children=[],states=[],rows=[];
 class Child extends EventEmitter{send(data){if(data.type==='stop'){this.stopped=true;this.emit('exit');}else this.data=data;}kill(){this.killed=true;this.emit('exit');}}
 const chat=new LiveChat({onState:s=>states.push(s),onMessage:r=>rows.push(r),createWorker:()=>{const c=new Child;children.push(c);return c;}});
 try{
  assert.throws(()=>chat.connect({platform:'tiktok',channel:'invalid/url'}));assert.equal(children.length,0);
  chat.connect({platform:'twitch',channel:'channel'});const c=children[0];assert.equal(chat.info.status,'connecting');
  const row={id:'1',author:'Viewer',text:'Halo!',timestamp:Date.now()};
  c.emit('message',{type:'comment',row});assert.equal(rows.length,0);
  c.emit('message',{type:'connected'});c.emit('message',{type:'comment',row});c.emit('message',{type:'comment',row});
  c.emit('message',{type:'comment',row:{...row,id:'2',timestamp:Date.now()-30000}});assert.equal(rows.length,1);assert.equal(rows[0].source,'twitch');
  chat.connect({platform:'tiktok',channel:'channel'});assert.equal(c.stopped,true);
  c.emit('message',{type:'connected'});c.emit('message',{type:'comment',row:{...row,id:'3'}});assert.equal(rows.length,1);
  assert.equal(chat.info.platform,'tiktok');assert.ok(!JSON.stringify(chat.info).includes('secret'));
  const t=children[1];assert.deepEqual(t.data,{platform:'tiktok',channel:'channel'});t.emit('message',{type:'waiting',message:'Periksa browser'});assert.equal(chat.info.status,'waiting');t.emit('message',{type:'comment',row});assert.equal(rows.length,1);t.emit('message',{type:'connected'});t.emit('message',{type:'comment',row});assert.equal(rows.length,2);assert.notEqual(rows[0].id,rows[1].id);
  chat.stop();t.emit('message',{type:'comment',row:{...row,id:'4'}});assert.equal(rows.length,2);assert.equal(chat.info.status,'idle');
 }finally{chat.stop();}
});
