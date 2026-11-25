// "Baixar o app" do Mastigô: app instalável pelo próprio navegador (PWA), no iPhone e no Android.
// Não há arquivo para baixar (.apk/.exe): quem instala é o Safari/Chrome, então antivírus e Play Protect
// não têm o que bloquear. Qualquer elemento com [data-instalar] recebe o cartão com o passo a passo certo
// para o aparelho (iPhone, Android, computador ou navegador do Instagram, que não instala apps).
const ua = navigator.userAgent || '';
const ehIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const ehAndroid = /Android/i.test(ua);
const dentroDeApp = /Instagram|FBAN|FBAV|FB_IAB|Line\/|WhatsApp|TikTok|musical_ly|Snapchat/i.test(ua);
const ehChromeIOS = ehIOS && /CriOS/.test(ua);
const ehSafariIOS = ehIOS && !dentroDeApp && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
const HOST = 'xn--mastig-nxa.com';
const quer = new URLSearchParams(location.search).has('instalar');
// Sai do navegador do Instagram direto para o Safari (iPhone) ou Chrome (Android), já na tela de instalar.
// Se o atalho não funcionar (o Instagram às vezes bloqueia), o cartão mostra o caminho manual.
function abrirFora(botao) {
  const destino = `${HOST}/index.html?instalar=1`;
  if (ehAndroid) location.href = `intent://${destino}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent('https://' + destino)};end`;
  else location.href = `x-safari-https://${destino}`;
  setTimeout(() => { if (document.visibilityState === 'visible') { falhouSaida = true; desenharTodos(); if (botao) botao.textContent = 'Não abriu? Siga o passo abaixo'; } }, 1600);
}
let falhouSaida = false;
const instalado = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
// O Chrome pode oferecer a instalação antes deste arquivo carregar: o <head> guarda o pedido em window.__mastigoPedido.
let pedido = window.__mastigoPedido || null;   // evento beforeinstallprompt (Chrome/Edge/Samsung)

if ('serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127\.)/.test(location.hostname))) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js?v=6077276').catch(() => {}));
}
addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); pedido = ev; desenharTodos(); });
// Um toque e instala: o pedido do Chrome/Samsung (Android) ou a Web Install API (navigator.install), onde existir.
// O iPhone não tem nenhum dos dois: lá a Apple só deixa instalar pelo menu Compartilhar, então abre o guia.
async function instalarAgora(botao) {
  if (pedido) { const p = pedido; pedido = null; p.prompt(); try { await p.userChoice; } catch { /* */ } desenharTodos(); return true; }
  if (typeof navigator.install === 'function' && !ehIOS) { try { await navigator.install(); desenharTodos(); return true; } catch { /* recusou ou não disponível */ } }
  return false;
}
addEventListener('appinstalled', () => { pedido = null; desenharTodos(); });

