// Vendas do Mastigô: aba só do login da dona do site (Tainara). Busca as assinaturas do plano
// "Mastigô mensal" direto na API do Mercado Pago, com o Access Token da conta dela, e monta o relatório:
// quem está usando, em teste, pagando, quem cancelou e quanto entrou.
// O token NUNCA vai para o código nem para o repositório: ela cola na tela e ele fica só no navegador
// dela (nesta aba, ou neste aparelho se ela marcar "lembrar"). Os dados dos clientes ficam só na memória
// da página, não são gravados.
import { SITE } from './config-site.js?v=e2cde6a';
import { moedaBR } from './assinatura.js?v=e2cde6a';
import { baixarCSV } from './util-nutri.js?v=e2cde6a';

const API = 'https://api.mercadopago.com';
const CHAVE_TOKEN = 'mastigo-mp-token';
const MP = {
  assinantes: 'https://www.mercadopago.com.br/subscription-plans/plans',
  recebimentos: 'https://www.mercadopago.com.br/activities',
  relatorios: 'https://www.mercadopago.com.br/balance/reports',
  credenciais: 'https://www.mercadopago.com.br/developers/panel/app'
};
export const ehMaster = () => !!window.MASTIGO_ACESSO?.valido?.();

// ===== Regras do relatório (testadas em tests/vendas.test.mjs) =====
export const SITUACOES = {
  teste: { nome: 'Em teste grátis', cor: '#1e8bff' },
  pagante: { nome: 'Pagando', cor: '#00a892' },
  'cobranca-pendente': { nome: '1ª cobrança pendente', cor: '#ff7a00' },
  pausada: { nome: 'Pausada', cor: '#a08bd0' },
  'cancelada-no-teste': { nome: 'Cancelou no teste', cor: '#c0124f' },
  cancelada: { nome: 'Cancelou depois de pagar', cor: '#c0124f' },
  pendente: { nome: 'Não concluiu a assinatura', cor: '#8a7aa6' }
};
export function situacaoAssinatura(a, agora = Date.now(), diasTeste = SITE.diasTeste) {
  const cobradas = Number(a?.summarized?.charged_quantity) || 0;
  if (a?.status === 'cancelled') return cobradas ? 'cancelada' : 'cancelada-no-teste';
  if (a?.status === 'paused') return 'pausada';
  if (a?.status === 'authorized') {
    if (cobradas > 0) return 'pagante';
    const inicio = Date.parse(a.date_created || a.auto_recurring?.start_date || '') || agora;
    return agora - inicio > (diasTeste + 1) * 864e5 ? 'cobranca-pendente' : 'teste';
  }
  return 'pendente';
}
export function resumoVendas(lista, preco = SITE.preco, agora = Date.now()) {
  const c = Object.fromEntries(Object.keys(SITUACOES).map(k => [k, 0]));
  let recebido = 0;
  for (const a of lista) { c[situacaoAssinatura(a, agora)]++; recebido += Number(a?.summarized?.charged_amount) || 0; }
  const usando = c.teste + c.pagante + c['cobranca-pendente'];
  const compraram = c.pagante + c.cancelada;
  const terminaramTeste = compraram + c['cancelada-no-teste'] + c['cobranca-pendente'];
  return {
    contagem: c, total: lista.length, usando, emTeste: c.teste, pagando: c.pagante, compraram,
    cancelaram: c.cancelada + c['cancelada-no-teste'], recebido: Math.round(recebido * 100) / 100,
    mensal: Math.round(c.pagante * preco * 100) / 100,
    conversao: terminaramTeste ? Math.round(compraram / terminaramTeste * 100) : null
  };
}

