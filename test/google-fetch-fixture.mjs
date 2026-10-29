// Test-only Google responses. Loaded explicitly into the isolated test server.
globalThis.fetch=async(url,options={})=>{
  const u=new URL(url);
  if(u.origin==='https://oauth2.googleapis.com'&&u.pathname==='/token'){
    return Response.json({access_token:options.body.get('code'),expires_in:3600});
  }
  if(u.origin==='https://www.googleapis.com'&&u.pathname==='/youtube/v3/channels'){
    const token=options.headers.Authorization;
    if(token==='Bearer no-channel')return Response.json({items:[]});
    if(token==='Bearer api-disabled')return Response.json({error:{message:'YouTube Data API has not been used or is disabled.'}},{status:403});
    return Response.json({items:[{snippet:{title:'Test <channel>'}}]});
  }
  throw Error('Unexpected outbound request in Google fixture');
};
