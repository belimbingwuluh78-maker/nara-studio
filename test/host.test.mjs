import test from 'node:test';
import assert from 'node:assert/strict';
import {voiceSettings} from '../voice-engine.mjs';
import {avatarRect,pngFrame} from '../public/host-controls.js';
test('PNG uses speech amplitude and optional blink with graceful single-image fallback',()=>{
 const images={idle:'closed',talk:'open',blink:'blink'};
 assert.equal(pngFrame(images,0,false),'closed');assert.equal(pngFrame(images,.2,false),'open');assert.equal(pngFrame(images,.2,true),'blink');
 assert.equal(pngFrame({idle:'closed'},.4,true),'closed');
});
test('portrait PNG remains inside broadcast frame at extreme sizes and positions',()=>{
 for(const x of [0,50,100])for(const y of [0,100]){const r=avatarRect(300,2000,{size:160,x,y});assert.ok(r.x>=0&&r.y>=0);assert.ok(r.x+r.w<=1280&&r.y+r.h<=660);}
});
test('voice settings reject invalid device and out-of-range generation controls',()=>{
 assert.equal(voiceSettings().language,'en');assert.equal(voiceSettings({language:'id'}).language,'id');assert.throws(()=>voiceSettings({device:'shell'}));assert.throws(()=>voiceSettings({steps:10000}));assert.throws(()=>voiceSettings({speed:'invalid'}));assert.equal(voiceSettings({provider:'omnivoice',mode:'clone'}).mode,'clone');
});
