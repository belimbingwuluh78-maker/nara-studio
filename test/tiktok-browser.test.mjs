import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {EventEmitter} from 'node:events';
import {readTikTokPage} from '../tiktok-dom.mjs';
import {createTikTokBrowserReader} from '../tiktok-browser.mjs';
const comment=(author,text,id='')=>`<div class="text-UIText1" data-message-id="${id}"><div><a href="/@viewer" data-e2e="comment-username">${author}</a></div><div>${text}</div></div>`;
function fixture(html){const dom=new JSDOM(html,{url:'https://www.tiktok.com/@channel/live',runScripts:'outside-only'});dom.window.Element.prototype.getClientRects=function(){return this.closest('[hidden]')?[]:[{}];};const read=()=>dom.window.eval(`(${readTikTokPage.toString()})('channel')`);return {dom,read,doc:dom.window.document};}

test('browser DOM reader ignores initial history and extracts only new comment pairs, with rerender deduplication',()=>{
 const {dom,read,doc}=fixture(comment('Alice','Riwayat','1'));
 try{
  assert.equal(read().status,'connected');assert.equal(read().rows.length,0);
  doc.body.insertAdjacentHTML('beforeend',comment('Bob','Halo Nara!','2'));
  const row=read().rows[0];assert.equal(row.author,'Bob');assert.equal(row.text,'Halo Nara!');assert.equal(row.id,'2');
  assert.equal(read().rows.length,0);
  doc.body.innerHTML=comment('Bob','Halo Nara!','2');assert.equal(read().rows.length,0);
  doc.body.insertAdjacentHTML('beforeend',`<section data-e2e="enter-message">${comment('New viewer','joined')}</section><section hidden>${comment('Hidden','ignore')}</section><div><a href="/@user">Profile</a><p>not chat</p></div>`);
  assert.equal(read().rows.length,0);
  doc.body.insertAdjacentHTML('beforeend',comment('Charlie','LIVE has ended','3'));
  assert.equal(read().status,'connected'); // Viewer text must not impersonate stream status.
 }finally{dom.window.close();}
});

test('browser reader pauses for login/CAPTCHA, rejects other rooms and never reads a page as connected without comments',()=>{
 const {dom,read,doc}=fixture('<h1>LIVE</h1>');
 try{
  assert.equal(read().status,'waiting');
  doc.body.innerHTML=comment('A','hello')+'<div role="dialog">Log in to TikTok</div>';assert.equal(read().reason,'login');
  doc.body.innerHTML=comment('A','hello')+'<div id="captcha_container">Verify</div>';assert.equal(read().reason,'captcha');
  doc.body.innerHTML=comment('A','hello');assert.equal(read().rows.length,0);
  dom.reconfigure({url:'https://www.tiktok.com/@other/live'});assert.equal(read().reason,'location');
  dom.reconfigure({url:'https://www.tiktok.com/@channel/live'});doc.body.innerHTML='<h2>This LIVE has ended</h2>';assert.equal(read().status,'ended');
 }finally{dom.window.close();}
});

test('local browser lifecycle uses visible Edge, mutes playback and closes its own browser; no key or signing provider',async()=>{
 const events=[],launches=[],urls=[];let reads=0;
 class Page extends EventEmitter{async goto(url){urls.push(url);}async evaluate(){reads++;return reads===1?{status:'waiting',reason:'login',rows:[]}:{status:'connected',rows:reads===2?[{id:'1',author:'A',text:'Halo'}]:[]};}}
 const page=new Page();class Browser extends EventEmitter{async newContext(options){this.contextOptions=options;return {newPage:async()=>page};}async close(){this.closed=true;this.emit('disconnected');}}
 const browser=new Browser(),chromium={launch:async options=>{launches.push(options);return browser;}};
 const reader=createTikTokBrowserReader('channel',e=>events.push(e),{loadChromium:async()=>chromium,intervalMs:5});
 try{
  await reader.start;
  assert.equal(launches[0].channel,'msedge');assert.equal(launches[0].headless,false);assert.deepEqual(launches[0].args,['--mute-audio']);assert.equal(browser.contextOptions.acceptDownloads,false);
  assert.deepEqual(urls,['https://www.tiktok.com/@channel/live']);assert.ok(events.some(e=>e.type==='waiting'));
  await new Promise(resolve=>setTimeout(resolve,30));assert.ok(events.some(e=>e.type==='connected'));assert.equal(events.filter(e=>e.type==='comment').length,1);
  await reader.close();assert.equal(browser.closed,true);const count=events.length;await new Promise(resolve=>setTimeout(resolve,15));assert.equal(events.length,count);
 }finally{await reader.close();}
});

test('cancel while browser starts closes late launch instead of leaking a browser',async()=>{
 let resolveLaunch,closed=0;
 const browser={close:async()=>{closed++;}},chromium={launch:()=>new Promise(resolve=>{resolveLaunch=resolve;})};
 const reader=createTikTokBrowserReader('channel',()=>{}, {loadChromium:async()=>chromium});
 await new Promise(resolve=>setImmediate(resolve));const stopping=reader.close();resolveLaunch(browser);await stopping;await reader.start;assert.ok(closed>=1);
});
