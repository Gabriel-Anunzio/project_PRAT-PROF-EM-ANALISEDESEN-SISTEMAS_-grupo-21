'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');
const {config}=require('../config');
const {createStore,PostgresStore}=require('../storage');
const {PGlite}=require('@electric-sql/pglite');

test('Configuração online exige HTTPS e banco; cookie seguro',()=>{
  assert.throws(()=>config({NODE_ENV:'production'}),/APP_URL/);
  assert.throws(()=>config({NODE_ENV:'production',APP_URL:'http://example.com'}),/HTTPS/);
  assert.throws(()=>createStore({NODE_ENV:'production'},__dirname),/DATABASE_URL/);
  const c=config({NODE_ENV:'production',RENDER_EXTERNAL_URL:'https://nexo.example',PORT:'10000'});
  assert.equal(c.host,'0.0.0.0');assert.equal(c.port,10000);assert.match(c.cookie,/Secure/);
  assert.ok(c.allowedHosts.has('nexo.example'));assert.ok(!c.allowedHosts.has('evil.example'));
});
test('SQL PostgreSQL: rollback e transações concorrentes',async()=>{
  const pg=new PGlite();
  const pool={query:(...args)=>pg.query(...args),connect:async()=>({query:(...args)=>pg.query(...args),release(){}}),end:()=>pg.close()};
  const store=new PostgresStore(pool);
  try{
    await store.init(()=>({available:5,orders:[]}));
    await assert.rejects(store.update(d=>{d.available=0;throw new Error('recusar')}),/recusar/);
    assert.equal((await store.read()).available,5);
    const r=await Promise.allSettled([1,2].map(id=>store.update(d=>{if(d.available<4)throw new Error('Sem saldo');d.available-=4;d.orders.push(id);return id;})));
    assert.equal(r.filter(v=>v.status==='fulfilled').length,1);
    assert.equal((await store.read()).available,1);
    await store.init(()=>{throw new Error('Não deve semear novamente')});
  }finally{await store.close();}
});
test('Servidor online: administrador privado, domínio, origem e persistência',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nexo-pg-')),port=33220,url='http://127.0.0.1:'+port;
  let proc,cookie='';
  const admin='teste-publicacao@example.com',password='SomenteTeste!2046';
  async function start(){proc=spawn(process.execPath,['--require','./tests/support/pg-adapter.cjs','server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,NODE_ENV:'production',PORT:String(port),DATABASE_URL:'postgresql://test:test@localhost/test',APP_URL:'https://nexo.example',ADMIN_EMAIL:admin,ADMIN_PASSWORD:password,NEXO_TEST_PGLITE_TEMP:dir},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Inicialização excedeu o prazo')),15000);proc.stdout.once('data',()=>{clearTimeout(timer);resolve()});proc.once('exit',code=>{clearTimeout(timer);reject(new Error('Servidor encerrou: '+code))});proc.once('error',reject)});}
  async function stop(){if(proc&&proc.exitCode===null)await new Promise(resolve=>{proc.once('exit',resolve);proc.kill()});}
  async function req(route,data,headers={}){return new Promise((resolve,reject)=>{const r=require('node:http').request({hostname:'127.0.0.1',port,path:'/api/'+route,method:data?'POST':'GET',headers:{Host:'nexo.example',...(data?{'Content-Type':'application/json',Origin:'https://nexo.example'}:{}),...(cookie?{Cookie:cookie}:{}),...headers}},res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>{try{resolve({status:res.statusCode,data:JSON.parse(text),cookie:res.headers['set-cookie']?.[0]})}catch(e){reject(e)}})});r.on('error',reject);r.end(data?JSON.stringify(data):undefined);});}
  try{
    await start();
    await t.test('Config pública sem acesso demo ou segredos',async()=>{const r=await req('config');assert.deepEqual(r.data,{localDemo:false,storage:'postgres'});assert.equal((await req('state')).status,401);});
    await t.test('Credenciais locais recusadas; login privado aceito',async()=>{assert.equal((await req('login',{email:'admin@nexostock.local',password:'Nexo@2026!'})).status,401);const r=await req('login',{email:admin,password});assert.equal(r.status,200);assert.match(r.cookie,/HttpOnly/);assert.match(r.cookie,/Secure/);cookie=r.cookie.split(';')[0];const state=(await req('state')).data;assert.equal(state.users.length,1);assert.equal(state.users[0].email,admin);assert.ok(!state.users[0].password);});
    await t.test('Host e origem não autorizados recusados',async()=>{assert.equal((await req('state',null,{Host:'evil.example'})).status,403);assert.equal((await req('warehouses',{name:'X',location:'X'},{Origin:'https://evil.example'})).status,403);});
    await t.test('Persistência PostgreSQL após reiniciar aplicação',async()=>{const r=await req('warehouses',{name:'Depósito persistente',location:'Teste SQL'});assert.equal(r.status,200);const id=r.data.result.id;await stop();cookie='';await start();const login=await req('login',{email:admin,password});cookie=login.cookie.split(';')[0];assert.ok((await req('state')).data.warehouses.some(w=>w.id===id));});
  }finally{await stop();fs.rmSync(dir,{recursive:true,force:true});}
});
