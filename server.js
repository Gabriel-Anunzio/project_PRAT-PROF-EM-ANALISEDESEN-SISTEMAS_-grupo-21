'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {createStore}=require('./storage');
const {config}=require('./config');
const cfg=config(process.env), ROOT=__dirname, PORT=cfg.port;
const storage=createStore(process.env,ROOT);
const hash = (p, salt = crypto.randomBytes(16).toString('hex')) => salt + ':' + crypto.scryptSync(p, salt, 64).toString('hex');
const match = (p, h) => { const [s, v] = h.split(':'); return crypto.timingSafeEqual(Buffer.from(v, 'hex'), crypto.scryptSync(p, s, 64)); };
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
function seed() {
  if(cfg.production&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.ADMIN_EMAIL||'')||!(process.env.ADMIN_PASSWORD?.length>=12)||process.env.ADMIN_PASSWORD.length>128||process.env.ADMIN_PASSWORD==='SUBSTITUA_POR_UMA_SENHA_FORTE'||process.env.ADMIN_PASSWORD==='Nexo@2026!'))throw new Error('Configure ADMIN_EMAIL e ADMIN_PASSWORD (12 a 128 caracteres) para o primeiro acesso.');
  const products = [
    ['p1','CAM-PRE-M','Camiseta Essential','Vestuário','Preto / M',59.9,22,8],
    ['p2','CAM-BRA-G','Camiseta Essential','Vestuário','Branco / G',59.9,22,8],
    ['p3','FON-BT-01','Fone Bluetooth Air','Eletrônicos','Preto',129.9,64,5],
    ['p4','GAR-750-AZ','Garrafa térmica 750 ml','Casa e lazer','Azul',89.9,38,6],
    ['p5','MOC-URB-01','Mochila Urban','Acessórios','Cinza',159.9,74,4],
    ['p6','CAB-USB-C','Cabo USB-C 2 metros','Eletrônicos','Branco',29.9,9,10]
  ].map(([id,sku,name,category,variant,price,cost,min])=>({id,sku,name,category,variant,price,cost,min,unit:'UN',barcode:'',weight:0.3,active:true}));
  const db = { schema:1, products, warehouses:[{id:'w1',name:'Depósito principal',location:'São Paulo / SP'},{id:'w2',name:'Depósito auxiliar',location:'Osasco / SP'}], balances:[], orders:[], movements:[], transfers:[], audit:[], sync:[], invoices:[], users:[
    {id:'u1',name:'Administrador',email:'admin@nexostock.local',role:'Administrador',active:true,password:hash('Nexo@2026!')},
    {id:'u2',name:'Operador de estoque',email:'operador@nexostock.local',role:'Operador',active:true,password:hash('Nexo@2026!')},
    {id:'u3',name:'Gestor',email:'gestor@nexostock.local',role:'Gestor',active:true,password:hash('Nexo@2026!')}
  ], receipts:[] };
  products.forEach((p,i)=> { for(const w of db.warehouses) { const qty = w.id==='w1'?[48,32,18,9,14,7][i]:[12,8,5,4,3,0][i]; db.balances.push({productId:p.id,warehouseId:w.id,physical:qty,reserved:0}); db.movements.push({id:uid(),at:now(),user:'Carga inicial',type:'Entrada',productId:p.id,warehouseId:w.id,quantity:qty,reference:'DEMO-INICIAL',balance:qty}); } });
  for (const [i,pid,q,channel,customer] of [[1,'p1',2,'Shopee','Cliente exemplo A'],[2,'p3',1,'Mercado Livre','Cliente exemplo B'],[3,'p4',3,'Loja virtual','Cliente exemplo C'],[4,'p5',1,'Shopee','Cliente exemplo D']]) {
    const p=products.find(p=>p.id===pid); const b=db.balances.find(b=>b.productId===pid&&b.warehouseId==='w1'); b.reserved+=q;
    db.orders.push({id:uid(),number:'NX-'+String(i).padStart(4,'0'),at:now(),customer,channel,warehouseId:'w1',status:i===2?'Separação':'Reservado',items:[{productId:pid,qty:q,price:p.price,checked:false}],total:Math.round(q*p.price*100)/100,reference:'DEMO-'+i});
    db.movements.push({id:uid(),at:now(),user:'Carga inicial',type:'Reserva',productId:pid,warehouseId:'w1',quantity:q,reference:'DEMO-'+i,balance:b.physical});
  }
  if(cfg.production)db.users=[{id:'u1',name:'Administrador',email:process.env.ADMIN_EMAIL.trim().toLowerCase(),role:'Administrador',active:true,password:hash(process.env.ADMIN_PASSWORD)}];
  return db;
}
let db;
const sessions=new Map(), attempts=new Map();
const rights = { Administrador:['products','stock','orders','ship','channels','fiscal','users','reports'], Gestor:['products','stock','orders','ship','channels','fiscal','reports'], Operador:['stock','orders','ship'] };
function fail(message,status=400) { const e=new Error(message); e.status=status; throw e; }
const str = (v,label,max=150) => { if(typeof v!=='string'||!v.trim()||v.trim().length>max) fail(label+' inválido.'); return v.trim(); };
const num = (v,label,min=0,max=1000000) => { const n=Number(v); if(v===null||v===''||!Number.isFinite(n)||n<min||n>max) fail(label+' inválido.'); return n; };
const qty = v => { const n=num(v,'Quantidade',1); if(!Number.isInteger(n)) fail('A quantidade deve ser inteira.'); return n; };
const money = n => Math.round(n*100)/100;
const find = (a,id,label) => a.find(v=>v.id===id)||fail(label+' não encontrado.',404);
function bal(d,p,w) { find(d.products,p,'Produto'); find(d.warehouses,w,'Depósito'); let b=d.balances.find(b=>b.productId===p&&b.warehouseId===w); if(!b) { b={productId:p,warehouseId:w,physical:0,reserved:0}; d.balances.push(b); } return b; }
function mv(d,u,type,p,w,q,ref) { d.movements.push({id:uid(),at:now(),user:u.name,type,productId:p,warehouseId:w,quantity:q,reference:ref,balance:bal(d,p,w).physical}); }
function audit(d,u,action,detail) { d.audit.push({id:uid(),at:now(),user:u.name,action,detail}); }
function invariant(d) { for(const b of d.balances) { if(!Number.isInteger(b.physical)||!Number.isInteger(b.reserved)||b.physical<0||b.reserved<0||b.reserved>b.physical) fail('Operação viola a integridade do estoque.'); const reserved=d.orders.filter(o=>o.warehouseId===b.warehouseId&&!['Enviado','Entregue','Cancelado'].includes(o.status)).reduce((s,o)=>s+o.items.filter(i=>i.productId===b.productId).reduce((s,i)=>s+i.qty,0),0); if(reserved!==b.reserved) fail('Inconsistência na reserva.'); } }
async function tx(u,action,fn) { const saved=await storage.update(next=>{const current=next.users.find(v=>v.id===u.id&&v.active);if(!current||current.role!==u.role)fail('Seu acesso foi alterado. Entre novamente.',403);const result=fn(next);invariant(next);audit(next,current,action,result?.number||result?.sku||result?.id||'Operação concluída');return result;});db=saved.data;return saved.result; }
function permit(u,right) { if(!rights[u.role]?.includes(right)) fail('Seu perfil não permite esta operação.',403); }
function place(d,u,b) {
  const reference=str(b.reference,'Referência',80); if(d.orders.some(o=>o.reference===reference)) fail('Referência já utilizada. O pedido não será duplicado.',409);
  const customer=str(b.customer,'Cliente'); const channel=str(b.channel,'Canal'); if(!['Shopee','Mercado Livre','Loja virtual','Manual'].includes(channel)) fail('Canal inválido.'); find(d.warehouses,b.warehouseId,'Depósito');
  if(!Array.isArray(b.items)||!b.items.length||b.items.length>100) fail('Adicione de 1 a 100 itens ao pedido.');
  const merged=new Map(); for(const i of b.items) merged.set(i.productId,(merged.get(i.productId)||0)+qty(i.qty));
  const items=Array.from(merged,([productId,q])=> { const p=find(d.products,productId,'Produto'); if(!p.active) fail('Produto inativo.'); const balance=bal(d,productId,b.warehouseId); if(balance.physical-balance.reserved<q) fail('Estoque insuficiente para '+p.sku+'.'); return {productId,qty:q,price:p.price,checked:false}; });
  const o={id:uid(),number:'NX-'+String(d.orders.length+1).padStart(4,'0'),at:now(),customer,channel,warehouseId:b.warehouseId,status:'Reservado',items,total:money(items.reduce((s,i)=>s+i.qty*i.price,0)),reference};
  for(const i of items) { bal(d,i.productId,b.warehouseId).reserved+=i.qty; mv(d,u,'Reserva',i.productId,b.warehouseId,i.qty,o.number); } d.orders.push(o); return o;
}
async function body(req) { let s=''; for await(const c of req) { s+=c; if(s.length>150000) fail('Dados muito grandes.',413); } try { return s?JSON.parse(s):{}; } catch { fail('JSON inválido.'); } }
function send(res,code,data,extra={}) { res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra}); res.end(JSON.stringify(data)); }
function authenticated(req) { const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('nexo_session='))?.slice(13); const session=sessions.get(token); if(!session||Date.now()-session.last>1800000) { sessions.delete(token); fail('Sua sessão expirou. Entre novamente.',401); } const user=db.users.find(u=>u.id===session.userId&&u.active); if(!user) fail('Acesso indisponível.',401); session.last=Date.now(); return {user,token}; }
function snapshot(u) { const d=structuredClone(db); d.users=d.users.map(({password,...u})=>u); if(u.role!=='Administrador') delete d.users; if(u.role==='Operador') { delete d.audit; delete d.sync; delete d.invoices; } return {...d,me:{id:u.id,name:u.name,email:u.email,role:u.role},permissions:rights[u.role]}; }
async function handle(req,res) {
  res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('X-Frame-Options','DENY'); res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'");
  try {
    const route=new URL(req.url,'http://localhost').pathname;
    if(route==='/api/health')return send(res,200,{ok:true,version:'1.1.0'});
    const host=req.headers.host||'';if(!cfg.allowedHosts.has(host))fail('Host não permitido.',403);
    const expectedOrigin=cfg.production?cfg.origin:'http://'+host;
    if(cfg.production)res.setHeader('Strict-Transport-Security','max-age=31536000');
    if(req.method!=='GET'&&req.method!=='HEAD'){if(req.headers.origin&&req.headers.origin!==expectedOrigin)fail('Origem não permitida.',403);if(!req.headers['content-type']?.startsWith('application/json'))fail('Use JSON para enviar dados.',415);}
    if(route==='/api/config'&&req.method==='GET')return send(res,200,{localDemo:!cfg.production,storage:storage.mode});
    if(route==='/api/login'&&req.method==='POST') {
      const ip=req.socket.remoteAddress||'unknown';const ipKey='ip:'+ip;const rate=attempts.get(ipKey)||{n:0,at:Date.now()};if(Date.now()-rate.at>60000){rate.n=0;rate.at=Date.now();}if(rate.n>=30)fail('Muitas tentativas. Aguarde um minuto.',429);rate.n++;attempts.set(ipKey,rate);
      const b=await body(req); const email=str(b.email,'E-mail').toLowerCase(); const pass=str(b.password,'Senha',128); const a=attempts.get(email)||{n:0,at:Date.now()}; if(Date.now()-a.at>60000) { a.n=0; a.at=Date.now(); } if(a.n>=5) fail('Aguarde um minuto antes de tentar novamente.',429); a.n++; attempts.set(email,a);
      const u=db.users.find(u=>u.email===email&&u.active); if(!u||!match(pass,u.password)) fail('E-mail ou senha incorretos.',401); attempts.delete(email); const token=crypto.randomBytes(32).toString('hex'); sessions.set(token,{userId:u.id,last:Date.now()}); return send(res,200,{name:u.name},{'Set-Cookie':'nexo_session='+token+cfg.cookie});
    }
    if(route.startsWith('/api/')) {
      const {user:u,token}=authenticated(req);
      if(route==='/api/logout'&&req.method==='POST') { sessions.delete(token); return send(res,200,{ok:true},{'Set-Cookie':'nexo_session=; Max-Age=0'+cfg.cookie}); }
      if(route==='/api/state'&&req.method==='GET') return send(res,200,snapshot(u));
      if(route==='/api/export'&&req.method==='GET') { permit(u,'reports'); return send(res,200,snapshot(u),{'Content-Disposition':'attachment; filename="nexostock-relatorio.json"'}); }
      if(req.method!=='POST') fail('Rota não encontrada.',404); const b=await body(req); let result;
      if(route==='/api/products') { permit(u,'products'); result=await tx(u,'Cadastro de produto',d=> { const sku=str(b.sku,'SKU',50).toUpperCase(); if(d.products.some(p=>p.sku===sku&&p.id!==b.id)) fail('SKU já cadastrado.',409); const p={id:b.id||uid(),sku,name:str(b.name,'Nome'),category:str(b.category,'Categoria'),variant:str(b.variant||'Padrão','Variante'),price:money(num(b.price,'Preço')),cost:money(num(b.cost,'Custo')),min:num(b.min,'Estoque mínimo'),unit:str(b.unit||'UN','Unidade',10),barcode:String(b.barcode||'').slice(0,30),weight:num(b.weight||0,'Peso'),active:b.active!==false}; if(!Number.isInteger(p.min)) fail('Estoque mínimo deve ser inteiro.'); if(b.id) d.products[d.products.indexOf(find(d.products,b.id,'Produto'))]=p; else d.products.push(p); return p; }); }
      else if(route==='/api/warehouses') { permit(u,'stock'); result=await tx(u,'Cadastro de depósito',d=> { const name=str(b.name,'Nome'); if(d.warehouses.some(w=>w.name.toLowerCase()===name.toLowerCase())) fail('Depósito já cadastrado.'); const w={id:uid(),name,location:str(b.location,'Localização')}; d.warehouses.push(w); return w; }); }
      else if(route==='/api/receipts') { permit(u,'stock'); result=await tx(u,'Entrada de mercadoria',d=> { const reference=str(b.reference,'Documento de origem',80); if(d.receipts.some(r=>r.reference===reference)) fail('Documento já registrado.',409); const q=qty(b.quantity), cost=money(num(b.cost,'Custo unitário')); const p=find(d.products,b.productId,'Produto'), balance=bal(d,b.productId,b.warehouseId); const physical=d.balances.filter(v=>v.productId===p.id).reduce((s,v)=>s+v.physical,0); p.cost=money((physical*p.cost+q*cost)/(physical+q)); balance.physical+=q; const r={id:uid(),at:now(),reference,supplier:str(b.supplier,'Fornecedor'),productId:p.id,warehouseId:b.warehouseId,quantity:q,cost}; d.receipts.push(r); mv(d,u,'Entrada',p.id,b.warehouseId,q,reference); return r; }); }
      else if(route==='/api/adjust') { permit(u,'stock'); result=await tx(u,'Ajuste de inventário',d=> { const reason=str(b.reason,'Justificativa'); const b0=bal(d,b.productId,b.warehouseId), counted=num(b.counted,'Contagem'); if(!Number.isInteger(counted)||counted<b0.reserved) fail('Contagem deve ser inteira e não pode ser menor que a reserva.'); const delta=counted-b0.physical; if(!delta) fail('A contagem já corresponde ao saldo físico.'); b0.physical=counted; mv(d,u,'Ajuste',b.productId,b.warehouseId,delta,reason); return {id:uid()}; }); }
      else if(route==='/api/transfers') { permit(u,'stock'); result=await tx(u,'Transferência entre depósitos',d=> { if(b.from===b.to) fail('Escolha depósitos diferentes.'); const q=qty(b.quantity), orig=bal(d,b.productId,b.from); bal(d,b.productId,b.to); if(orig.physical-orig.reserved<q) fail('Saldo disponível insuficiente.'); const reference=str(b.reference,'Referência'); if(d.transfers.some(t=>t.reference===reference)) fail('Referência já utilizada.',409); orig.physical-=q; const t={id:uid(),at:now(),productId:b.productId,from:b.from,to:b.to,quantity:q,reference,status:'Em trânsito'}; d.transfers.push(t); mv(d,u,'Transferência enviada',b.productId,b.from,-q,reference); return t; }); }
      else if(route==='/api/transfer-receive') { permit(u,'stock'); result=await tx(u,'Recebimento de transferência',d=> { const t=find(d.transfers,b.id,'Transferência'); if(t.status!=='Em trânsito') fail('Transferência já recebida.',409); bal(d,t.productId,t.to).physical+=t.quantity; t.status='Recebida'; t.receivedAt=now(); mv(d,u,'Transferência recebida',t.productId,t.to,t.quantity,t.reference); return t; }); }
      else if(route==='/api/orders') { permit(u,'orders'); result=await tx(u,'Criação e reserva de pedido',d=>place(d,u,b)); }
      else if(route==='/api/order-action') { permit(u,b.action==='ship'||b.action==='check'||b.action==='ready'?'ship':'orders'); result=await tx(u,'Pedido: '+b.action,d=> {
        const o=find(d.orders,b.id,'Pedido');
        if(b.action==='cancel') { if(['Enviado','Entregue','Cancelado'].includes(o.status)) fail('Este pedido não pode ser cancelado.'); for(const i of o.items) { bal(d,i.productId,o.warehouseId).reserved-=i.qty; mv(d,u,'Liberação de reserva',i.productId,o.warehouseId,-i.qty,o.number); } o.status='Cancelado'; }
        else if(b.action==='pick') { if(o.status!=='Reservado') fail('O pedido precisa estar reservado.'); o.status='Separação'; }
        else if(b.action==='check') { if(o.status!=='Separação') fail('Inicie a separação primeiro.'); const item=o.items.find(i=>i.productId===b.productId); if(!item) fail('Item inexistente.'); item.checked=b.checked===true; }
        else if(b.action==='ready') { if(o.status!=='Separação'||!o.items.every(i=>i.checked)) fail('Confira todos os itens antes de concluir a separação.'); o.status='Pronto'; }
        else if(b.action==='ship') { if(o.status!=='Pronto') fail('Conclua a separação antes de enviar.'); const tracking=str(b.tracking,'Rastreamento',70); for(const i of o.items) { const balance=bal(d,i.productId,o.warehouseId); balance.reserved-=i.qty; balance.physical-=i.qty; mv(d,u,'Saída por venda',i.productId,o.warehouseId,-i.qty,o.number); } o.status='Enviado'; o.tracking=tracking; o.carrier=str(b.carrier,'Transportadora'); o.shippedAt=now(); }
        else if(b.action==='deliver') { if(o.status!=='Enviado') fail('Somente pedidos enviados podem ser entregues.'); o.status='Entregue'; o.deliveredAt=now(); }
        else fail('Ação desconhecida.'); return o;
      }); }
      else if(route==='/api/sync') { permit(u,'channels'); result=await tx(u,'Sincronização simulada',d=> { const channel=str(b.channel,'Canal'); if(!['Shopee','Mercado Livre','Loja virtual'].includes(channel)) fail('Canal inválido.'); const ref='SIM-'+channel+'-'+now().slice(0,10); const existing=d.orders.find(o=>o.reference===ref); let imported=0, message='Pedido de demonstração já importado hoje.'; if(!existing) { const available=d.products.find(p=>p.active&&bal(d,p.id,'w1').physical-bal(d,p.id,'w1').reserved>=1); if(available) { place(d,u,{reference:ref,channel,customer:'Cliente de demonstração',warehouseId:'w1',items:[{productId:available.id,qty:1}]}); imported=1; message='Pedido de demonstração importado e estoque reservado.'; } else message='Nenhum produto com saldo disponível.'; } const log={id:uid(),at:now(),channel,imported,mode:'Simulação',message}; d.sync.push(log); return log; }); }
      else if(route==='/api/invoice') { permit(u,'fiscal'); result=await tx(u,'Documento fiscal simulado',d=> { const o=find(d.orders,b.orderId,'Pedido'); if(o.status==='Cancelado') fail('Pedido cancelado.'); if(d.invoices.some(i=>i.orderId===o.id)) fail('Documento já gerado.',409); const i={id:uid(),at:now(),orderId:o.id,number:'DEMO-'+String(d.invoices.length+1).padStart(5,'0'),mode:'Simulação',status:'Sem validade fiscal',total:o.total}; d.invoices.push(i); return i; }); }
      else if(route==='/api/users') { permit(u,'users'); result=await tx(u,'Administração de usuário',d=> { const email=str(b.email,'E-mail').toLowerCase(); if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('E-mail inválido.'); if(d.users.some(v=>v.email===email&&v.id!==b.id)) fail('E-mail já cadastrado.'); if(!rights[b.role]) fail('Perfil inválido.'); const active=b.active!==false; if(b.id===u.id&&(!active||b.role!=='Administrador')) fail('Você não pode desativar ou rebaixar seu próprio acesso.'); const existing=b.id?find(d.users,b.id,'Usuário'):null; let password=existing?.password; if(b.password) { if(typeof b.password!=='string'||b.password.length<10||b.password.length>128) fail('A senha deve ter entre 10 e 128 caracteres.'); password=hash(b.password); } if(!password) fail('Informe uma senha com pelo menos 10 caracteres.'); const v={id:b.id||uid(),name:str(b.name,'Nome'),email,role:b.role,active,password}; if(existing) d.users[d.users.indexOf(existing)]=v; else d.users.push(v); return {id:v.id}; }); }
      else fail('Rota não encontrada.',404);
      return send(res,200,{ok:true,result});
    }
    if(req.method!=='GET'&&req.method!=='HEAD') fail('Método não permitido.',405);
    const routes={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/style.css':'style.css','/favicon.svg':'favicon.svg','/guia':'../docs/guia-do-usuario.pdf','/diagrama':'../docs/diagrama-de-implantacao.pdf'};
    const rel=routes[route]; if(!rel) fail('Página não encontrada.',404); const f=path.join(ROOT,'public',rel); if(!fs.existsSync(f)) fail('Arquivo não encontrado.',404);
    const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.pdf':'application/pdf'};
    res.writeHead(200,{'Content-Type':types[path.extname(f)],'Cache-Control':'no-cache'}); if(req.method==='HEAD') res.end(); else fs.createReadStream(f).pipe(res);
  } catch(e) { if(!e.status) console.error('Falha interna na operação:',e.code||e.name); send(res,e.status||500,{error:e.status?e.message:'Não foi possível confirmar a operação. Atualize a página para verificar o resultado antes de repetir.'}); }
}
let apiQueue=Promise.resolve();
const server=http.createServer((req,res)=>{
  if(req.url.startsWith('/api/')&&!req.url.startsWith('/api/health')&&!req.url.startsWith('/api/config')){
    const job=apiQueue.then(async()=>{db=await storage.read();await handle(req,res);});
    apiQueue=job.catch(()=>{if(!res.headersSent)send(res,503,{error:'Banco temporariamente indisponível. Tente novamente.'});else if(!res.writableEnded)res.end();});
  }else handle(req,res);
});
server.requestTimeout=20000;server.headersTimeout=15000;
server.on('error', e=>{console.error(e.code==='EADDRINUSE'?'Porta em uso. Acesse '+cfg.origin:'Falha ao iniciar o servidor: '+e.code);process.exitCode=1;});
storage.init(seed).then(initial=>{db=initial;server.listen(PORT,cfg.host,()=>console.log('NexoStock disponível em '+cfg.origin));}).catch(e=>{console.error('Não foi possível iniciar. Verifique a configuração do banco e do administrador. '+(e.code||''));storage.close().finally(()=>{process.exitCode=1;});});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.close(()=>storage.close().finally(()=>process.exit(0)));setTimeout(()=>process.exit(1),10000).unref();});
setInterval(()=>{for(const [key,s] of sessions)if(Date.now()-s.last>1800000)sessions.delete(key);for(const[key,a]of attempts)if(Date.now()-a.at>60000)attempts.delete(key);},60000).unref();