const ICO = {
  share: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  mais: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  pontos: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg>',
  ok: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
const PASSOS = {
  iphone: [`Toque em <b>Compartilhar</b> <span class="inst-ic">${ICO.share}</span> na barra de baixo. <small>(No iOS 26, se não aparecer, toque em <b>···</b> e depois em <b>Compartilhar</b>.)</small>`, `Role a lista e toque em <b>Adicionar à Tela de Início</b> <span class="inst-ic">${ICO.mais}</span>.`, `Deixe <b>Abrir como app web</b> ligado (se aparecer) e toque em <b>Adicionar</b>. Pronto: o ícone do Mastigô fica junto dos outros apps.`],
  chromeios: [`Toque em <b>Compartilhar</b> <span class="inst-ic">${ICO.share}</span> ao lado do endereço, no alto.`, `Toque em <b>Adicionar à Tela de Início</b> <span class="inst-ic">${ICO.mais}</span>.`, `Toque em <b>Adicionar</b>. Pronto: o ícone do Mastigô fica junto dos outros apps.`],
  android: [`Toque nos três pontinhos <span class="inst-ic">${ICO.pontos}</span> do Chrome, no canto de cima.`, `Toque em <b>Instalar app</b> (em alguns celulares aparece <b>Adicionar à tela inicial</b>) e depois em <b>Instalar</b>. O Mastigô entra na lista de apps do celular.`]
};

function estilo() {
  if (document.getElementById('inst-estilo')) return;
  const s = document.createElement('style'); s.id = 'inst-estilo';
  s.textContent = `.inst{border-radius:22px;background:linear-gradient(135deg,#7b2ff7,#d4148f);color:#fff;padding:22px;display:grid;gap:14px;font-family:inherit}
.inst-topo{display:flex;gap:14px;align-items:center}.inst-topo img{width:58px;height:58px;border-radius:14px;box-shadow:0 6px 16px rgba(0,0,0,.25)}
.inst h3{margin:0;font-size:1.15rem;line-height:1.2;color:#fff}.inst p{margin:0;font-size:.95rem;line-height:1.45;color:#f6eeff}
.inst-abas{display:flex;gap:8px}.inst-abas button{flex:1;border:0;border-radius:999px;padding:9px 12px;font:inherit;font-weight:700;cursor:pointer;background:rgba(255,255,255,.18);color:#fff}
.inst-abas button[aria-selected=true]{background:#fff;color:#5a1fc0}
.inst ol{margin:0;padding:0;list-style:none;display:grid;gap:9px;counter-reset:p}
.inst li{counter-increment:p;display:flex;gap:11px;align-items:flex-start;background:rgba(255,255,255,.12);border-radius:14px;padding:10px 12px;font-size:.95rem;line-height:1.4}
.inst li:before{content:counter(p);flex:0 0 26px;height:26px;border-radius:50%;background:#ffc400;color:#2a0a5e;font-weight:800;display:grid;place-items:center;font-size:.85rem}
.inst-ic{display:inline-flex;vertical-align:middle;background:#fff;color:#5a1fc0;border-radius:7px;padding:2px 3px;margin:0 2px}
.inst-btn{border:0;border-radius:999px;padding:13px 20px;font:inherit;font-weight:800;font-size:1rem;cursor:pointer;background:#ffc400;color:#2a0a5e;box-shadow:0 8px 18px rgba(0,0,0,.2)}
.inst-btn:focus-visible,.inst-abas button:focus-visible{outline:3px solid #fff;outline-offset:2px}
.inst-nota{font-size:.82rem!important;opacity:.92}.inst-ok{display:flex;gap:10px;align-items:center;font-weight:700}
.inst-aviso{background:#fff;color:#2a0a5e;border-radius:14px;padding:12px 14px;font-size:.95rem;line-height:1.45}
.inst-sec{background:#efe7ff;color:#5a1fc0;box-shadow:none}.inst small{opacity:.9}.inst-abas button{font-size:.85rem;padding:9px 6px}
#inst-guia{position:fixed;inset:0;z-index:9999;background:rgba(26,8,60,.88);overflow-y:auto;-webkit-overflow-scrolling:touch;font-family:inherit}
.inst-guia-in{min-height:100%;display:flex;flex-direction:column;justify-content:flex-end;padding:66px 16px 100px}
#inst-guia .inst{max-width:520px;margin:0 auto;width:100%}
.inst-guia-vid{margin:0 auto 14px;width:min(190px,48vw);text-align:center}
.inst-guia-vid video{display:block;width:100%;aspect-ratio:9/16;border-radius:20px;background:#7b2ff7;box-shadow:0 12px 30px rgba(0,0,0,.35)}
.inst-guia-vid figcaption{margin-top:8px;color:#fff;font-weight:700;font-size:.9rem}
#inst-guia .seta{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);width:64px;height:64px;color:#ffc400;animation:inst-pula 1s ease-in-out infinite}
#inst-guia .fechar{position:fixed;z-index:2;right:14px;top:14px;background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:999px;padding:8px 14px;font:inherit;font-weight:700}
@keyframes inst-pula{0%,100%{transform:translate(-50%,0)}50%{transform:translate(-50%,12px)}}
@media (prefers-reduced-motion:reduce){#inst-guia .seta{animation:none}}`;
  document.head.appendChild(s);
}

function cartao(el) {
  const aba = el.dataset.aba || (ehAndroid ? 'android' : ehChromeIOS ? 'chromeios' : 'iphone');
  const icone = './icone-192.png';
  if (instalado()) {
    el.innerHTML = `<div class="inst"><div class="inst-topo"><img src="${icone}" alt=""><div><h3>App instalado</h3><p class="inst-ok">${ICO.ok} Você já está usando o Mastigô como app neste aparelho.</p></div></div></div>`;
    return;
  }
  const passos = PASSOS[aba].map(p => `<li><span>${p}</span></li>`).join('');
  const dentroDoGuia = !!el.closest('#inst-guia');
  const botao = pedido ? `<button class="inst-btn" type="button" data-inst="instalar">Instalar o app agora</button>`
    : (!dentroDeApp && !dentroDoGuia && (ehIOS || ehAndroid)) ? `<button class="inst-btn" type="button" data-inst="guia">${ehIOS ? 'Instalar no iPhone' : 'Instalar no Android'}</button>` : '';
  const sair = ehAndroid ? 'Abrir no Chrome e instalar' : 'Abrir no Safari e instalar';
  const aviso = dentroDeApp
    ? `<button class="inst-btn" type="button" data-inst="sair">${sair}</button>
       <div class="inst-aviso">${falhouSaida ? '<b>O Instagram não deixou abrir sozinho.</b> ' : ''}Se não abrir, toque nos <b>três pontinhos</b> no canto de cima e escolha <b>Abrir no navegador</b> (pode aparecer como <b>Abrir no navegador externo</b> ou <b>Abrir no Safari</b>). Depois siga o passo a passo abaixo. <button class="inst-btn inst-sec" type="button" data-inst="copiar" style="margin-top:10px;width:100%">Copiar o endereço</button></div>`
    : '';
  el.innerHTML = `<div class="inst">
  <div class="inst-topo"><img src="${icone}" alt=""><div><h3>${el.dataset.titulo || 'Baixe o app do Mastigô'}</h3><p>${el.dataset.titulo ? 'Siga os toques abaixo e o Mastigô vira um app no seu celular.' : 'Grátis, direto do site, sem loja e sem arquivo para baixar.'}</p></div></div>
  ${aviso}${botao}
  <div class="inst-abas" role="tablist"><button type="button" role="tab" aria-selected="${aba === 'iphone'}" data-inst="iphone">iPhone (Safari)</button><button type="button" role="tab" aria-selected="${aba === 'chromeios'}" data-inst="chromeios">iPhone (Chrome)</button><button type="button" role="tab" aria-selected="${aba === 'android'}" data-inst="android">Android</button></div>
  <ol>${passos}</ol>
  <p class="inst-nota">É o próprio Safari ou Chrome que instala, por isso o celular não mostra alerta de vírus. O app abre em tela cheia, com ícone próprio, e usa a mesma conta e os mesmos dados do site.</p>
</div>`;
}
function desenharTodos() { estilo(); document.querySelectorAll('[data-instalar]').forEach(cartao); }

document.addEventListener('click', async ev => {
  const lk = ev.target.closest('a[href$="#app"]');
  if (lk && !instalado() && (dentroDeApp || ehIOS || ehAndroid)) {
    ev.preventDefault();
    if (await instalarAgora()) return;
    guia(true);
    if (dentroDeApp) abrirFora();
    return;
  }
  const b = ev.target.closest('[data-inst]'); if (!b) return;
  const el = b.closest('[data-instalar]'), acao = b.dataset.inst;
  if (acao === 'iphone' || acao === 'android' || acao === 'chromeios') { el.dataset.aba = acao; cartao(el); return; }
  if (acao === 'sair') { abrirFora(b); return; }
  if (acao === 'guia') { if (!(await instalarAgora(b))) guia(true); return; }
  if (acao === 'fechar') { document.getElementById('inst-guia')?.remove(); return; }
  if (acao === 'instalar') { if (!(await instalarAgora(b))) guia(true); return; }
  if (acao === 'copiar') {
    const url = 'https://mastigô.com/';
    try { await navigator.clipboard.writeText(url); b.textContent = 'Endereço copiado: cole no Safari ou Chrome'; } catch { b.textContent = url; }
  }
});
// O sistema monta as telas depois: preenche os cartões que forem aparecendo
new MutationObserver(() => { document.querySelectorAll('[data-instalar]:not([data-inst-pronto])').forEach(el => { el.dataset.instPronto = '1'; estilo(); cartao(el); }); })
  .observe(document.documentElement, { childList: true, subtree: true });
// Vídeos de instalação (videos/instalar-iphone.mp4 e instalar-android.mp4, sem som): tocam sozinhos quando aparecem
// na tela e pausam quando saem; quem pede menos movimento no aparelho dá o play quando quiser.
const VIDEO = { iphone: 'iPhone', android: 'Android' };
const qualVideo = () => (ehAndroid ? 'android' : 'iphone');
const poucoMovimento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function trocarVideo(v, qual) {
  if (v.dataset.qual === qual) return;
  v.dataset.qual = qual; v.poster = `./videos/instalar-${qual}.jpg`; v.src = `./videos/instalar-${qual}.mp4`;
  v.setAttribute('aria-label', `Vídeo sem som: como instalar o app do Mastigô no ${VIDEO[qual]}, passo a passo`);
}
const olhoVideo = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
  const v = e.target;
  if (e.isIntersecting && !poucoMovimento()) { v.play?.().catch(() => {}); } else if (!e.isIntersecting) v.pause?.();
}), { threshold: .45 }) : null;
function prepararVideos() {
  document.querySelectorAll('[data-video-app]:not([data-vid-pronto])').forEach(fig => {
    fig.dataset.vidPronto = '1';
    const v = fig.querySelector('video'); const qual = qualVideo();
    trocarVideo(v, qual);
    fig.querySelectorAll('[data-vid]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.vid === qual)));
    olhoVideo?.observe(v);
  });
}
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-vid]'); if (!b) return;
  const fig = b.closest('[data-video-app]'), v = fig.querySelector('video');
  fig.querySelectorAll('[data-vid]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
  trocarVideo(v, b.dataset.vid); v.play?.().catch(() => {});
});
function guia(forcar = false) {
  if ((!quer && !forcar) || instalado() || document.getElementById('inst-guia')) return;
  if (dentroDeApp && !forcar) { try { if (!sessionStorage.getItem('inst-saiu')) { sessionStorage.setItem('inst-saiu', '1'); abrirFora(); } } catch { abrirFora(); } }
  const g = document.createElement('div'); g.id = 'inst-guia'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-label', 'Instalar o app do Mastigô');
  const seta = ehSafariIOS ? '<svg class="seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v15M5 12l7 7 7-7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '';
  const q = qualVideo();
  const video = `<figure class="inst-guia-vid"><video src="./videos/instalar-${q}.mp4" poster="./videos/instalar-${q}.jpg" muted playsinline loop controls ${poucoMovimento() ? '' : 'autoplay'} aria-label="Vídeo sem som: como instalar o app do Mastigô no ${VIDEO[q]}, passo a passo"></video><figcaption>Veja como fazer</figcaption></figure>`;
  g.innerHTML = `<button class="fechar" type="button" data-inst="fechar">Fechar</button><div class="inst-guia-in">${video}<div data-instalar data-titulo="${dentroDeApp ? 'Abra no navegador para instalar' : 'Falta só um passo'}"></div></div>${seta}`;
  document.body.appendChild(g);
}
if (document.readyState !== 'loading') { desenharTodos(); prepararVideos(); guia(); } else document.addEventListener('DOMContentLoaded', () => { desenharTodos(); prepararVideos(); guia(); });
export { desenharTodos };
