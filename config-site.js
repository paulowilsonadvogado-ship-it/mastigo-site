// Configuração da página de entrada e da assinatura do Mastigô.
// Cobrança: plano "Mastigô mensal" no Mercado Pago (conta da Tainara, Planos de assinatura), criado em
// 11/11/2026: R$ 89,90 por mês, 7 dias de teste grátis, cobrança no dia da adesão, sem prazo final,
// código MASTIGO-MENSAL, retorno para https://xn--mastig-nxa.com/sistema.html?assinatura=ok.
// O cartão é digitado só no Mercado Pago. Se apagar o link, o teste volta a começar sem pedir cartão.
export const SITE = {
  checkoutUrl: 'https://mpago.la/1s5q8EA',
  preco: 89.90,
  diasTeste: 7,
  // Dados do fornecedor: o Decreto 7.962/2013 (art. 2º) exige nome/razão social, CPF ou CNPJ,
  // endereço e contato em destaque no site de quem vende pela internet.
  empresa: { nome: '', documento: '', endereco: '', email: '', whatsapp: '' }
};
