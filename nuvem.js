// Salvamento na nuvem (Supabase, servidor em São Paulo).
// Cada nutricionista tem uma conta (e-mail + senha) e uma linha na tabela "estados" com tudo o que ela
// faz no sistema. A segurança em nível de linha (RLS) do banco garante que cada conta só lê e grava a
// própria linha (database/supabase_001_nuvem.sql). O banco guarda sozinho uma cópia por dia (30 dias).
// A chave abaixo é a "publicável": feita para ficar no site; sem login ela não lê nada.
// O navegador continua com uma cópia local, para o sistema abrir rápido e funcionar sem internet.
export const NUVEM = {
  url: 'https://hvgqauqieonuzjwabmpu.supabase.co',
  chave: 'sb_publishable_pZ_q8o_18PnJfG1f5tqdhQ_6yjcOySe'
};
const SESSAO = 'mastigo-sessao', ESTADO = 'pipoca-demo-v1', CONTA = 'mastigo-conta';

const ler = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const gravar = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

async function pedir(caminho, { metodo = 'GET', corpo, token, cabecalhos = {} } = {}) {
  const r = await fetch(NUVEM.url + caminho, {
    method: metodo,
    headers: { apikey: NUVEM.chave, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...cabecalhos },
    body: corpo === undefined ? undefined : JSON.stringify(corpo)
  });
  const texto = await r.text();
  let dados = null; try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }
  if (!r.ok) { const e = new Error(traduzir(dados, r.status)); e.status = r.status; e.codigo = dados?.error_code || dados?.code || ''; throw e; }
  return dados;
}
function traduzir(d, status) {
  const m = String(d?.msg || d?.message || d?.error_description || d?.error || '');
  if (/invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
  if (/already registered|already been registered|user_already_exists/i.test(m)) return 'Já existe uma conta com este e-mail. Use "Entrar".';
  if (/email not confirmed/i.test(m)) return 'Confirme o seu e-mail pelo link que enviamos e tente de novo.';
  if (/password.*(at least|characters|weak)/i.test(m)) return 'Use uma senha com pelo menos 8 caracteres, misturando letras e números.';
  if (/rate limit|too many/i.test(m) || status === 429) return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.';
  return m || `Não foi possível falar com o servidor (${status}).`;
}

// ---------- Conta (login) ----------
function guardarSessao(s) {
  if (!s?.access_token) return null;
  const sessao = { access_token: s.access_token, refresh_token: s.refresh_token, expira: Date.now() + (Number(s.expires_in) || 3600) * 1000, id: s.user?.id, email: s.user?.email };
  gravar(SESSAO, sessao); return sessao;
}
export const sessaoLocal = () => ler(SESSAO);
export async function sessao() {
  const s = ler(SESSAO); if (!s?.refresh_token) return null;
  if (s.expira - Date.now() > 60_000) return s;
  try { return guardarSessao(await pedir('/auth/v1/token?grant_type=refresh_token', { metodo: 'POST', corpo: { refresh_token: s.refresh_token } })); }
  catch (e) { if (e.status === 400 || e.status === 401) gravar(SESSAO, null); return null; }
}
export async function entrar(email, senha) {
  return guardarSessao(await pedir('/auth/v1/token?grant_type=password', { metodo: 'POST', corpo: { email: String(email).trim().toLowerCase(), password: senha } }));
}
// Cria a conta. Se o projeto exigir confirmação de e-mail, volta sem sessão (confirmar = true).
export async function cadastrar(email, senha, nome = '') {
  const r = await pedir('/auth/v1/signup', { metodo: 'POST', corpo: { email: String(email).trim().toLowerCase(), password: senha, data: { nome } } });
  const s = guardarSessao(r?.session || (r?.access_token ? r : null));
  return { sessao: s, confirmar: !s };
}
export async function sair() {
  const s = ler(SESSAO);
  if (s?.access_token) pedir('/auth/v1/logout', { metodo: 'POST', token: s.access_token }).catch(() => {});
  gravar(SESSAO, null);
}
export async function pedirNovaSenha(email) {
  await pedir('/auth/v1/recover', { metodo: 'POST', corpo: { email: String(email).trim().toLowerCase() }, cabecalhos: { } });
}

// ---------- Dados ----------
export async function baixar() {
  const s = await sessao(); if (!s) return null;
  const linhas = await pedir(`/rest/v1/estados?select=dados,versao,atualizado_em&user_id=eq.${s.id}`, { token: s.access_token });
  return linhas?.[0] || null;
}
export async function enviar(dados) {
  const s = await sessao(); if (!s) return false;
  await pedir('/rest/v1/estados?on_conflict=user_id', { metodo: 'POST', token: s.access_token, corpo: { user_id: s.id, dados }, cabecalhos: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
  return true;
}
// O que vai para a nuvem: o estado do sistema + a conta da assinatura (para entrar em outro aparelho)
function pacote() {
  const estado = ler(ESTADO); if (!estado) return null;
  return { ...estado, __conta: ler(CONTA) || estado.__conta || null };
}
// Ao entrar em outro aparelho: grava aqui o que veio da nuvem
export function aplicarNoAparelho(dados) {
  if (!dados) return false;
  const { __conta, ...estado } = dados;
  if (Array.isArray(estado.patients)) gravar(ESTADO, estado);
  // A conta deste aparelho vale mais (acabou de voltar do Mercado Pago, por exemplo); a da nuvem serve para aparelho novo
  const local = ler(CONTA);
  if (__conta && !(local && String(local.email || '').toLowerCase() === String(__conta.email || '').toLowerCase())) gravar(CONTA, { ...__conta, perfilAplicado: true });
  return true;
}

// ---------- Sincronização automática ----------
let timer = null, enviando = false, pendente = false;
const ouvintes = new Set();
export const status = { estado: 'desligado', quando: null, erro: '' };
function avisar(estado, extra = {}) { Object.assign(status, { estado, ...extra }); ouvintes.forEach(f => { try { f(status); } catch { /* */ } }); }
export const aoMudarStatus = f => { ouvintes.add(f); return () => ouvintes.delete(f); };

async function enviarAgora() {
  clearTimeout(timer); timer = null;
  if (enviando) { pendente = true; return; }
  const dados = pacote(); if (!dados || !sessaoLocal()) return;
  enviando = true; avisar('salvando');
  try { await enviar(dados); avisar('salvo', { quando: new Date().toISOString(), erro: '' }); }
  catch (e) { avisar('erro', { erro: e.message || 'Sem conexão' }); setTimeout(() => agendar(), 30_000); }
  finally { enviando = false; if (pendente) { pendente = false; agendar(500); } }
}
// Chamado a cada salvamento do sistema: envia 1,5 s depois da última mudança
export function agendar(ms = 1500) {
  if (!sessaoLocal()) return;
  clearTimeout(timer); timer = setTimeout(enviarAgora, ms);
}
export const salvarJa = () => (timer || pendente ? enviarAgora() : Promise.resolve());

// Ao abrir o sistema: se a nuvem tiver algo mais novo (feito em outro aparelho), traz para cá;
// se este aparelho tiver algo mais novo (feito sem internet), envia. Devolve true se a tela precisa recarregar.
export async function sincronizarAoAbrir() {
  if (!sessaoLocal()) { avisar('desligado'); return false; }
  avisar('salvando');
  try {
    const remoto = await baixar(), local = ler(ESTADO);
    const tRemoto = Date.parse(remoto?.dados?.salvoEm || remoto?.atualizado_em || '') || 0;
    const tLocal = Date.parse(local?.salvoEm || '') || 0;
    if (Array.isArray(remoto?.dados?.patients) && (tRemoto > tLocal || !local || !(local.patients?.length || local.entries?.length))) {
      if (JSON.stringify(remoto.dados) !== JSON.stringify(pacote())) { aplicarNoAparelho(remoto.dados); avisar('salvo', { quando: remoto.atualizado_em }); return true; }
      avisar('salvo', { quando: remoto.atualizado_em }); return false;
    }
    if (local) await enviar(pacote());
    avisar('salvo', { quando: new Date().toISOString() });
  } catch (e) { avisar('erro', { erro: e.message || 'Sem conexão' }); }
  return false;
}
addEventListener('pagehide', () => { if (timer) enviarAgora(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && timer) enviarAgora(); });
addEventListener('online', () => agendar(200));
if (typeof window !== 'undefined') window.MASTIGO_NUVEM = { agendar, salvarJa, status, sessaoLocal };
