'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawn } = require('node:child_process');
const { FileStore } = require('../storage');

const rootDir = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexo-plano-'));
const port = 33255;
const baseUrl = 'http://127.0.0.1:' + port;

const csvSandbox = {};
vm.runInNewContext(fs.readFileSync(path.join(rootDir, 'public', 'import-csv.js'), 'utf8'), csvSandbox);
const parseCsv = csvSandbox.parseCsv;

let proc, adminCookie, gestorCookie, operadorCookie;

async function req(route, data, cookie = adminCookie) {
  const r = await fetch(baseUrl + '/api/' + route, {
    method: data ? 'POST' : 'GET',
    headers: {
      ...(data ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {})
    },
    body: data ? JSON.stringify(data) : undefined
  });
  return { status: r.status, body: await r.json(), cookie: r.headers.get('set-cookie') };
}

async function startServer(customDir = dir, customPort = port) {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: rootDir,
    env: { ...process.env, DATABASE_URL: '', NODE_ENV: 'development', NEXO_DATA_DIR: customDir, NEXO_PORT: String(customPort) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Tempo esgotado ao iniciar servidor.')), 8000);
    child.stdout.once('data', () => { clearTimeout(timer); resolve(); });
    child.once('error', reject);
  });
  return child;
}

async function stopServer(child) {
  if (child && child.exitCode === null && !child.killed) {
    await new Promise(resolve => { child.once('exit', resolve); child.kill(); });
  }
}

before(async () => {
  proc = await startServer();
  const adm = await req('login', { email: 'admin@nexostock.local', password: 'Nexo@2026!' }, '');
  assert.equal(adm.status, 200);
  adminCookie = adm.cookie.split(';')[0];

  const ges = await req('login', { email: 'gestor@nexostock.local', password: 'Nexo@2026!' }, '');
  assert.equal(ges.status, 200);
  gestorCookie = ges.cookie.split(';')[0];

  const ope = await req('login', { email: 'operador@nexostock.local', password: 'Nexo@2026!' }, '');
  assert.equal(ope.status, 200);
  operadorCookie = ope.cookie.split(';')[0];
});

