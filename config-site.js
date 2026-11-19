// Configuração da página de entrada e da assinatura do Mastigô.
// Cobrança: plano "Mastigô mensal" no Mercado Pago da conta da Tainara (Planos de assinatura), ajustado
// em 18/11/2026: R$ 89,90 por mês, 7 dias de teste grátis, cobrança no dia da adesão, sem prazo final,
// código MASTIGO-MENSAL, retorno para https://xn--mastig-nxa.com/sistema.html?assinatura=ok.
// (O link antigo, mpago.la/1s5q8EA, era de um plano em outra conta e foi substituído.)
// O cartão é digitado só no Mercado Pago. Se apagar o link, o teste volta a começar sem pedir cartão.
export const SITE = {
  checkoutUrl: 'https://mpago.la/1S5ZiAy',
  preco: 89.90,
  diasTeste: 7,
  // Dados do fornecedor: o Decreto 7.962/2013 (art. 2º) exige nome/razão social, CPF ou CNPJ,
  // endereço e contato em destaque no site de quem vende pela internet.
  empresa: {
    nome: 'TAINARA DA SILVA MARQUETTE NUTRICAO',
    documento: 'CNPJ 54.546.283/0001-09',
    endereco: 'Rua Coronel José Martins Cabral, 1525, Humaitá de Cima, Tubarão/SC, CEP 88708-210',
    email: 'tainaranutriinfantil@gmail.com',
    whatsapp: '48996429232'
  }
};
