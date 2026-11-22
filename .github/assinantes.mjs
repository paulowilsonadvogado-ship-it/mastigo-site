// Lê as assinaturas do plano "Mastigô mensal" (código MASTIGO-MENSAL) na API do Mercado Pago e grava
// assinantes.json. O arquivo é público (fica no site), então leva só um código embaralhado do e-mail
// (SHA-256 com sal, 20 caracteres) e a situação. Os registros do GitHub mostram só contagens.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const TOKEN = process.env.MP_ACCESS_TOKEN;
const SAL = 'mastigo-assinantes-v1';
const DIAS_TESTE = 7;
if (!TOKEN) { console.error('Falta o segredo MP_ACCESS_TOKEN (Settings › Secrets and variables › Actions).'); process.exit(1); }

// Quando o Mercado Pago pede para esperar (429, limite de consultas) ou fica fora do ar (5xx), tenta de novo
// até 4 vezes; se continuar, encerra sem erro e a próxima conferência tenta outra vez (sem e-mail de falha).
const espera = ms => new Promise(r => setTimeout(r, ms));
async function api(caminho) {
  let r;
  for (let t = 0; t < 5; t++) {
    r = await fetch('https://api.mercadopago.com' + caminho, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (r.status !== 429 && r.status < 500) break;
    if (t === 4) { console.log(`Mercado Pago ocupado (${r.status}). A lista atual foi mantida; nova tentativa na próxima conferência.`); process.exit(0); }
    await espera(Number(r.headers.get('retry-after')) * 1000 || 5000 * 2 ** t);
  }
  if (r.status === 401 || r.status === 403) throw new Error('O Mercado Pago recusou o token (confira se é o Access Token de produção, APP_USR-).');
  if (!r.ok) throw new Error(`Mercado Pago respondeu ${r.status} em ${caminho.split('?')[0]}.`);
  return r.json();
}
export const codigo = email => createHash('sha256').update(`${SAL}:${String(email).trim().toLowerCase()}`).digest('hex').slice(0, 20);

function situacao(a, agora = Date.now()) {
  const cobradas = Number(a?.summarized?.charged_quantity) || 0;
  if (a.status === 'cancelled') return cobradas ? 'cancelada' : 'cancelada-no-teste';
  if (a.status === 'paused') return 'pausada';
  if (a.status === 'authorized') {
    if (cobradas > 0) return 'pagante';
    const inicio = Date.parse(a.date_created || '') || agora;
    return agora - inicio > (DIAS_TESTE + 1) * 864e5 ? 'cobranca-pendente' : 'teste';
  }
  return 'pendente';
}
const PESO = { pagante: 6, teste: 5, 'cobranca-pendente': 4, pausada: 3, pendente: 2, cancelada: 1, 'cancelada-no-teste': 1 };

const eu = await api('/users/me').catch(() => null);
if (eu) console.log(`Conta do token: ${eu.first_name || ''} ${String(eu.last_name || '').slice(0, 1)}. (${eu.site_id || ''}, ${eu.user_type || 'pessoa'})`);
const planos = [];
for (const st of ['']) { // uma consulta só: a busca já traz os planos em todas as situações
  const r = await api(`/preapproval_plan/search?limit=100${st ? '&status=' + st : ''}`);
  for (const p of r.results || []) if (!planos.some(x => x.id === p.id)) planos.push(p);
}
console.log(`Planos na conta: ${planos.length} · ${planos.map(p => `"${p.reason}" (${p.status}${p.external_reference ? ', ' + p.external_reference : ''})`).join(' | ') || 'nenhum'}`);
const plano = planos.find(p => p.external_reference === 'MASTIGO-MENSAL') || planos.find(p => /mastig/i.test(p.reason || ''));
const todas = [];
for (let offset = 0; offset < 5000; offset += 100) {
  const pg = await api(`/preapproval/search?limit=100&offset=${offset}`);
  todas.push(...(pg.results || []));
  if ((pg.results || []).length < 100) break;
}
// Assinaturas do plano do Mastigô; se o plano não aparecer na busca, as que citam "Mastigô" no motivo
const lista = todas.filter(a => plano ? a.preapproval_plan_id === plano.id : /mastig/i.test(a.reason || ''));
console.log(`Assinaturas na conta: ${todas.length} · do Mastigô: ${lista.length}${plano ? '' : ' (plano não encontrado pela busca)'}`);
if (!plano && !lista.length && !todas.length) console.log('Nenhuma assinatura ainda. Se o plano foi criado em outra conta do Mercado Pago, o token precisa ser dessa conta.');
const contas = {}; let semEmail = 0;
for (const a of lista) {
  const s = situacao(a);
  if (!a.payer_email) { if (s !== 'pendente') semEmail++; continue; }
  const k = codigo(a.payer_email);
  if (!contas[k] || PESO[s] > PESO[contas[k].s]) contas[k] = { s, desde: (a.date_created || '').slice(0, 10) };
}
const novo = { sal: SAL, plano: !!plano, contas: Object.fromEntries(Object.entries(contas).sort()), semEmail };
const antigo = existsSync('assinantes.json') ? JSON.parse(readFileSync('assinantes.json', 'utf8')) : null;
const mudou = !antigo || JSON.stringify({ ...antigo, atualizadoEm: undefined }) !== JSON.stringify(novo);
if (mudou) writeFileSync('assinantes.json', JSON.stringify({ ...novo, atualizadoEm: new Date().toISOString() }, null, 1) + '\n');
const cont = {}; for (const a of lista) { const s = situacao(a); cont[s] = (cont[s] || 0) + 1; }
console.log(`Assinaturas lidas: ${lista.length} · ${JSON.stringify(cont)} · sem e-mail: ${semEmail} · arquivo ${mudou ? 'atualizado' : 'sem mudança'}.`);

// Relatório da aba "Vendas do Mastigô": grava no Supabase (tabela relatorio_vendas, que só a conta da dona lê).
// O navegador não pode consultar o Mercado Pago direto (o Mercado Pago bloqueia), por isso o relatório sai daqui.
const SUPA_URL = process.env.SUPABASE_URL || 'https://hvgqauqieonuzjwabmpu.supabase.co';
const SUPA_SECRET = process.env.SUPABASE_SECRET;
if (SUPA_SECRET) {
  const enxuta = a => ({
    status: a.status, date_created: a.date_created, next_payment_date: a.next_payment_date,
    payer_id: a.payer_id, payer_email: a.payer_email, payer_first_name: a.payer_first_name, payer_last_name: a.payer_last_name,
    summarized: { charged_quantity: a.summarized?.charged_quantity || 0, charged_amount: a.summarized?.charged_amount || 0 },
    auto_recurring: { start_date: a.auto_recurring?.start_date }
  });
  const dados = { plano: plano?.reason || 'Mastigô mensal', em: new Date().toISOString(), lista: lista.map(enxuta) };
  const r = await fetch(`${SUPA_URL}/rest/v1/relatorio_vendas?on_conflict=id`, {
    method: 'POST',
    headers: { apikey: SUPA_SECRET, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: 1, dados, atualizado_em: dados.em })
  });
  console.log(r.ok ? 'Relatório de vendas enviado ao Supabase.' : `Supabase recusou o relatório (${r.status}): ${(await r.text()).slice(0, 200)}`);
} else console.log('Sem o segredo SUPABASE_SECRET: o relatório da aba Vendas não foi enviado.');
