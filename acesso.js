// Tela do acesso master do pré-lançamento (ver acesso-guarda.js).
import { derivarChave } from './acesso-chave.js?v=61ed05f';
import { iconeAlimento } from './alimentos-icones.js?v=61ed05f';
import { SITE } from './config-site.js?v=61ed05f';
import { verificarAssinatura, salvarConta } from './assinatura.js?v=61ed05f';
import { entrar as entrarNuvem, baixar, aplicarNoAparelho, enviar, pedirNovaSenha, sessaoLocal } from './nuvem.js?v=61ed05f';

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
  const MSG = { cancelada: 'Sua assinatura do Mastigô foi cancelada no Mercado Pago.', 'cancelada-no-teste': 'Sua assinatura foi cancelada durante o teste grátis.', pausada: 'Sua assinatura está pausada no Mercado Pago.' };
  box.innerHTML = conta.status === 'bloqueada' && conta.situacaoMp === 'nao-encontrada'
    ? `<b>Não encontramos sua assinatura${nome ? `, ${esc(nome)}` : ''}.</b><p>Procuramos no Mercado Pago pelo e-mail <b>${esc(conta.email || '')}</b>. Se você assinou com outro e-mail, informe abaixo.</p>
<form id="email-mp" class="email-mp"><label for="em-mp">E-mail da sua conta do Mercado Pago</label><input id="em-mp" type="email" required autocomplete="email" value="${esc(conta.emailMp || '')}"><button class="botao botao-roxo" type="submit">Conferir e entrar</button><p id="em-erro" class="erro" role="alert"></p></form>
<p>Ainda não assinou? <a href="${esc(SITE.checkoutUrl)}">Assinar no Mercado Pago</a> (os ${SITE.diasTeste} primeiros dias são grátis).</p>`
    : conta.status === 'bloqueada'
    ? `<b>${esc(MSG[conta.situacaoMp] || 'Sua assinatura não está ativa.')}</b><p>Seus dados continuam guardados neste aparelho. Para voltar a usar, assine de novo.</p><a class="botao botao-roxo" href="${esc(SITE.checkoutUrl)}">Assinar novamente</a>`
    : conta.status === 'aguardando-cartao' && SITE.checkoutUrl
    ? `<b>Falta só o cartão${nome ? `, ${esc(nome)}` : ''}.</b><p>Seu cadastro está feito. Para entrar, conclua a assinatura no Mercado Pago (os ${SITE.diasTeste} primeiros dias são grátis).</p><a class="botao botao-roxo" href="${esc(SITE.checkoutUrl)}">Cadastrar o cartão</a>`
    : `<b>Olá${nome ? `, ${esc(nome)}` : ''}!</b><p>Seu cadastro está completo neste aparelho.</p><a class="botao botao-roxo" href="./sistema.html">Abrir o sistema</a>`;
  box.hidden = false;
  $('#cadastro-link').hidden = true;
  $('#email-mp')?.addEventListener('submit', async ev => {
    ev.preventDefault();
    const email = $('#em-mp').value.trim(), btn = ev.target.querySelector('button');
    btn.disabled = true; btn.textContent = 'Conferindo…';
    conta.emailMp = email; conta.status = 'teste'; salvarConta(conta);
    const d = await verificarAssinatura(conta);
    if (d.acesso) { location.replace('./sistema.html'); return; }
    btn.disabled = false; btn.textContent = 'Conferir e entrar';
    $('#em-erro').textContent = d.motivo === 'nao-encontrada' ? 'Também não achamos assinatura com esse e-mail. A lista é atualizada a cada 15 minutos: se assinou agora, tente de novo daqui a pouco.' : (MSG[d.motivo] || 'Assinatura não está ativa.');
  });
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

// ---------- Login das clientes (nuvem) ----------
document.querySelectorAll('[data-ver]').forEach(b => b.addEventListener('click', () => {
  const campo = document.getElementById(b.dataset.ver), mostrar = campo.type === 'password';
  campo.type = mostrar ? 'text' : 'password'; b.textContent = mostrar ? 'Ocultar' : 'Mostrar'; b.setAttribute('aria-pressed', String(mostrar));
}));
const fc = $('#cliente'), clErro = $('#cl-erro'), clBotao = $('#cl-entrar');
if (conta?.email) $('#cl-email').value = conta.email;
if (sessaoLocal()) { $('#cl-email').value = sessaoLocal().email || $('#cl-email').value; }
fc.addEventListener('submit', async ev => {
  ev.preventDefault();
  const email = fc.email.value.trim(), s = fc.senha.value;
  if (!email || !s) { clErro.textContent = 'Preencha o e-mail e a senha.'; return; }
  clBotao.disabled = true; clBotao.textContent = 'Entrando…'; clErro.textContent = '';
  try {
    await entrarNuvem(email, s);
    clBotao.textContent = 'Trazendo seus dados…';
    const remoto = await baixar();
    if (Array.isArray(remoto?.dados?.patients) || remoto?.dados?.__conta) aplicarNoAparelho(remoto.dados);
    else {
      // Primeira vez na nuvem: leva o que já está neste aparelho
      let local = null; try { local = JSON.parse(localStorage.getItem('pipoca-demo-v1') || 'null'); } catch { /* */ }
      if (local) await enviar({ ...local, __conta: conta || null });
    }
    let c = null; try { c = JSON.parse(localStorage.getItem('mastigo-conta') || 'null'); } catch { /* */ }
    if (!c) { c = { nome: '', email, criadoEm: new Date().toISOString(), status: 'teste', cartaoEm: new Date().toISOString() }; salvarConta(c); }
    location.replace('./sistema.html');
  } catch (e) {
    clBotao.disabled = false; clBotao.textContent = 'Entrar';
    clErro.textContent = e.message || 'Não foi possível entrar agora. Confira a internet e tente de novo.';
  }
});
$('#cl-esqueci').addEventListener('click', async () => {
  const email = fc.email.value.trim();
  if (!email) { clErro.textContent = 'Digite o seu e-mail acima e toque de novo em "Esqueci a senha".'; fc.email.focus(); return; }
  try { await pedirNovaSenha(email); clErro.textContent = 'Se houver conta com esse e-mail, enviamos um link para criar uma senha nova.'; }
  catch (e) { clErro.textContent = e.message; }
});
