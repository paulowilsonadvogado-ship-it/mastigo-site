// Situação da assinatura do profissional (teste de 7 dias → mensal). Nesta versão sem servidor, fica no
// navegador; quando o servidor estiver no ar, a confirmação vem do Mercado Pago (webhook) e não daqui.
import { SITE } from './config-site.js?v=cf16114';
const CHAVE = 'mastigo-conta';
const DIA = 86400000;
export function lerConta() { try { return JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch { return null; } }
export function salvarConta(c) { try { localStorage.setItem(CHAVE, JSON.stringify(c)); } catch { /* navegador sem armazenamento */ } return c; }
export function novaConta(dados, agora = new Date()) {
  return { ...dados, criadoEm: agora.toISOString(), inicioTeste: agora.toISOString(), fimTeste: new Date(agora.getTime() + SITE.diasTeste * DIA).toISOString(), status: SITE.checkoutUrl ? 'aguardando-cartao' : 'teste' };
}
export function diasRestantes(conta, agora = new Date()) {
  if (!conta?.fimTeste) return 0;
  return Math.max(0, Math.ceil((new Date(conta.fimTeste) - agora) / DIA));
}
export function situacao(conta, agora = new Date()) {
  if (!conta) return 'sem-conta';
  if (conta.status === 'aguardando-cartao') return 'aguardando-cartao';
  return diasRestantes(conta, agora) > 0 ? 'teste' : 'assinatura';
}
export const moedaBR = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const dataBR = iso => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ---------- Conferência no Mercado Pago ----------
// A integração (GitHub Actions do site, a cada 15 min) publica assinantes.json com a situação de cada
// assinatura, identificada por um código embaralhado do e-mail do pagador no Mercado Pago.
// Regras: assinatura em teste, paga ou com cobrança em andamento → libera. Cancelada ou pausada → bloqueia.
// E-mail não encontrado → libera por 2 dias depois do cartão (a lista demora até 15 min e o e-mail do
// Mercado Pago pode ser outro); depois disso pede o e-mail usado no Mercado Pago.
// Se o arquivo não carregar, ou o Mercado Pago não informar e-mails, nada é bloqueado.
const LIBERA = new Set(['teste', 'pagante', 'cobranca-pendente', 'pendente']);
const BLOQUEIA = new Set(['cancelada', 'cancelada-no-teste', 'pausada']);
export async function codigoEmail(email, sal) {
  const dados = new TextEncoder().encode(`${sal}:${String(email || '').trim().toLowerCase()}`);
  const h = await crypto.subtle.digest('SHA-256', dados);
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 20);
}
export function decidir(conta, lista, achado, agora = Date.now()) {
  if (!lista || !conta) return { acesso: true, motivo: 'sem-lista' };
  if (achado) return BLOQUEIA.has(achado.s) ? { acesso: false, motivo: achado.s } : { acesso: true, motivo: achado.s };
  if (lista.semEmail > 0) return { acesso: true, motivo: 'sem-email-no-mp' };
  const desde = Date.parse(conta.cartaoEm || conta.criadoEm || '') || agora;
  return agora - desde < 2 * DIA ? { acesso: true, motivo: 'aguardando-confirmacao' } : { acesso: false, motivo: 'nao-encontrada' };
}
export async function verificarAssinatura(conta = lerConta()) {
  if (!conta || conta.status === 'aguardando-cartao') return { acesso: true, motivo: 'sem-conta' };
  let lista = null;
  try { const r = await fetch('./assinantes.json', { cache: 'no-store' }); if (r.ok) lista = await r.json(); } catch { /* sem internet ou arquivo ainda não criado */ }
  // Sem o plano na conta lida (token de outra conta, plano ainda não achado): não confere, para não bloquear ninguém por engano
  if (!lista?.contas || !lista.sal || !lista.plano) return { acesso: true, motivo: 'sem-lista' };
  let achado = null;
  for (const e of [conta.emailMp, conta.email].filter(Boolean)) { const k = await codigoEmail(e, lista.sal); if (lista.contas[k]) { achado = lista.contas[k]; break; } }
  const d = decidir(conta, lista, achado);
  const novoStatus = d.acesso ? (achado?.s === 'pagante' ? 'assinatura' : conta.status === 'bloqueada' ? 'teste' : conta.status) : 'bloqueada';
  if (novoStatus !== conta.status || conta.situacaoMp !== d.motivo) { conta.status = novoStatus; conta.situacaoMp = d.motivo; conta.conferidoEm = new Date().toISOString(); salvarConta(conta); }
  return d;
}