export function createVendas(ctx) {
  const { esc, icon, heading } = ctx;
  let dados = null, carregando = false, erro = '';
  const lerToken = () => { try { return sessionStorage.getItem(CHAVE_TOKEN) || localStorage.getItem(CHAVE_TOKEN) || ''; } catch { return ''; } };
  const dataBR = iso => iso ? new Date(iso).toLocaleDateString('pt-BR') : '–';

  async function api(caminho, token) {
    const r = await fetch(API + caminho, { headers: { Authorization: `Bearer ${token}` } });
    if (r.status === 401 || r.status === 403) throw new Error('O Mercado Pago recusou o token. Confira se é o Access Token de produção (começa com APP_USR-) da conta da Tainara.');
    if (!r.ok) throw new Error(`O Mercado Pago respondeu com erro ${r.status}. Tente de novo em instantes.`);
    return r.json();
  }
  async function carregar() {
    const token = lerToken(); if (!token) return;
    carregando = true; erro = ''; ctx.render();
    try {
      // Acha o plano "Mastigô mensal" (código MASTIGO-MENSAL) e depois as assinaturas dele
      const planos = await api('/preapproval_plan/search?limit=100', token);
      const plano = (planos.results || []).find(p => p.external_reference === 'MASTIGO-MENSAL') || (planos.results || []).find(p => /mastig/i.test(p.reason || ''));
      const lista = [];
      for (let offset = 0; offset < 2000; offset += 100) {
        const q = plano ? `preapproval_plan_id=${encodeURIComponent(plano.id)}&` : '';
        const pg = await api(`/preapproval/search?${q}limit=100&offset=${offset}`, token);
        const res = (pg.results || []).filter(a => plano || /mastig/i.test(a.reason || ''));
        lista.push(...res);
        if ((pg.results || []).length < 100 || offset + 100 >= (pg.paging?.total || 0)) break;
      }
      dados = { lista, plano: plano?.reason || 'Mastigô mensal', em: new Date() };
    } catch (e) {
      erro = e.message || 'Não foi possível falar com o Mercado Pago.';
    }
    carregando = false; ctx.render();
  }

  const cartao = (rotulo, valor, detalhe, cor) => `<div class="vd-num" style="--cor:${cor}"><span>${rotulo}</span><b>${valor}</b>${detalhe ? `<small>${detalhe}</small>` : ''}</div>`;
  const cliente = a => esc([a.payer_first_name, a.payer_last_name].filter(Boolean).join(' ') || a.payer_email || (a.payer_id ? `Cliente ${a.payer_id}` : 'Cliente'));

  function relatorio() {
    if (carregando) return '<div class="card vd-rel"><p class="vd-carregando">Buscando as assinaturas no Mercado Pago…</p></div>';
    if (erro) return `<div class="card vd-rel"><div class="vd-erro">${esc(erro)}</div><div class="vd-acoes"><button class="button" data-action="vd-atualizar">Tentar de novo</button><button class="button" data-action="vd-desconectar">Trocar o token</button></div></div>`;
    if (!dados) return '';
    const r = resumoVendas(dados.lista);
    const lista = [...dados.lista].sort((a, b) => String(b.date_created || '').localeCompare(String(a.date_created || '')));
    return `<section class="card vd-rel">
<div class="vd-rel-cab"><div><h2>Relatório geral</h2><p>Plano ${esc(dados.plano)} · atualizado às ${dados.em.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p></div>
<div class="vd-acoes"><button class="button small" data-action="vd-atualizar">${icon('spark')}Atualizar</button>${lista.length ? `<button class="button small" data-action="vd-csv">${icon('download')}Baixar planilha</button>` : ''}<button class="text-button" data-action="vd-desconectar">Desconectar</button></div></div>
<div class="vd-nums">
${cartao('Usando agora', r.usando, 'em teste + pagando + aguardando 1ª cobrança', '#7b2ff7')}
${cartao('Em teste grátis', r.emTeste, `primeiros ${SITE.diasTeste} dias`, SITUACOES.teste.cor)}
${cartao('Compraram', r.compraram, `${r.pagando} pagando hoje`, SITUACOES.pagante.cor)}
${cartao('Cancelaram', r.cancelaram, `${r.contagem['cancelada-no-teste']} ainda no teste`, '#c0124f')}
${cartao('Recebido até hoje', moedaBR(r.recebido), 'soma das cobranças feitas', '#00a892')}
${cartao('Receita por mês', moedaBR(r.mensal), `${r.pagando} × ${moedaBR(SITE.preco)}`, '#ff7a00')}
${cartao('Conversão do teste', r.conversao == null ? '–' : `${r.conversao}%`, 'de quem terminou o teste, quantos pagaram', '#1e8bff')}
${cartao('Total de assinaturas', r.total, `${r.contagem['cobranca-pendente']} com 1ª cobrança pendente · ${r.contagem.pausada} pausadas`, '#8a7aa6')}
</div>
${lista.length ? `<div class="vd-tabela-rolagem"><table class="vd-tabela"><thead><tr><th>Cliente</th><th>Situação</th><th>Assinou em</th><th>Próxima cobrança</th><th>Cobranças</th><th>Recebido</th></tr></thead><tbody>
${lista.map(a => { const s = situacaoAssinatura(a), sit = SITUACOES[s]; return `<tr><td>${cliente(a)}</td><td><span class="vd-sit" style="--cor:${sit.cor}">${sit.nome}</span></td><td>${dataBR(a.date_created)}</td><td>${['teste', 'pagante', 'cobranca-pendente'].includes(s) ? dataBR(a.next_payment_date) : '–'}</td><td>${Number(a.summarized?.charged_quantity) || 0}</td><td>${moedaBR(Number(a.summarized?.charged_amount) || 0)}</td></tr>`; }).join('')}
</tbody></table></div>` : '<div class="empty">Nenhuma assinatura ainda. Quando alguém assinar pela página de entrada, aparece aqui.</div>'}
<p class="helper">Quem preencheu o cadastro mas não chegou a assinar no Mercado Pago não aparece aqui: esse cadastro fica só no aparelho da pessoa até o Mastigô ter servidor.</p>
</section>`;
  }

  function conectar() {
    return `<section class="card vd-conectar"><h2>Conectar o relatório ao Mercado Pago</h2>
<p>Para os números aparecerem aqui, o Mastigô precisa ler as assinaturas na conta do Mercado Pago da Tainara. Isso é feito uma vez, por ela:</p>
<ol><li>Abra <a href="${MP.credenciais}" target="_blank" rel="noopener">Mercado Pago Developers › Suas integrações</a>, já logada na conta da Tainara.</li>
<li>Crie uma aplicação (nome: Mastigô; produto: Assinaturas) e abra <b>Credenciais de produção</b>.</li>
<li>Copie o <b>Access Token</b> (começa com APP_USR-) e cole abaixo.</li></ol>
<form id="vd-token-form" class="vd-token"><label for="vd-token">Access Token de produção</label><input id="vd-token" name="token" type="password" autocomplete="off" spellcheck="false" placeholder="APP_USR-..." required>
<label class="check"><input type="checkbox" name="lembrar"> Lembrar neste aparelho (só no computador ou celular da Tainara)</label>
<button class="button primary" type="submit">Conectar e ver o relatório</button></form>
<div class="vd-nota"><b>Cuidado com esse token.</b> Ele dá acesso à conta do Mercado Pago. Fica guardado só neste navegador e nunca vai para o código do site. Não envie para ninguém; se desconfiar que vazou, gere um novo em Credenciais.</div></section>`;
  }

  function page() {
    if (!ehMaster()) return heading('Vendas do Mastigô', 'Esta aba é só da dona do site.') + '<div class="card empty">Entre pelo "Entrar" da página inicial com o login da dona do site.</div>';
    if (lerToken() && !dados && !carregando && !erro) setTimeout(carregar, 0);
    const site = 'https://mastigô.com';
    return heading('Vendas do Mastigô', 'Quantas pessoas estão usando, quantas estão no teste, quantas compraram e quanto entrou.') + `
${lerToken() ? relatorio() : conectar()}
<div class="vendas">
<section class="card vd-plano"><span class="vd-etiqueta">Plano à venda</span><h2>Mastigô mensal</h2>
<p class="vd-preco">${moedaBR(SITE.preco)} <small>por mês, depois de ${SITE.diasTeste} dias grátis</small></p>
<div class="vd-links"><div><span>Página de entrada (para divulgar)</span><code>${esc(site)}</code><button class="button small" data-vd-copiar="${esc(site)}">${icon('copy')}Copiar</button></div>
<div><span>Link direto do pagamento</span><code>${esc(SITE.checkoutUrl || 'não configurado')}</code>${SITE.checkoutUrl ? `<button class="button small" data-vd-copiar="${esc(SITE.checkoutUrl)}">${icon('copy')}Copiar</button>` : ''}</div></div>
<p class="helper">Para divulgar, prefira a página de entrada: ela faz o cadastro antes do pagamento, e é esse cadastro que libera o "Entrar" para o cliente.</p></section>
<section class="card vd-onde"><h2>No Mercado Pago</h2>
<a class="vd-atalho" href="${MP.assinantes}" target="_blank" rel="noopener"><span class="vd-ico">${icon('users')}</span><span><b>Assinantes</b><small>Planos de assinatura › aba Clientes</small></span><span class="vd-seta">↗</span></a>
<a class="vd-atalho" href="${MP.recebimentos}" target="_blank" rel="noopener"><span class="vd-ico">${icon('money')}</span><span><b>Recebimentos</b><small>Cada cobrança aparece em Atividade</small></span><span class="vd-seta">↗</span></a>
<a class="vd-atalho" href="${MP.relatorios}" target="_blank" rel="noopener"><span class="vd-ico">${icon('chart')}</span><span><b>Relatórios</b><small>Planilha do período para a contabilidade</small></span><span class="vd-seta">↗</span></a>
</section></div>`;
  }

  return {
    page,
    onClick(el) {
      const d = el.dataset;
      if (d.vdCopiar) { (navigator.clipboard?.writeText(d.vdCopiar) || Promise.reject()).then(() => ctx.toast('Link copiado.'), () => ctx.toast(`Copie: ${d.vdCopiar}`)); return true; }
      if (d.action === 'vd-atualizar') { erro = ''; carregar(); return true; }
      if (d.action === 'vd-desconectar') { try { sessionStorage.removeItem(CHAVE_TOKEN); localStorage.removeItem(CHAVE_TOKEN); } catch { /* sem armazenamento */ } dados = null; erro = ''; ctx.render(); ctx.toast('Relatório desconectado deste navegador.'); return true; }
      if (d.action === 'vd-csv' && dados) {
        baixarCSV(`mastigo-assinaturas-${new Date().toLocaleDateString('sv-SE')}.csv`, [['Cliente', 'Situação', 'Assinou em', 'Próxima cobrança', 'Cobranças', 'Recebido (R$)'],
          ...dados.lista.map(a => [[a.payer_first_name, a.payer_last_name].filter(Boolean).join(' ') || a.payer_email || a.payer_id || '', SITUACOES[situacaoAssinatura(a)].nome, dataBR(a.date_created), dataBR(a.next_payment_date), Number(a.summarized?.charged_quantity) || 0, (Number(a.summarized?.charged_amount) || 0).toFixed(2).replace('.', ',')])]);
        return true;
      }
      return false;
    },
    onSubmit(form, v) {
      if (form.id !== 'vd-token-form') return false;
      const token = String(v.token || '').trim();
      if (!/^APP_USR-[\w-]{20,}$/.test(token)) { ctx.toast('Isso não parece um Access Token de produção (começa com APP_USR-).'); return true; }
      try { (v.lembrar ? localStorage : sessionStorage).setItem(CHAVE_TOKEN, token); } catch { ctx.toast('O navegador não deixou guardar o token.'); return true; }
      dados = null; erro = ''; carregar(); return true;
    }
  };
}
