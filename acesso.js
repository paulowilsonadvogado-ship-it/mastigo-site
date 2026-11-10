// Tela do acesso master do pré-lançamento (ver acesso-guarda.js).
import { derivarChave } from './acesso-chave.js';
import { iconeAlimento } from './alimentos-icones.js';

const $ = s => document.querySelector(s);
const A = window.MASTIGO_ACESSO || { ativo: false };

// Só volta para páginas do próprio site
function destino() {
  const v = new URLSearchParams(location.search).get('volta') || '';
  return /^(index|sistema)\.html(?:[?#].*)?$/.test(v) ? './' + v : './index.html';
}
if (!A.ativo || A.valido()) location.replace(destino());

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
