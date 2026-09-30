'use strict';
const fs=require('node:fs');
const path=require('node:path');

// One JSONB aggregate preserves the first iteration's data model. The row lock
// makes each stock operation atomic; it is intentionally not a normalized ERP.
class PostgresStore {
  constructor(pool){this.pool=pool;this.mode='postgres';this.pending=Promise.resolve();}
  async init(createSeed){
    await this.pool.query('CREATE TABLE IF NOT EXISTS nexostock_state (id integer PRIMARY KEY CHECK (id = 1), payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())');
    const existing=await this.pool.query('SELECT payload FROM nexostock_state WHERE id = 1');
    if(!existing.rows.length) await this.pool.query('INSERT INTO nexostock_state (id,payload) VALUES (1,$1::jsonb) ON CONFLICT (id) DO NOTHING',[JSON.stringify(createSeed())]);
    return this.read();
  }
  async read(){const r=await this.pool.query('SELECT payload FROM nexostock_state WHERE id = 1');if(!r.rows.length)throw new Error('Estado da aplicação não encontrado.');return r.rows[0].payload;}
  update(fn){
    const job=this.pending.then(async()=>{
      const client=await this.pool.connect();
      try{
        await client.query('BEGIN');
        const r=await client.query('SELECT payload FROM nexostock_state WHERE id = 1 FOR UPDATE');
        if(!r.rows.length)throw new Error('Estado da aplicação não encontrado.');
        const next=r.rows[0].payload,result=fn(next);
        await client.query('UPDATE nexostock_state SET payload=$1::jsonb, updated_at=now() WHERE id=1',[JSON.stringify(next)]);
        await client.query('COMMIT');return {data:next,result};
      }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}finally{client.release();}
    });
    this.pending=job.catch(()=>{});return job;
  }
  async close(){await this.pending;await this.pool.end();}
}
class FileStore {
  constructor(directory){this.directory=directory;this.file=path.join(directory,'nexostock.json');this.mode='local';}
  async init(createSeed){fs.mkdirSync(this.directory,{recursive:true});if(!fs.existsSync(this.file))this.write(createSeed());this.backup();return this.read();}
  write(data){const tmp=this.file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(data,null,2));fs.renameSync(tmp,this.file);}
  async read(){return JSON.parse(fs.readFileSync(this.file,'utf8'));}
  async update(fn){const data=JSON.parse(fs.readFileSync(this.file,'utf8'));const result=fn(data);this.write(data);this.backup();return{data,result};}
  backup(){const dir=path.join(this.directory,'backups');fs.mkdirSync(dir,{recursive:true});const name=new Date().toISOString().slice(0,10)+'.json';const dest=path.join(dir,name);if(!fs.existsSync(dest))fs.copyFileSync(this.file,dest);const files=fs.readdirSync(dir).filter(n=>/^\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort();for(const n of files.slice(0,-30))fs.unlinkSync(path.join(dir,n));}
  async close(){}
}
function createStore(env,root){
  if(env.DATABASE_URL){
    const {Pool}=require('pg');
    const url=new URL(env.DATABASE_URL);
    if(!['postgres:','postgresql:'].includes(url.protocol))throw new Error('DATABASE_URL deve ser uma conexão PostgreSQL.');
    const local=['localhost','127.0.0.1','::1','[::1]'].includes(url.hostname);
    // Enforce certificate verification for remote databases, including Neon.
    for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);
    const pool=new Pool({connectionString:url.toString(),ssl:local?false:{rejectUnauthorized:true},max:3,connectionTimeoutMillis:15000,idleTimeoutMillis:10000,statement_timeout:15000});
    pool.on('error',()=>console.error('Uma conexão de banco foi encerrada; será restabelecida na próxima operação.'));
    return new PostgresStore(pool);
  }
  if(env.NODE_ENV==='production')throw new Error('Configure DATABASE_URL para manter os dados da publicação.');
  return new FileStore(env.NEXO_DATA_DIR||path.join(root,'data'));
}
module.exports={createStore,PostgresStore,FileStore};
