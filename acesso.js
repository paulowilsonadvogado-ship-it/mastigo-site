// Tela do acesso master do pré-lançamento (ver acesso-guarda.js).
import { derivarChave } from './acesso-chave.js?v=90a3970';
import { iconeAlimento } from './alimentos-icones.js?v=90a3970';
import { SITE } from './config-site.js?v=90a3970';

const $ = s => document.querySelector(s);
const A = window.MASTIGO_ACESSO || { ativo: false };

// Só volta para páginas do próprio site
function destino() {
  const v = new URLSearchParams(location.search).get('volta') || '';
  return /^(index|sistema)\.html(?:[?#].*)?$/.test(v) ? './' + v : './index.html';
}
if (!A.ativo || A.valido()) location.replace(destino());

// Cliente que já fez o cadastro neste aparelho: atalho para o sistema (ou para terminar o cartão)
let conta = null;
try { conta = JSON.parse(localStorage.getItem('mastigo-conta') || 'null'); } catch { /* sem armazenamento */ }
if (conta) {
  const box = $('#clientes'), nome = String(conta.nome || '').split(' ')[0];
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  box.innerHTML = conta.status === 'aguardando-cartao' && SITE.checkoutUrl
    ? `<b>Falta só o cartão${nome ? `, ${esc(nome)}` : ''}.</b><p>Seu cadastro está feito. Para entrar, conclua a assinatura no Mercado Pago (os ${SITE.diasTeste} primeiros dias são grátis).</p><a class="botao botao-roxo" href="${esc(SITE.checkoutUrl)}">Cadastrar o cartão</a>`
    : `<b>Olá${nome ? `, ${esc(nome)}` : ''}!</b><p>Seu cadastro está completo neste aparelho.</p><a class="botao botao-roxo" href="./sistema.html">Abrir o sistema</a>`;
  box.hidden = false;
  $('#cadastro-link').hidden = true;
}

$('#fila').innerHTML = ['brocolis', 'morango', 'cenoura', 'banana', 'ovo'].map(id => `<span>${iconeAlimento(id)}</span>`).join('');

const ver = $('#ver-senha'), senha = $('#a-senha');
ver.addEventListener('click', () => {
  const mostrar = senha.type === 'password';
  senha.type = mostrar ? 'text' : 'password';
  ver.textContent = mostrar ? 'Ocultar' : 'Mostrar';
  ver.setAttribute('aria-pressed', String(mostrar));
});

const form = $('#acesso'), erro = $('#erro'), botao = $('#entrar');
form.addEventListener('submit', ev => {
  ev.preventDefault();
  const usuario = form.usuario.value, s = form.senha.value;
  if (!usuario.trim() || !s) { erro.textContent = 'Preencha o usuário e a senha.'; (usuario.trim() ? senha : form.usuario).focus(); return; }
  botao.disabled = true; botao.textContent = 'Conferindo…'; erro.textContent = '';
  // Dá tempo de o botão mudar antes do cálculo da chave (leva cerca de meio segundo)
  setTimeout(() => {
    const ok = derivarChave(usuario, s) === A.chave;
    if (ok) {
      A.sair(); A.entrar();
      botao.textContent = 'Entrando…';
      location.replace(destino());
      return;
    }
    botao.disabled = false; botao.textContent = 'Entrar';
    erro.textContent = 'Usuário ou senha incorretos. Confira e tente de novo.';
    senha.select();
  }, 40);
});
