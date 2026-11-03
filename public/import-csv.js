'use strict';
// Iteração 2: importação CSV. A API valida novamente todos os valores e permissões.
function parseCsv(text){
  const raw=text.replace(/^\uFEFF/,'');const first=raw.split(/\r?\n/,1)[0];
  const separator=(first.match(/;/g)||[]).length>=(first.match(/,/g)||[]).length?';':',';
  const rows=[];let current=[],cell='',quoted=false;
  for(let i=0;i<raw.length;i++){
    const c=raw[i];if(c==='"'){if(quoted&&raw[i+1]==='"'){cell+='"';i++}else quoted=!quoted;continue}
    if(!quoted&&(c===separator||c==='\n'||c==='\r')){
      current.push(cell.trim());cell='';
      if(c!==separator){if(current.some(v=>v!==''))rows.push(current);current=[];if(c==='\r'&&raw[i+1]==='\n')i++}
    }else cell+=c;
  }
  if(quoted)throw new Error('CSV contém aspas não fechadas.');
  current.push(cell.trim());if(current.some(v=>v!==''))rows.push(current);
  const expected=['sku','name','category','variant','price','cost','min','unit','barcode','weight','active'];
  const header=(rows.shift()||[]).map(s=>s.toLowerCase());
  if(expected.some(field=>!header.includes(field)))throw new Error('Cabeçalho inválido. Use o modelo disponível para download.');
  if(!rows.length||rows.length>100)throw new Error('Informe entre 1 e 100 produtos no arquivo CSV.');
  return rows.map(cols=>{const o={};for(const name of expected)o[name]=cols[header.indexOf(name)]??'';return o});
}
function downloadCsvTemplate(){
  const csv='sku;name;category;variant;price;cost;min;unit;barcode;weight;active\r\nTESTE-V2-01;Produto exemplo;Acessórios;Padrão;20;10;2;UN;;0.3;true\r\n';
  const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='modelo-importacao-produtos.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function importProducts(){
  open('Importar produtos por CSV',\`<div class="notice blue">Use a planilha modelo com separador ponto e vírgula. A importação cadastra novas variantes sem estoque; o saldo deve ser lançado em Registrar entrada. Até 100 produtos por arquivo.</div><p><button type="button" class="btn" data-action="csv-template">Baixar modelo CSV</button></p><form id="csvform"><label class="field">Arquivo CSV<input type="file" name="file" accept=".csv,text/csv" required></label><div class="formerror" role="alert"></div><div class="modalfoot">\${btn('Cancelar','close')}<button type="submit" class="btn primary">Validar e importar</button></div></form>\`);
  document.querySelector('#csvform').onsubmit=async e=>{
    e.preventDefault();const f=e.currentTarget,button=f.querySelector('[type="submit"]'),error=f.querySelector('.formerror');
    button.disabled=true;error.textContent='';try{
      const file=f.elements.file.files[0];if(!file||file.size>100000)throw new Error('Arquivo ausente ou maior que 100 KB.');
      const rows=parseCsv(await file.text());const r=await api('products-import',{rows});
      await refresh();const result=r.result;
      open('Resultado da importação',\`<div class="notice blue"><strong>\${result.accepted.length} aceitos · \${result.rejected.length} rejeitados</strong></div>\${result.rejected.length?table(['Linha','Motivo'],result.rejected.map(x=>\`<tr><td>\${x.line}</td><td>\${esc(x.error)}</td></tr>\`)):'<p>Todos os registros foram aceitos.</p>'}<p class="small muted">Os produtos importados iniciam com saldo zero. Registre entradas para disponibilizá-los.</p><div class="modalfoot">\${btn('Concluir','close','','primary')}</div>\`);
    }catch(err){error.textContent=err.message}finally{button.disabled=false}
  };
}
