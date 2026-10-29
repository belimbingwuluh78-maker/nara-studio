// Runs only inside the dedicated TikTok page. Reads rendered comments, never cookies or network tokens.
export function readTikTokPage(channel) {
 const doc=globalThis.document;
 const visible=el=>!!el&&!el.closest('[hidden],[aria-hidden="true"]')&&(!el.getClientRects||el.getClientRects().length>0);
 const first=(root,selector)=>[...root.querySelectorAll(selector)].find(visible);
 const clean=el=>(el?.innerText||el?.textContent||'').trim();
 const url=new URL(globalThis.location.href);
 if(url.hostname!=='www.tiktok.com'||url.pathname.replace(/\/$/,'').toLowerCase()!==`/@${channel}/live`){delete globalThis.__naraTikTokReader;return {status:'waiting',reason:'location',rows:[]};}
 const challenge=first(doc,'[id*="captcha"],iframe[src*="captcha"],[data-e2e="verify-center"]');
 const login=[...doc.querySelectorAll('[role="dialog"],[data-e2e="login-modal"]')].find(el=>visible(el)&&/log in|sign in|masuk|login/i.test(clean(el)));
 if(challenge||login){delete globalThis.__naraTikTokReader;return {status:'waiting',reason:challenge?'captcha':'login',rows:[]};}
 const ended=[...doc.querySelectorAll('h1,h2,h3,[data-e2e="live-end"],[data-e2e="live-ended"]')].some(el=>visible(el)&&/LIVE (has )?ended|isn.t LIVE|not (currently )?live|siaran.*berakhir|LIVE.*berakhir|sedang tidak (LIVE|siaran)/i.test(clean(el)));
 if(ended){delete globalThis.__naraTikTokReader;return {status:'ended',rows:[]};}
 const candidates=[...doc.querySelectorAll('[data-e2e="chat-message"],.webcast-chatroom___item,.text-UIText1')];
 const parsed=[];
 for(const el of candidates){
  if(!visible(el)||el.closest('[data-e2e="enter-message"],[data-e2e="gift-message"],[data-e2e="follow-message"]'))continue;
  const authorEl=first(el,'[data-e2e="comment-username"],[data-e2e="message-owner-name"],.nickname,a[href*="/@"]');
  if(!authorEl)continue;
  let textEl=first(el,'[data-e2e="comment-text"],[data-e2e="chat-message-text"],.webcast-chatroom___content');
  if(!textEl&&el.classList.contains('text-UIText1')){const second=el.children[1];if(second&&!second.contains(authorEl))textEl=second;}
  const author=clean(authorEl).slice(0,80),text=clean(textEl).slice(0,1000);
  if(author&&text)parsed.push({el,author,text,id:el.getAttribute('data-message-id')||''});
 }
 // Never treat a mere open page as a connected reader. Require a recognizable comment pair.
 if(!parsed.length)return {status:'waiting',reason:'comments',rows:[]};
 let state=globalThis.__naraTikTokReader;
 const initial=!state;
 if(!state)state=globalThis.__naraTikTokReader={nodes:new WeakMap(),recent:new Map(),serial:0,epoch:Date.now()};
 const rows=[],now=Date.now();
 for(const {el,author,text,id} of parsed){
  const fingerprint=author+'\n'+text;
  if(state.nodes.get(el)===fingerprint)continue;
  state.nodes.set(el,fingerprint);
  const key=id?'id:'+id:fingerprint;
  const previous=state.recent.get(key);state.recent.set(key,now);
  if(initial||(previous&&now-previous<5000))continue;
  rows.push({id:id||`${state.epoch}-${++state.serial}`,author,text,timestamp:now});
 }
 for(const [key,time] of state.recent)if(now-time>60000)state.recent.delete(key);
 while(state.recent.size>2000)state.recent.delete(state.recent.keys().next().value);
 return {status:'connected',rows:rows.slice(-100)};
}
