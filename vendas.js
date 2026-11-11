// Vendas do Mastigô: tela só do acesso master (Tainara). As assinaturas, cobranças e cancelamentos
// ficam no Mercado Pago dela; daqui ela vai direto para lá. Contar as vendas aqui dentro depende do
// servidor receber os avisos do Mercado Pago (webhook) — próximo passo técnico.
import { SITE } from './config-site.js?v=8bab5f8';
import { moedaBR } from './assinatura.js?v=8bab5f8';

const MP = {
  assinantes: 'https://www.mercadopago.com.br/subscription-plans/plans',
  recebimentos: 'https://www.mercadopago.com.br/activities',
  relatorios: 'https://www.mercadopago.com.br/balance/reports'
};
export const ehMaster = () => !!window.MASTIGO_ACESSO?.valido?.();

export function createVendas(ctx) {
  const { esc, icon, heading } = ctx;
  const link = (href, titulo, texto, ico) => `<a class="vd-atalho" href="${esc(href)}" target="_blank" rel="noopener"><span class="vd-ico">${icon(ico)}</span><span><b>${titulo}</b><small>${texto}</small></span><span class="vd-seta">↗</span></a>`;
  function page() {
    if (!ehMaster()) return heading('Vendas do Mastigô', 'Esta tela é só do acesso master.') + '<div class="card empty">Entre pelo "Entrar (equipe)", no rodapé da página inicial.</div>';
    const site = 'https://mastigô.com';
    return heading('Vendas do Mastigô', 'Assinaturas, cobranças e cancelamentos ficam no Mercado Pago da Tainara. Daqui você vai direto para lá.') + `
<div class="vendas">
<section class="card vd-plano"><span class="vd-etiqueta">Plano à venda</span><h2>Mastigô mensal</h2>
<p class="vd-preco">${moedaBR(SITE.preco)} <small>por mês, depois de ${SITE.diasTeste} dias grátis</small></p>
<ul><li>Cobrança automática no cartão, todo mês, a partir do 8º dia</li><li>Sem prazo final; a pessoa cancela no Mercado Pago quando quiser</li><li>Quem assina volta para o Mastigô com o teste ativo</li></ul>
<div class="vd-links"><div><span>Página de entrada (para divulgar)</span><code>${esc(site)}</code><button class="button small" data-vd-copiar="${esc(site)}">${icon('copy')}Copiar</button></div>
<div><span>Link direto do pagamento</span><code>${esc(SITE.checkoutUrl || 'não configurado')}</code>${SITE.checkoutUrl ? `<button class="button small" data-vd-copiar="${esc(SITE.checkoutUrl)}">${icon('copy')}Copiar</button>` : ''}</div></div>
<p class="helper">Para divulgar, prefira a página de entrada: ela faz o cadastro antes do pagamento, e é esse cadastro que libera o "Entrar" do topo.</p></section>
<section class="card vd-onde"><h2>Quantas vendas foram feitas</h2><p>Abra no Mercado Pago, já logada na conta da Tainara:</p>
${link(MP.assinantes, 'Assinantes', 'Planos de assinatura › aba Clientes: quem assinou, quem está no teste e quem cancelou', 'users')}
${link(MP.recebimentos, 'Recebimentos', 'Cada cobrança de R$ 89,90 aparece em Atividade, com data e valor', 'money')}
${link(MP.relatorios, 'Relatórios', 'Planilha com os recebimentos do período, para a contabilidade', 'chart')}
<p class="helper">O Mercado Pago também avisa por e-mail e no aplicativo a cada nova assinatura, cobrança e cancelamento.</p>
<div class="vd-nota"><b>Por que o número não aparece aqui dentro?</b> O Mastigô ainda não tem servidor. A contagem automática (e o bloqueio de quem cancelou) chega quando o servidor passar a receber os avisos do Mercado Pago.</div></section>
</div>`;
  }
  return {
    page,
    onClick(el) {
      if (el.dataset.vdCopiar) {
        const v = el.dataset.vdCopiar;
        (navigator.clipboard?.writeText(v) || Promise.reject()).then(() => ctx.toast('Link copiado.'), () => ctx.toast(`Copie: ${v}`));
        return true;
      }
      return false;
    }
  };
}
