// "Baixar o app" do Mastigô: app instalável pelo próprio navegador (PWA), no iPhone e no Android.
// Não há arquivo para baixar (.apk/.exe): quem instala é o Safari/Chrome, então antivírus e Play Protect
// não têm o que bloquear. Qualquer elemento com [data-instalar] recebe o cartão com o passo a passo certo
// para o aparelho (iPhone, Android, computador ou navegador do Instagram, que não instala apps).
const ua = navigator.userAgent || '';
const ehIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const ehAndroid = /Android/i.test(ua);
const dentroDeApp = /Instagram|FBAN|FBAV|FB_IAB|Line\/|WhatsApp|TikTok|musical_ly|Snapchat/i.test(ua);
const instalado = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
let pedido = null;   // evento beforeinstallprompt (Chrome/Edge/Samsung)

if ('serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127\.)/.test(location.hostname))) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js?v=51a1f2d').catch(() => {}));
}
addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); pedido = ev; desenharTodos(); });
addEventListener('appinstalled', () => { pedido = null; desenharTodos(); });

const ICO = {
  share: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  mais: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  pontos: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg>',
  ok: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
const PASSOS = {
  iphone: [`Abra <b>mastigô.com</b> no <b>Safari</b>.`, `Toque em <b>Compartilhar</b> <span class="inst-ic">${ICO.share}</span> (na barra de baixo).`, `Role e toque em <b>Adicionar à Tela de Início</b> <span class="inst-ic">${ICO.mais}</span>.`, `Toque em <b>Adicionar</b>. O ícone do Mastigô aparece junto dos outros apps.`],
  android: [`Abra <b>mastigô.com</b> no <b>Chrome</b>.`, `Toque em <b>Instalar o app</b> aqui ou no menu <span class="inst-ic">${ICO.pontos}</span>.`, `Confirme em <b>Instalar</b>. O Mastigô entra na lista de apps do celular.`]
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
.inst-aviso{background:#fff;color:#2a0a5e;border-radius:14px;padding:12px 14px;font-size:.95rem;line-height:1.45}`;
  document.head.appendChild(s);
}

function cartao(el) {
  const aba = el.dataset.aba || (ehAndroid ? 'android' : 'iphone');
  const icone = './icone-192.png';
  if (instalado()) {
    el.innerHTML = `<div class="inst"><div class="inst-topo"><img src="${icone}" alt=""><div><h3>App instalado</h3><p class="inst-ok">${ICO.ok} Você já está usando o Mastigô como app neste aparelho.</p></div></div></div>`;
    return;
  }
  const passos = PASSOS[aba].map(p => `<li><span>${p}</span></li>`).join('');
  const botao = pedido ? `<button class="inst-btn" type="button" data-inst="instalar">Instalar o app agora</button>` : '';
  const aviso = dentroDeApp
    ? `<div class="inst-aviso"><b>Você abriu pelo Instagram.</b> O navegador do Instagram não instala apps. Toque nos <b>três pontinhos</b> no canto de cima da tela e escolha <b>Abrir no navegador</b> (ou <b>Abrir no Safari/Chrome</b>). <button class="inst-btn" type="button" data-inst="copiar" style="margin-top:10px;width:100%">Copiar o endereço</button></div>`
    : '';
  el.innerHTML = `<div class="inst">
  <div class="inst-topo"><img src="${icone}" alt=""><div><h3>Baixe o app do Mastigô</h3><p>Grátis, direto do site, sem loja e sem arquivo para baixar.</p></div></div>
  ${aviso}${botao}
  <div class="inst-abas" role="tablist"><button type="button" role="tab" aria-selected="${aba === 'iphone'}" data-inst="iphone">iPhone</button><button type="button" role="tab" aria-selected="${aba === 'android'}" data-inst="android">Android</button></div>
  <ol>${passos}</ol>
  <p class="inst-nota">É o próprio Safari ou Chrome que instala, por isso o celular não mostra alerta de vírus. O app abre em tela cheia, com ícone próprio, e usa a mesma conta e os mesmos dados do site.</p>
</div>`;
}
function desenharTodos() { estilo(); document.querySelectorAll('[data-instalar]').forEach(cartao); }

document.addEventListener('click', async ev => {
  const b = ev.target.closest('[data-inst]'); if (!b) return;
  const el = b.closest('[data-instalar]'), acao = b.dataset.inst;
  if (acao === 'iphone' || acao === 'android') { el.dataset.aba = acao; cartao(el); return; }
  if (acao === 'instalar' && pedido) { pedido.prompt(); try { await pedido.userChoice; } catch { /* */ } pedido = null; desenharTodos(); return; }
  if (acao === 'copiar') {
    const url = 'https://mastigô.com/';
    try { await navigator.clipboard.writeText(url); b.textContent = 'Endereço copiado: cole no Safari ou Chrome'; } catch { b.textContent = url; }
  }
});
// O sistema monta as telas depois: preenche os cartões que forem aparecendo
new MutationObserver(() => { document.querySelectorAll('[data-instalar]:not([data-inst-pronto])').forEach(el => { el.dataset.instPronto = '1'; estilo(); cartao(el); }); })
  .observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState !== 'loading') desenharTodos(); else document.addEventListener('DOMContentLoaded', desenharTodos);
export { desenharTodos };
