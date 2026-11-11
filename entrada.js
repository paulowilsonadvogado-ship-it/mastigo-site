// Página de entrada: animação da escada do comer, cadastro do teste e envio ao Mercado Pago.
import { SITE } from './config-site.js';
import { iconeAlimento } from './alimentos-icones.js';
import { normalizarTelefone, formatarTelefone } from './whatsapp.js';
import { novaConta, salvarConta, lerConta, moedaBR } from './assinatura.js';

const $ = s => document.querySelector(s);
const DIA = 86400000;
const dataLonga = d => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });

// ===== Preço e datas das condições (sempre a partir de hoje) =====
const hoje = new Date();
const fim = new Date(hoje.getTime() + (SITE.diasTeste - 1) * DIA);
const cobranca = new Date(hoje.getTime() + SITE.diasTeste * DIA);
$('#preco-valor').textContent = moedaBR(SITE.preco).replace('R$', '').trim();
$('#cond-hoje').textContent = dataLonga(hoje);
$('#cond-fim').textContent = dataLonga(fim);
$('#cond-cobranca').textContent = dataLonga(cobranca);
$('#c-enviar').textContent = SITE.checkoutUrl ? 'Continuar para cadastrar o cartão' : 'Começar meu teste grátis';
$('#miuda-form').textContent = SITE.checkoutUrl
  ? 'No próximo passo você cadastra o cartão no Mercado Pago. Nada é cobrado hoje.'
  : 'Fase de lançamento: o cadastro do cartão ainda não está ativo, então o teste começa direto.';

// Dados do fornecedor no rodapé (Decreto 7.962/2013), quando preenchidos em config-site.js
const e = SITE.empresa || {};
$('#empresa').textContent = [e.nome, e.documento, e.endereco, e.email, e.whatsapp && formatarTelefone(normalizarTelefone(e.whatsapp))].filter(Boolean).join(' · ');

// "Entrar" do topo é só para quem fez o cadastro e cadastrou o cartão no Mercado Pago.
// Quem já fez, vê o atalho para o sistema; quem parou antes do cartão, o atalho para terminar.
const conta = lerConta(), pendente = conta?.status === 'aguardando-cartao' && SITE.checkoutUrl;
if (conta) {
  const a = document.querySelector('.topo-links .botao');
  if (pendente) { a.textContent = 'Cadastrar o cartão'; a.href = SITE.checkoutUrl; }
  else { a.textContent = 'Abrir o sistema'; a.href = './sistema.html'; }
}
// Veio do "Entrar" sem ter assinado: explica o caminho em cima do formulário
if (new URLSearchParams(location.search).has('entrar')) {
  const av = $('#aviso-entrar');
  av.innerHTML = pendente
    ? `<b>Falta só o cartão.</b> Seu cadastro está feito; para entrar, conclua a assinatura no Mercado Pago (os ${SITE.diasTeste} primeiros dias são grátis). <a href="${SITE.checkoutUrl}">Cadastrar o cartão</a>`
    : `<b>Para entrar no Mastigô, faça seu cadastro.</b> Preencha os dados abaixo e cadastre o cartão no Mercado Pago: os ${SITE.diasTeste} primeiros dias são grátis.`;
  av.hidden = false;
  history.replaceState(null, '', location.pathname + location.hash);
}

// ===== Assinatura visual: o brócolis sobe a escada do comer =====
const etapas = ['tolerou no prato', 'brincou com o garfo', 'cheirou e fez careta', 'pegou com a mão', 'encostou na boca', 'mastigou!'];
const degraus = [...document.querySelectorAll('#escada li')];
const alimento = $('#alimento'), legenda = $('#escada-legenda'), carimbo = $('#carimbo');
alimento.innerHTML = iconeAlimento('brocolis');
const semMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
function posicionar(i) {
  const cartao = $('.escada-cartao').getBoundingClientRect(), d = degraus[i].getBoundingClientRect();
  const x = d.left - cartao.left + d.width / 2 - 31, y = d.top - cartao.top - 58;
  alimento.style.transform = `translate(${x}px, ${y}px)`;
  degraus.forEach((li, k) => { li.classList.toggle('feito', k < i); li.classList.toggle('agora', k === i); });
  legenda.textContent = `${i === 5 ? 'Hoje' : 'Dia ' + (i * 4 + 1)}: ${etapas[i]}`;
  carimbo.classList.toggle('mostra', i === 5);
}
let passo = semMovimento ? 5 : 0;
posicionar(passo);
addEventListener('resize', () => posicionar(passo));
if (!semMovimento) {
  const ciclo = () => { passo = passo === 5 ? 0 : passo + 1; posicionar(passo); setTimeout(ciclo, passo === 5 ? 3000 : 1300); };
  setTimeout(ciclo, 1300);
}

// ===== Cadastro do teste =====
const form = $('#cadastro'), erro = $('#erro');
function marcar(campo, invalido) { campo.setAttribute('aria-invalid', invalido ? 'true' : 'false'); }
form.addEventListener('submit', ev => {
  ev.preventDefault();
  const v = Object.fromEntries(new FormData(form));
  const nome = String(v.nome || '').trim(), email = String(v.email || '').trim().toLowerCase(), tel = normalizarTelefone(v.whatsapp);
  marcar(form.nome, nome.split(/\s+/).length < 2);
  marcar(form.email, !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email));
  marcar(form.whatsapp, !tel);
  if (nome.split(/\s+/).length < 2) return falha('Informe nome e sobrenome.', form.nome);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return falha('Confira o e-mail.', form.email);
  if (!tel) return falha('Informe o WhatsApp com DDD, por exemplo (48) 99999-0000.', form.whatsapp);
  if (!v.aceite) return falha('Para começar, marque que concorda com as condições da assinatura.', form.aceite);
  erro.textContent = '';
  const conta = salvarConta(novaConta({ nome, email, whatsapp: tel, crn: String(v.crn || '').trim(), aceiteEm: new Date().toISOString(), aceiteTexto: [...document.querySelectorAll('#condicoes li')].map(li => li.textContent.trim()) }));
  $('#c-enviar').disabled = true;
  if (SITE.checkoutUrl) {
    $('#c-enviar').textContent = 'Abrindo o Mercado Pago…';
    location.href = SITE.checkoutUrl;
  } else {
    location.href = './sistema.html?assinatura=teste';
  }
  return conta;
});
function falha(msg, campo) { erro.textContent = msg; campo.focus(); return false; }
