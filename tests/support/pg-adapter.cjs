// Test-only pg adapter: executes the production SQL in embedded PostgreSQL.
// Loaded explicitly with --require; never imported by server.js in deployment.
const Module=require('node:module');
const {PGlite}=require('@electric-sql/pglite');
const original=Module._load;
class Pool {
  constructor(){this.db=new PGlite(process.env.NEXO_TEST_PGLITE_TEMP);}
  on(){}
  query(sql,params){return this.db.query(sql,params);}
  async connect(){return{query:(...args)=>this.query(...args),release(){}};}
  end(){return this.db.close();}
}
Module._load=function(name,...args){return name==='pg'?{Pool}:original.call(this,name,...args);};
