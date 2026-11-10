// Configuração da página de entrada e da assinatura do Mastigô.
// Para ativar a cobrança: crie no Mercado Pago um plano de assinatura mensal de R$ 89,90 com 7 dias de
// teste grátis, use como endereço de retorno https://xn--mastig-nxa.com/sistema.html?assinatura=ok
// e cole aqui o link do plano. Enquanto estiver vazio, o teste começa sem pedir cartão.
export const SITE = {
  checkoutUrl: '',
  preco: 89.90,
  diasTeste: 7,
  // Dados do fornecedor: o Decreto 7.962/2013 (art. 2º) exige nome/razão social, CPF ou CNPJ,
  // endereço e contato em destaque no site de quem vende pela internet.
  empresa: { nome: '', documento: '', endereco: '', email: '', whatsapp: '' }
};
