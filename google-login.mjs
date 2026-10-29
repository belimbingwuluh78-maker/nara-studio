import {spawn} from 'node:child_process';

export function googleClient(document,redirectUri){
  const c=document?.web;
  if(!c)throw Error('Choose a Google Web application client JSON file. Service account and Desktop app files are not supported.');
  if(typeof c.client_id!=='string'||!/^[-\w]+\.apps\.googleusercontent\.com$/.test(c.client_id)||typeof c.client_secret!=='string'||!c.client_secret.trim()||c.client_secret.length>500)throw Error('The Google file does not contain a valid Client ID and Client Secret. Download it again from Google Cloud.');
  if(!Array.isArray(c.redirect_uris)||!c.redirect_uris.includes(redirectUri))throw Error('The redirect URI does not match. Add '+redirectUri+' to Authorized redirect URIs, then download the JSON file again.');
  return {clientId:c.client_id,clientSecret:c.client_secret};
}

export function googleError(error){
  const s=String(error?.message||error);
  if(/access_denied|YouTube access/.test(s))return 'Sign-in was canceled or YouTube access was not granted. Try again and allow YouTube access. If the app is in Testing, add your Google account as a test user in Google Cloud.';
  if(/redirect_uri_mismatch/.test(s))return 'The redirect URI does not match. Set Authorized redirect URIs in Google Cloud to the address shown in Google setup.';
  if(/invalid_client|deleted_client/.test(s))return 'The Google app configuration was rejected. Download the latest client JSON and import it through Google setup.';
  if(/accessNotConfigured|SERVICE_DISABLED|has not been used|is disabled/.test(s))return 'Enable YouTube Data API v3 in this app\'s Google Cloud project, then sign in again.';
  if(/invalid_grant/.test(s))return 'The Google session has expired or was already used. Click Sign in with Google again.';
  if(/fetch failed|timeout|aborted/i.test(s))return 'The connection to Google failed or timed out. Check your internet connection and try again.';
  return s.slice(0,450);
}

const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function loginPage(ok,message){
  return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>YouTube sign-in · Nara</title><link rel="stylesheet" href="/style.css"><body class="loginResult"><main class="card"><div class="eyebrow">NARA / YOUTUBE</div><h1>'+ (ok?'YouTube connected':'Sign-in incomplete')+'</h1><p>'+escape(message)+'</p><p>You can close this tab and return to your open studio.</p><a href="/">Open studio →</a></main></body></html>';
}

// Only server-generated Google authorization URLs are accepted. Never invoke a shell with user input.
export async function openGoogleBrowser(url){
  const u=new URL(url);
  if(u.origin!=='https://accounts.google.com'||u.pathname!=='/o/oauth2/v2/auth')throw Error('Invalid sign-in URL.');
  if(process.platform!=='win32')return false;
  const command="Start-Process -FilePath $env:NARA_GOOGLE_LOGIN_URL";
  return new Promise(resolve=>{
    const p=spawn('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(command,'utf16le').toString('base64')],{windowsHide:true,env:{...process.env,NARA_GOOGLE_LOGIN_URL:url},stdio:'ignore'});
    const timer=setTimeout(()=>{p.kill();resolve(false);},10000);
    p.once('error',()=>{clearTimeout(timer);resolve(false);});
    p.once('exit',code=>{clearTimeout(timer);resolve(code===0);});
  });
}