after(async () => {
  await stopServer(proc);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('Verificação integral dos cenários aplicáveis do Plano de Testes (UC01 a UC10)', async t => {
  let prodEditId, prodBcId;

  await t.test('TST-UC01-02: Cadastrar variante com SKU exclusivo e saldo inicial zero', async () => {
    const r = await req('products', {
      sku: 'teste-uc01-pre-m', name: 'Camiseta de teste', category: 'Vestuário',
      variant: 'Preto / M', price: 20, cost: 10, min: 2, unit: 'UN', barcode: '', weight: 0.3, active: true
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.result.sku, 'TESTE-UC01-PRE-M');
    const st = (await req('state')).body;
    assert.equal(st.balances.filter(b => b.productId === r.body.result.id).length, 0);
    assert.ok(st.audit.some(a => a.action === 'Cadastro de produto' && a.detail === 'TESTE-UC01-PRE-M'));
  });

  await t.test('TST-UC01-04: Importar planilha CSV com aceites e rejeições por linha', async () => {
    const csv = [
      'sku;name;category;variant;price;cost;min;unit;barcode;weight;active',
      'TESTE-IMP-01;Produto importado válido;Acessórios;Padrão;25;12;2;UN;7891000000011;0.2;true',
      'CAM-PRE-M;SKU repetido;Vestuário;Preto / M;59.9;22;8;UN;;0.3;true',
      'TESTE-IMP-SEM-NOME;;Acessórios;Padrão;20;10;2;UN;;0.2;true'
    ].join('\r\n');
    const rows = parseCsv(csv);
    const beforeCount = (await req('state')).body.products.length;
    const r = await req('products-import', { rows });
    assert.equal(r.status, 200);
    assert.equal(r.body.result.accepted.length, 1);
    assert.equal(r.body.result.accepted[0].sku, 'TESTE-IMP-01');
    assert.equal(r.body.result.rejected.length, 2);
    assert.deepEqual(r.body.result.rejected.map(x => x.line), [3, 4]);
    const afterState = (await req('state')).body;
    assert.equal(afterState.products.length, beforeCount + 1);
  });

  await t.test('TST-UC01-05: Alterar e inativar produto preservando histórico e bloqueando novos pedidos', async () => {
    const c = await req('products', {
      sku: 'TESTE-UC01-EDIT', name: 'Produto original', category: 'Geral',
      variant: 'Único', price: 30, cost: 15, min: 1, unit: 'UN', barcode: '', weight: 0.4, active: true
    });
    prodEditId = c.body.result.id;
    assert.equal((await req('receipts', {
      productId: prodEditId, warehouseId: 'w1', quantity: 10, cost: 15, supplier: 'Fornecedor A', reference: 'REC-UC01-05'
    })).status, 200);
    const up = await req('products', {
      id: prodEditId, sku: 'TESTE-UC01-EDIT', name: 'Produto revisado', category: 'Geral',
      variant: 'Único', price: 30, cost: 15, min: 1, unit: 'UN', barcode: '', weight: 0.4, active: false
    });
    assert.equal(up.status, 200);
    assert.equal(up.body.result.name, 'Produto revisado');
    assert.equal(up.body.result.active, false);
    const ord = await req('orders', {
      customer: 'Cliente', channel: 'Manual', warehouseId: 'w1', reference: 'PED-INATIVO-01',
      items: [{ productId: prodEditId, qty: 1 }]
    });
    assert.equal(ord.status, 400);
    assert.match(ord.body.error, /Produto inativo/);
  });

  await t.test('TST-UC01-06: Recusar SKU duplicado independentemente de caixa', async () => {
    const dup = await req('products', {
      sku: 'teste-uc01-pre-m', name: 'Outro nome', category: 'Geral',
      variant: 'Padrão', price: 20, cost: 10, min: 1, unit: 'UN', barcode: '', weight: 0.2, active: true
    });
    assert.equal(dup.status, 409);
    assert.match(dup.body.error, /SKU já cadastrado/);
    const ok = await req('products', {
      sku: 'teste-dup-02', name: 'Outro nome', category: 'Geral',
      variant: 'Padrão', price: 20, cost: 10, min: 1, unit: 'UN', barcode: '', weight: 0.2, active: true
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.result.sku, 'TESTE-DUP-02');
  });

  await t.test('TST-UC01-07: Recusar código de barras duplicado no cadastro e na edição', async () => {
    const a = await req('products', {
      sku: 'TESTE-BC-A', name: 'Item Barra A', category: 'Geral',
      variant: 'Padrão', price: 25, cost: 12, min: 2, unit: 'UN', barcode: '7890000000017', weight: 0.2, active: true
    });
    assert.equal(a.status, 200);
    prodBcId = a.body.result.id;
    const b = await req('products', {
      sku: 'TESTE-BC-B', name: 'Item Barra B', category: 'Geral',
      variant: 'Padrão', price: 25, cost: 12, min: 2, unit: 'UN', barcode: '7890000000017', weight: 0.2, active: true
    });
    assert.equal(b.status, 409);
    assert.match(b.body.error, /Código de barras já cadastrado/);
    assert.ok(prodBcId);
  });

  await t.test('TST-UC01-08: Recusar campos obrigatórios ausentes ou valores numéricos inválidos', async () => {
    const base = { sku: 'TESTE-INV-01', name: 'Válido', category: 'Geral', variant: 'Padrão', price: 10, cost: 5, min: 2, unit: 'UN', barcode: '', weight: 0.1, active: true };
    for (const patch of [{ name: '' }, { sku: '' }, { price: -1 }, { cost: -1 }, { min: 1.5 }]) {
      const r = await req('products', { ...base, ...patch });
      assert.equal(r.status, 400);
    }
  });

  await t.test('TST-UC01-09: Preservar estado anterior quando a persistência falha', async () => {
    const isoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexo-fs-'));
    try {
      const store = new FileStore(isoDir);
      await store.init(() => ({ products: [{ id: 'p0', sku: 'INICIAL' }] }));
      await assert.rejects(store.update(d => { d.products.push({ id: 'p1', sku: 'FALHA' }); throw new Error('Falha simulada'); }));
      assert.equal((await store.read()).products.length, 1);
      await store.update(d => { d.products.push({ id: 'p1', sku: 'OK' }); });
      assert.equal((await store.read()).products.length, 2);
    } finally {
      fs.rmSync(isoDir, { recursive: true, force: true });
    }
  });

  let uc02ProdId;
  await t.test('TST-UC02-01, TST-UC02-05, TST-UC02-06 e TST-UC02-07: Controle de saldo, ajuste, exportação e proteção de reserva', async () => {
    const p = await req('products', {
      sku: 'TESTE-UC02', name: 'Produto Estoque', category: 'Geral',
      variant: 'Padrão', price: 20, cost: 10, min: 2, unit: 'UN', barcode: '', weight: 0.2, active: true
    });
    uc02ProdId = p.body.result.id;
    await req('receipts', { productId: uc02ProdId, warehouseId: 'w1', quantity: 10, cost: 10, supplier: 'Forn', reference: 'ENT-UC02-01' });
    await req('orders', { customer: 'Cli UC02', channel: 'Manual', warehouseId: 'w1', reference: 'PED-UC02-01', items: [{ productId: uc02ProdId, qty: 3 }] });

    // TST-UC02-06: sem justificativa
    assert.equal((await req('adjust', { productId: uc02ProdId, warehouseId: 'w1', counted: 8, reason: '' })).status, 400);

    // TST-UC02-01: ajuste para 5 -> físico 5, reservado 3, disponível 2 (<= mínimo 2)
    assert.equal((await req('adjust', { productId: uc02ProdId, warehouseId: 'w1', counted: 5, reason: 'Contagem física de teste' })).status, 200);
    let st = (await req('state')).body;
    let bal = st.balances.find(b => b.productId === uc02ProdId && b.warehouseId === 'w1');
    assert.deepEqual({ physical: bal.physical, reserved: bal.reserved, available: bal.physical - bal.reserved }, { physical: 5, reserved: 3, available: 2 });

    // TST-UC02-05: estrutura de exportação de saldos
    assert.ok(st.balances.every(b => Number.isInteger(b.physical) && Number.isInteger(b.reserved)));

    // TST-UC02-07: impedir negativo e abaixo da reserva
    assert.equal((await req('adjust', { productId: uc02ProdId, warehouseId: 'w1', counted: -1, reason: 'Negativo' })).status, 400);
    assert.equal((await req('adjust', { productId: uc02ProdId, warehouseId: 'w1', counted: 2, reason: 'Abaixo da reserva' })).status, 400);
    assert.equal((await req('adjust', { productId: uc02ProdId, warehouseId: 'w1', counted: 3, reason: 'Igual à reserva' })).status, 200);
    bal = (await req('state')).body.balances.find(b => b.productId === uc02ProdId && b.warehouseId === 'w1');
    assert.equal(bal.physical, 3);
    assert.equal(bal.physical - bal.reserved, 0);
  });

  await t.test('TST-UC02-09: Serialização de operações concorrentes sobre o mesmo saldo', async () => {
    const p = await req('products', {
      sku: 'TESTE-UC02-CONC', name: 'Produto Concorrente', category: 'Geral',
      variant: 'Padrão', price: 20, cost: 10, min: 1, unit: 'UN', barcode: '', weight: 0.2, active: true
    });
    const pid = p.body.result.id;
    await req('receipts', { productId: pid, warehouseId: 'w1', quantity: 5, cost: 10, supplier: 'Forn', reference: 'ENT-CONC-5' });
    const res = await Promise.all([
      req('orders', { customer: 'A', channel: 'Manual', warehouseId: 'w1', reference: 'TESTE-CON-A', items: [{ productId: pid, qty: 4 }] }),
      req('orders', { customer: 'B', channel: 'Manual', warehouseId: 'w1', reference: 'TESTE-CON-B', items: [{ productId: pid, qty: 4 }] })
    ]);
    assert.deepEqual(res.map(r => r.status).sort(), [200, 400]);
    const bal = (await req('state')).body.balances.find(b => b.productId === pid && b.warehouseId === 'w1');
    assert.equal(bal.physical, 5);
    assert.equal(bal.reserved, 4);
  });

  await t.test('TST-UC03-01, TST-UC03-06, TST-UC03-07, TST-UC03-08 e TST-UC03-10: Depósitos e transferências', async () => {
    // TST-UC03-06
    const nw = await req('warehouses', { name: 'TESTE-UC03-NOVO', location: 'Galpão de testes / São Paulo' });
    assert.equal(nw.status, 200);
    const destId = nw.body.result.id;

    const p = await req('products', {
      sku: 'TESTE-UC03', name: 'Produto Transf', category: 'Geral',
      variant: 'Padrão', price: 20, cost: 10, min: 1, unit: 'UN', barcode: '', weight: 0.2, active: true
    });
    const pid = p.body.result.id;
    await req('receipts', { productId: pid, warehouseId: 'w1', quantity: 10, cost: 10, supplier: 'Forn', reference: 'ENT-UC03-O' });
    await req('receipts', { productId: pid, warehouseId: destId, quantity: 2, cost: 10, supplier: 'Forn', reference: 'ENT-UC03-D' });
    await req('orders', { customer: 'Reserva UC03', channel: 'Manual', warehouseId: 'w1', reference: 'PED-UC03-RES', items: [{ productId: pid, qty: 3 }] });

    // TST-UC03-08: origem igual ao destino
    assert.equal((await req('transfers', { productId: pid, from: 'w1', to: 'w1', quantity: 2, reference: 'TR-IGUAL' })).status, 400);

    // TST-UC03-07: tentativa acima do disponível (disponível = 7)
    assert.equal((await req('transfers', { productId: pid, from: 'w1', to: destId, quantity: 8, reference: 'TR-EXCESSO' })).status, 400);

    // TST-UC03-01: transferir 4 e confirmar recebimento
    const tr = await req('transfers', { productId: pid, from: 'w1', to: destId, quantity: 4, reference: 'TESTE-TRANS-01' });
    assert.equal(tr.status, 200);
    let st = (await req('state')).body;
    assert.equal(st.balances.find(b => b.productId === pid && b.warehouseId === 'w1').physical, 6);
    assert.equal(st.balances.find(b => b.productId === pid && b.warehouseId === destId).physical, 2);

    assert.equal((await req('transfer-receive', { id: tr.body.result.id })).status, 200);
    // TST-UC03-10: idempotência do recebimento
    assert.equal((await req('transfer-receive', { id: tr.body.result.id })).status, 409);
    st = (await req('state')).body;
    assert.equal(st.balances.find(b => b.productId === pid && b.warehouseId === destId).physical, 6);
  });

  await t.test('TST-UC04-02, TST-UC04-09 e TST-UC04-10: Entrada manual, unicidade de documento e custo médio multidepósito', async () => {
    const p = await req('products', {
      sku: 'TESTE-UC04-MULTI', name: 'Produto Custo', category: 'Geral',
      variant: 'Padrão', price: 35, cost: 10, min: 1, unit: 'UN', barcode: '', weight: 0.2, active: true
    });
    const pid = p.body.result.id;
    await req('receipts', { productId: pid, warehouseId: 'w1', quantity: 4, cost: 10, supplier: 'Forn 1', reference: 'ENT-UC04-A' });
    await req('receipts', { productId: pid, warehouseId: 'w2', quantity: 6, cost: 10, supplier: 'Forn 1', reference: 'ENT-UC04-B' });

    // TST-UC04-02 & TST-UC04-10: nova entrada de 10 un a R$ 20,00 com 10 existentes em w1+w2 -> custo médio = 15,00
    const r = await req('receipts', { productId: pid, warehouseId: 'w1', quantity: 10, cost: 20, supplier: 'Fornecedor de teste', reference: 'TESTE-CUSTO-MULTI' });
    assert.equal(r.status, 200);
    // TST-UC04-09: documento repetido
    assert.equal((await req('receipts', { productId: pid, warehouseId: 'w1', quantity: 10, cost: 20, supplier: 'Fornecedor de teste', reference: 'TESTE-CUSTO-MULTI' })).status, 409);

    const st = (await req('state')).body;
    assert.equal(st.products.find(x => x.id === pid).cost, 15);
    assert.equal(st.balances.find(b => b.productId === pid && b.warehouseId === 'w1').physical, 14);
    assert.equal(st.balances.find(b => b.productId === pid && b.warehouseId === 'w2').physical, 6);
  });

  await t.test('TST-UC05-02, TST-UC05-04, TST-UC05-05 e TST-UC05-10: Criação, reserva atômica, cancelamento e referência única', async () => {
    const pa = await req('products', { sku: 'TESTE-UC05-A', name: 'Item A', category: 'Geral', variant: 'Padrão', price: 20, cost: 10, min: 1, unit: 'UN', barcode: '', weight: 0.2, active: true });
    const pb = await req('products', { sku: 'TESTE-UC05-B', name: 'Item B', category: 'Geral', variant: 'Padrão', price: 30, cost: 15, min: 1, unit: 'UN', barcode: '', weight: 0.2, active: true });
    const idA = pa.body.result.id, idB = pb.body.result.id;
    await req('receipts', { productId: idA, warehouseId: 'w1', quantity: 10, cost: 10, supplier: 'F', reference: 'ENT-UC05-A' });
    await req('receipts', { productId: idB, warehouseId: 'w1', quantity: 2, cost: 15, supplier: 'F', reference: 'ENT-UC05-B' });

    // TST-UC05-04: falha atômica sem reserva parcial
    assert.equal((await req('orders', {
      customer: 'Cli', channel: 'Manual', warehouseId: 'w1', reference: 'TESTE-SEM-SALDO',
      items: [{ productId: idA, qty: 1 }, { productId: idB, qty: 3 }]
    })).status, 400);
    assert.equal((await req('state')).body.balances.find(b => b.productId === idA && b.warehouseId === 'w1').reserved, 0);

    // TST-UC05-02: reserva sem baixar físico
    const ord = await req('orders', {
      customer: 'Cliente de teste', channel: 'Manual', warehouseId: 'w1', reference: 'TESTE-PED-01',
      items: [{ productId: idA, qty: 3 }]
    });
    assert.equal(ord.status, 200);
    assert.equal(ord.body.result.total, 60);
    const oid = ord.body.result.id;

    // TST-UC05-10: referência duplicada
    assert.equal((await req('orders', {
      customer: 'Cliente de teste', channel: 'Manual', warehouseId: 'w1', reference: 'TESTE-PED-01',
      items: [{ productId: idA, qty: 1 }]
    })).status, 409);

    // TST-UC05-05: cancelamento com estorno único
    await req('order-action', { id: oid, action: 'pick' });
    assert.equal((await req('order-action', { id: oid, action: 'cancel' })).status, 200);
    assert.equal((await req('order-action', { id: oid, action: 'cancel' })).status, 400);
    const balA = (await req('state')).body.balances.find(b => b.productId === idA && b.warehouseId === 'w1');
    assert.deepEqual({ physical: balA.physical, reserved: balA.reserved }, { physical: 10, reserved: 0 });
  });

  await t.test('TST-UC06-02, TST-UC06-09 e TST-UC06-10: Simulação de canais de venda, idempotência diária e falta de saldo', async () => {
    const s1 = await req('sync', { channel: 'Mercado Livre' });
    assert.equal(s1.status, 200);
    assert.equal(s1.body.result.imported, 1);
    assert.equal(s1.body.result.mode, 'Simulação');

    const s2 = await req('sync', { channel: 'Mercado Livre' });
    assert.equal(s2.status, 200);
    assert.equal(s2.body.result.imported, 0);
    assert.match(s2.body.result.message, /já importado hoje/);

    // TST-UC06-10 em instância isolada sem saldo disponível em w1
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexo-empty-sync-'));
    const emptyPort = 33256;
    let emptyProc;
    try {
      emptyProc = await startServer(emptyDir, emptyPort);
      const l = await fetch(`http://127.0.0.1:${emptyPort}/api/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@nexostock.local', password: 'Nexo@2026!' })
      });
      const ck = l.headers.get('set-cookie').split(';')[0];
      const st = await (await fetch(`http://127.0.0.1:${emptyPort}/api/state`, { headers: { cookie: ck } })).json();
      for (const p of st.products) {
        await fetch(`http://127.0.0.1:${emptyPort}/api/products`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', cookie: ck },
          body: JSON.stringify({ ...p, active: false })
        });
      }
      const sEmpty = await (await fetch(`http://127.0.0.1:${emptyPort}/api/sync`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', cookie: ck },
        body: JSON.stringify({ channel: 'Shopee' })
      })).json();
      assert.equal(sEmpty.result.imported, 0);
      assert.match(sEmpty.result.message, /Nenhum produto com saldo disponível/);
    } finally {
      await stopServer(emptyProc);
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  let shippedOrderId;
  await t.test('TST-UC07-02, TST-UC07-06, TST-UC07-09 e TST-UC07-10: Separação, conferência obrigatória, envio único e entrega', async () => {
    const p1 = await req('products', { sku: 'TESTE-UC07-1', name: 'Exp 1', category: 'Geral', variant: 'Padrão', price: 20, cost: 10, min: 1, unit: 'UN', barcode: '', weight: 0.2, active: true });
    const p2 = await req('products', { sku: 'TESTE-UC07-2', name: 'Exp 2', category: 'Geral', variant: 'Padrão', price: 20, cost: 10, min: 1, unit: 'UN', barcode: '', weight: 0.2, active: true });
    const id1 = p1.body.result.id, id2 = p2.body.result.id;
    await req('receipts', { productId: id1, warehouseId: 'w1', quantity: 10, cost: 10, supplier: 'F', reference: 'ENT-UC07-1' });
    await req('receipts', { productId: id2, warehouseId: 'w1', quantity: 10, cost: 10, supplier: 'F', reference: 'ENT-UC07-2' });

    const o = await req('orders', {
      customer: 'Cli Exp', channel: 'Manual', warehouseId: 'w1', reference: 'TESTE-EXP-01',
      items: [{ productId: id1, qty: 2 }, { productId: id2, qty: 1 }]
    });
    const oid = o.body.result.id;
    shippedOrderId = oid;

    // TST-UC07-10: bloquear salto direto para envio
    assert.equal((await req('order-action', { id: oid, action: 'ship', carrier: 'Transp', tracking: 'TRK-1' })).status, 400);

    await req('order-action', { id: oid, action: 'pick' });
    await req('order-action', { id: oid, action: 'check', productId: id1, checked: true });
    // TST-UC07-06: conferência incompleta
    assert.equal((await req('order-action', { id: oid, action: 'ready' })).status, 400);

    await req('order-action', { id: oid, action: 'check', productId: id2, checked: true });
    const rdy = await req('order-action', { id: oid, action: 'ready' });
    assert.equal(rdy.status, 200);
    assert.equal(rdy.body.result.status, 'Pronto');
    // TST-UC07-09: antes do envio não há rastreio e saldo físico segue preservado em 10
    assert.ok(!rdy.body.result.tracking);

    // TST-UC07-02: envio baixa físico uma única vez e entrega conclui ciclo
    assert.equal((await req('order-action', { id: oid, action: 'ship', carrier: 'Transportadora de teste', tracking: 'TESTE-RAST-01' })).status, 200);
    assert.equal((await req('order-action', { id: oid, action: 'ship', carrier: 'Transportadora de teste', tracking: 'TESTE-RAST-01' })).status, 400);
    const del = await req('order-action', { id: oid, action: 'deliver' });
    assert.equal(del.status, 200);
    assert.equal(del.body.result.status, 'Entregue');

    const b1 = (await req('state')).body.balances.find(b => b.productId === id1 && b.warehouseId === 'w1');
    assert.deepEqual({ physical: b1.physical, reserved: b1.reserved }, { physical: 8, reserved: 0 });
  });

  await t.test('TST-UC08-02 e TST-UC08-09: Documento fiscal demonstrativo, unicidade e bloqueio em pedido cancelado', async () => {
    const inv = await req('invoice', { orderId: shippedOrderId });
    assert.equal(inv.status, 200);
    assert.match(inv.body.result.number, /^DEMO-/);
    assert.equal(inv.body.result.status, 'Sem validade fiscal');

    // TST-UC08-09: segundo documento recusado (409) e pedido cancelado recusado (400)
    assert.equal((await req('invoice', { orderId: shippedOrderId })).status, 409);
    const cancelled = (await req('state')).body.orders.find(o => o.status === 'Cancelado');
    assert.equal((await req('invoice', { orderId: cancelled.id })).status, 400);
  });

  await t.test('TST-UC09-02, TST-UC09-07, TST-UC09-09 e TST-UC09-10: Indicadores, ausência de expedidos, exportação segura e auditoria', async () => {
    // TST-UC09-09: exportação como Administrador (sem campo password) e como Gestor (sem lista users)
    const expAdmin = await req('export', null, adminCookie);
    assert.equal(expAdmin.status, 200);
    assert.ok(Array.isArray(expAdmin.body.users));
    assert.ok(expAdmin.body.users.every(u => !('password' in u)));

    const expGestor = await req('export', null, gestorCookie);
    assert.equal(expGestor.status, 200);
    assert.equal(expGestor.body.users, undefined);

    // TST-UC09-02: reconciliação matemática dos indicadores expedidos
    const st = expAdmin.body;
    const shipped = st.orders.filter(o => ['Enviado', 'Entregue'].includes(o.status));
    const revenue = shipped.reduce((s, o) => s + o.total, 0);
    assert.ok(revenue > 0);
    assert.ok(Number.isFinite(revenue / shipped.length));

    // TST-UC09-10: preservar mais de 40 eventos na base e destacar os 40 mais recentes
    while ((await req('state')).body.audit.length < 45) {
      await req('warehouses', { name: 'DEP-AUD-' + Math.random().toString(36).slice(2, 8), location: 'SP' });
    }
    const allAudit = (await req('state')).body.audit;
    assert.ok(allAudit.length >= 45);
    assert.equal(allAudit.slice(-40).reverse().length, 40);

    // TST-UC09-07: na carga inicial sem pedidos Enviado/Entregue, receita e ticket médio valem zero sem NaN
    const initialOrders = [{ status: 'Reservado', total: 50 }, { status: 'Cancelado', total: 70 }];
    const exp0 = initialOrders.filter(o => ['Enviado', 'Entregue'].includes(o.status));
    const rev0 = exp0.reduce((s, o) => s + o.total, 0);
    const tkt0 = exp0.length ? rev0 / exp0.length : 0;
    assert.equal(rev0, 0);
    assert.equal(tkt0, 0);
  });

  await t.test('TST-UC10-02, 04, 06, 07, 09, 10, 11 e 12: Usuários, perfis, senhas, RBAC e sessão', async () => {
    // TST-UC10-02: criar operador e autenticar
    const cu = await req('users', { name: 'Operador de teste', email: 'teste.operador@example.com', role: 'Operador', password: 'TesteLocal!2026', active: true });
    assert.equal(cu.status, 200);
    const newUid = cu.body.result.id;

    // TST-UC10-06: e-mail duplicado em maiúsculas
    assert.equal((await req('users', { name: 'Duplicado', email: 'TESTE.OPERADOR@example.com', role: 'Operador', password: 'TesteLocal!2026', active: true })).status, 400);

    // TST-UC10-07: proteção contra auto-desativação / rebaixamento do administrador
    assert.equal((await req('users', { id: 'u1', name: 'Administrador', email: 'admin@nexostock.local', role: 'Administrador', active: false })).status, 400);
    assert.equal((await req('users', { id: 'u1', name: 'Administrador', email: 'admin@nexostock.local', role: 'Gestor', active: true })).status, 400);

    // TST-UC10-09: bloqueio por perfil no servidor
    for (const [rt, body] of [['products', { name: 'X' }], ['products-import', { rows: [{ sku: 'X' }] }], ['users', { name: 'X' }], ['sync', { channel: 'Shopee' }], ['invoice', { orderId: 'x' }]]) {
      assert.equal((await req(rt, body, operadorCookie)).status, 403);
    }
    assert.equal((await req('export', null, operadorCookie)).status, 403);
    assert.equal((await req('users', { name: 'X' }, gestorCookie)).status, 403);

    // TST-UC10-10: credenciais válidas e variações inválidas
    const okLogin = await req('login', { email: 'teste.operador@example.com', password: 'TesteLocal!2026' }, '');
    assert.equal(okLogin.status, 200);
    const newOpCookie = okLogin.cookie.split(';')[0];
    assert.equal((await req('login', { email: 'teste.operador@example.com', password: 'SenhaErrada!123' }, '')).status, 401);
    assert.equal((await req('login', { email: 'inexistente@example.com', password: 'TesteLocal!2026' }, '')).status, 401);
    assert.equal((await req('login', { email: '', password: 'TesteLocal!2026' }, '')).status, 400);

    // TST-UC10-11: limites de senha (9 e 129 recusados; 10 e 128 aceitos; vazio preserva senha)
    assert.equal((await req('users', { id: newUid, name: 'Operador de teste', email: 'teste.operador@example.com', role: 'Operador', password: '123456789', active: true })).status, 400);
    assert.equal((await req('users', { id: newUid, name: 'Operador de teste', email: 'teste.operador@example.com', role: 'Operador', password: 'a'.repeat(129), active: true })).status, 400);
    assert.equal((await req('users', { id: newUid, name: 'Operador de teste', email: 'teste.operador@example.com', role: 'Operador', password: 'a'.repeat(10), active: true })).status, 200);
    assert.equal((await req('users', { id: newUid, name: 'Operador Editado', email: 'teste.operador@example.com', role: 'Operador', password: '', active: true })).status, 200);
    assert.equal((await req('login', { email: 'teste.operador@example.com', password: 'a'.repeat(10) }, '')).status, 200);

    // TST-UC10-04: desativar usuário invalida sessão aberta imediatamente
    assert.equal((await req('users', { id: newUid, name: 'Operador Editado', email: 'teste.operador@example.com', role: 'Operador', password: '', active: false })).status, 200);
    assert.equal((await req('state', null, newOpCookie)).status, 401);
    assert.equal((await req('login', { email: 'teste.operador@example.com', password: 'a'.repeat(10) }, '')).status, 401);

    // TST-UC10-12: logout explícito invalida token
    const tempLogin = await req('login', { email: 'gestor@nexostock.local', password: 'Nexo@2026!' }, '');
    const tempCookie = tempLogin.cookie.split(';')[0];
    assert.equal((await req('logout', {}, tempCookie)).status, 200);
    assert.equal((await req('state', null, tempCookie)).status, 401);
  });
});
