// Situação da assinatura do profissional (teste de 7 dias → mensal). Nesta versão sem servidor, fica no
// navegador; quando o servidor estiver no ar, a confirmação vem do Mercado Pago (webhook) e não daqui.
import { SITE } from './config-site.js?v=8bab5f8';
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
