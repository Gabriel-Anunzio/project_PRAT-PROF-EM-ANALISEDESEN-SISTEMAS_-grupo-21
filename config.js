'use strict';
function config(env){
  const production=env.NODE_ENV==='production';
  const port=Number(env.PORT||env.NEXO_PORT||3210);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Porta inválida.');
  const given=env.APP_URL||env.RENDER_EXTERNAL_URL;
  let origin='http://localhost:'+port;
  if(given){const url=new URL(given);if(production&&url.protocol!=='https:')throw new Error('APP_URL deve usar HTTPS.');origin=url.origin;}
  if(production&&!given)throw new Error('Configure APP_URL ou publique pelo Render (RENDER_EXTERNAL_URL automático).');
  return {production,port,origin,host:production?'0.0.0.0':'127.0.0.1',allowedHosts:new Set(production?[new URL(origin).host]:['localhost:'+port,'127.0.0.1:'+port]),cookie:'; HttpOnly; SameSite=Strict; Path=/'+(production?'; Secure':'')};
}
module.exports={config};
