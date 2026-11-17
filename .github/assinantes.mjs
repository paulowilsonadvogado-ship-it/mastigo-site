// Lê as assinaturas do plano "Mastigô mensal" (código MASTIGO-MENSAL) na API do Mercado Pago e grava
// assinantes.json. O arquivo é público (fica no site), então leva só um código embaralhado do e-mail
// (SHA-256 com sal, 20 caracteres) e a situação. Os registros do GitHub mostram só contagens.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const TOKEN = process.env.MP_ACCESS_TOKEN;
const SAL = 'mastigo-assinantes-v1';
const DIAS_TESTE = 7;
if (!TOKEN) { console.error('Falta o segredo MP_ACCESS_TOKEN (Settings › Secrets and variables › Actions).'); process.exit(1); }

async function api(caminho) {
  const r = await fetch('https://api.mercadopago.com' + caminho, { headers: { Authorization: `Bearer ${TOKEN}` } });
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

const planos = [];
for (const st of ['', 'active', 'inactive', 'cancelled']) {
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
