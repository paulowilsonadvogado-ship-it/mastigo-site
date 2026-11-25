// Vendas do Mastigô: aba só do login da dona do site (Tainara). O Mercado Pago não deixa o navegador
// consultar a API direto (bloqueio de CORS: "Failed to fetch"), então o robô do GitHub (assinantes.mjs),
// que tem o token em segredo, grava o relatório no Supabase (tabela relatorio_vendas). Aqui a dona entra
// com a conta dela na nuvem e lê; só contas marcadas em public.donos conseguem ler
// (database/supabase_002_vendas.sql). Nenhum token é pedido nem guardado no navegador.
import { SITE } from './config-site.js?v=6077276';
import { moedaBR } from './assinatura.js?v=6077276';
import { baixarCSV } from './util-nutri.js?v=6077276';
import * as nuvem from './nuvem.js?v=6077276';

const CHAVE_TOKEN = 'mastigo-mp-token'; // token antigo, só para apagar de navegadores que o guardaram
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
  const dataBR = iso => iso ? new Date(iso).toLocaleDateString('pt-BR') : '–';
  let semDono = false, tentou = false;
  async function carregar() {
    if (!nuvem.sessaoLocal(nuvem.SESSAO_DONA)) return;
    carregando = true; erro = ''; tentou = true; ctx.render();
    try {
      const [rel, donos] = await Promise.all([nuvem.lerTabela('relatorio_vendas', 'select=dados,atualizado_em&id=eq.1', nuvem.SESSAO_DONA), nuvem.lerTabela('donos', 'select=user_id', nuvem.SESSAO_DONA)]);
      semDono = !donos?.length;
      const linha = rel?.[0];
      dados = linha ? { lista: linha.dados.lista || [], plano: linha.dados.plano || 'Mastigô mensal', em: new Date(linha.dados.em || linha.atualizado_em) } : null;
      if (!semDono && !linha) erro = 'O relatório ainda não chegou. Ele é montado pela conferência automática do Mercado Pago (algumas vezes por dia); volte mais tarde.';
    } catch (e) { erro = e.message || 'Não foi possível buscar o relatório.'; }
    carregando = false; ctx.render();
  }
  const cartao = (rotulo, valor, detalhe, cor) => `<div class="vd-num" style="--cor:${cor}"><span>${rotulo}</span><b>${valor}</b>${detalhe ? `<small>${detalhe}</small>` : ''}</div>`;
  const cliente = a => esc([a.payer_first_name, a.payer_last_name].filter(Boolean).join(' ') || a.payer_email || (a.payer_id ? `Cliente ${a.payer_id}` : 'Cliente'));

  function relatorio() {
    if (carregando) return '<div class="card vd-rel"><p class="vd-carregando">Buscando o relatório…</p></div>';
    if (semDono) return `<div class="card vd-rel"><div class="vd-erro">O seu login master já está ligado à nuvem, mas ainda falta <b>liberar</b> esta conta para ver as vendas (feito uma vez, no Supabase). Avise quem cuida do sistema.</div><div class="vd-acoes"><button class="button" data-action="vd-atualizar">Conferir de novo</button><button class="button" data-action="vd-desconectar">Ligar de novo</button></div></div>`;
    if (erro) return `<div class="card vd-rel"><div class="vd-erro">${esc(erro)}</div><div class="vd-acoes"><button class="button" data-action="vd-atualizar">Tentar de novo</button><button class="button" data-action="vd-desconectar">Ligar de novo</button></div></div>`;
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
    return `<section class="card vd-conectar"><h2>Falta ligar o relatório ao seu login</h2>
<p>O relatório abre sozinho para quem entra com o <b>login master</b>. Para ligar, saia e entre de novo com o seu usuário e senha master (botão abaixo). Não precisa de e-mail.</p>
<button class="button primary" data-action="vd-reentrar">Sair e entrar de novo</button>
<div class="vd-nota">O token do Mercado Pago não é pedido aqui: ele fica guardado em segredo na conferência automática, e o navegador nunca o recebe.</div></section>`;
  }

  function page() {
    if (!ehMaster()) return heading('Vendas do Mastigô', 'Esta aba é só da dona do site.') + '<div class="card empty">Entre pelo "Entrar" da página inicial com o login da dona do site.</div>';
    if (nuvem.sessaoLocal(nuvem.SESSAO_DONA) && !tentou && !carregando) setTimeout(carregar, 0);
    const site = 'https://mastigô.com';
    return heading('Vendas do Mastigô', 'Quantas pessoas estão usando, quantas estão no teste, quantas compraram e quanto entrou.') + `
${nuvem.sessaoLocal(nuvem.SESSAO_DONA) ? relatorio() : conectar()}
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
      if (d.action === 'vd-reentrar') { window.MASTIGO_ACESSO?.sair?.(); location.replace('./acesso.html?volta=sistema.html%23vendas'); return true; }
      if (d.action === 'vd-atualizar') { erro = ''; carregar(); return true; }
      if (d.action === 'vd-desconectar') { try { sessionStorage.removeItem(CHAVE_TOKEN); localStorage.removeItem(CHAVE_TOKEN); } catch { /* */ } nuvem.sair(nuvem.SESSAO_DONA); dados = null; erro = ''; semDono = false; tentou = false; ctx.render(); ctx.toast('Saiu da conta da nuvem neste navegador.'); return true; }
      if (d.action === 'vd-csv' && dados) {
        baixarCSV(`mastigo-assinaturas-${new Date().toLocaleDateString('sv-SE')}.csv`, [['Cliente', 'Situação', 'Assinou em', 'Próxima cobrança', 'Cobranças', 'Recebido (R$)'],
          ...dados.lista.map(a => [[a.payer_first_name, a.payer_last_name].filter(Boolean).join(' ') || a.payer_email || a.payer_id || '', SITUACOES[situacaoAssinatura(a)].nome, dataBR(a.date_created), dataBR(a.next_payment_date), Number(a.summarized?.charged_quantity) || 0, (Number(a.summarized?.charged_amount) || 0).toFixed(2).replace('.', ',')])]);
        return true;
      }
      return false;
    },
    onSubmit(form, v) {
      if (form.id !== 'vd-login') return false;
      const msg = form.querySelector('#vd-login-erro'), btn = form.querySelector('button[type=submit]');
      btn.disabled = true; msg.textContent = '';
      (async () => {
        try {
          try { await nuvem.entrar(v.email, v.senha, nuvem.SESSAO_DONA); }
          catch (e) { if (!/incorretos/.test(e.message)) throw e; const r = await nuvem.cadastrar(v.email, v.senha, '', nuvem.SESSAO_DONA); if (r.confirmar) throw new Error('Confirme o e-mail pelo link enviado e entre de novo.'); }
          tentou = false; dados = null; erro = ''; await carregar();
        } catch (e) { btn.disabled = false; msg.textContent = e.message; }
      })();
      return true;
    }
  };
}
