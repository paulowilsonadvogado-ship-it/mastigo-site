// Cópia de segurança diária dos dados do Mastigô.
// Nesta fase os dados ficam só no navegador (localStorage), então a cópia é feita pelo próprio sistema:
// - Chrome/Edge no computador: a nutricionista escolhe uma pasta uma vez (de preferência sincronizada com
//   Google Drive/OneDrive). Ao abrir o sistema, uma vez por dia, a cópia é gravada nessa pasta; ficam as
//   últimas 30. Se o navegador pedir de novo a permissão da pasta, um toque no aviso resolve.
// - Demais navegadores (Safari, celular): aviso diário com o botão "Baixar cópia de hoje".
// - Restaurar: Minha clínica › Cópia de segurança › Restaurar cópia (substitui os dados deste navegador).
// A cópia leva o estado do sistema (pipoca-demo-v1) e a conta da assinatura (mastigo-conta).
// Nunca leva o token do Mercado Pago (mastigo-mp-token) nem sessões.

export const CHAVES = ['pipoca-demo-v1', 'mastigo-conta'];
export const MANTER = 30;
const META = 'mastigo-copia';
const PREFIXO = 'mastigo-copia-';
const RE_ARQUIVO = /^mastigo-copia-(\d{4}-\d{2}-\d{2})\.json$/;

export const hojeISO = (agora = new Date()) => agora.toLocaleDateString('sv-SE');
export const nomeArquivo = (dia) => `${PREFIXO}${dia}.json`;

export function montarCopia(armazenamento, agora = new Date()) {
  const dados = {};
  for (const k of CHAVES) {
    const v = armazenamento.getItem(k);
    if (v != null) dados[k] = JSON.parse(v);
  }
  return { app: 'Mastigô', formato: 1, criadoEm: agora.toISOString(), dados };
}

// Confere o arquivo antes de restaurar. Devolve a cópia ou lança um erro com mensagem para a tela.
export function lerCopia(texto) {
  let c;
  try { c = JSON.parse(texto); } catch { throw new Error('Este arquivo não é uma cópia do Mastigô.'); }
  if (!c || c.app !== 'Mastigô' || c.formato !== 1 || !c.dados || typeof c.dados !== 'object') throw new Error('Este arquivo não é uma cópia do Mastigô.');
  const s = c.dados['pipoca-demo-v1'];
  if (!s || !Array.isArray(s.patients) || !Array.isArray(s.entries)) throw new Error('A cópia está incompleta: faltam os dados do sistema.');
  return c;
}

export function resumoCopia(c) {
  const s = c.dados['pipoca-demo-v1'];
  return { criadoEm: c.criadoEm, criancas: s.patients.length, registros: s.entries.length, lancamentos: s.financeiro?.lancamentos?.length || 0 };
}

export function restaurarCopia(c, armazenamento) {
  for (const k of CHAVES) {
    if (c.dados[k] != null) armazenamento.setItem(k, JSON.stringify(c.dados[k]));
  }
}

// Das cópias na pasta, quais apagar para ficarem só as `manter` mais recentes
export function paraApagar(nomes, manter = MANTER) {
  const datadas = nomes.filter(n => RE_ARQUIVO.test(n)).sort();
  return datadas.slice(0, Math.max(0, datadas.length - manter));
}

// Há o que copiar? (evita aviso para quem ainda não registrou nada)
export function temDados(s) {
  return !!s && ((s.patients?.length || 0) + (s.entries?.length || 0) + (s.financeiro?.lancamentos?.length || 0)) > 0;
}

export function precisaAvisar(meta, s, dia) {
  if (!temDados(s)) return false;
  return meta.ultima !== dia && meta.adiado !== dia;
}

// ---------- Pasta escolhida (File System Access API, guardada no IndexedDB) ----------
const suportaPasta = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window;
function banco() {
  return new Promise((ok, erro) => {
    const r = indexedDB.open('mastigo-copia', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('k');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => erro(r.error);
  });
}
async function idb(modo, fn) {
  const db = await banco();
  return new Promise((ok, erro) => {
    const t = db.transaction('k', modo), req = fn(t.objectStore('k'));
    t.oncomplete = () => { db.close(); ok(req?.result); };
    t.onerror = () => { db.close(); erro(t.error); };
  });
}
const lerPasta = () => idb('readonly', s => s.get('pasta')).catch(() => null);
const guardarPasta = h => idb('readwrite', s => s.put(h, 'pasta'));
const esquecerPasta = () => idb('readwrite', s => s.delete('pasta'));

export function createCopia(ctx) {
  const lerMeta = () => { try { return JSON.parse(localStorage.getItem(META) || '{}') || {}; } catch { return {}; } };
  const salvarMeta = m => { try { localStorage.setItem(META, JSON.stringify(m)); } catch { /* sem armazenamento */ } };
  const textoCopia = () => JSON.stringify(montarCopia(localStorage), null, 1);
  const dataHora = iso => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  let pastaNome = lerMeta().pasta || '';

  function registrar(modo) {
    const m = lerMeta(), agora = new Date();
    salvarMeta({ ...m, ultima: hojeISO(agora), ultimaEm: agora.toISOString(), modo, adiado: undefined });
  }

  function baixar() {
    const blob = new Blob([textoCopia()], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: nomeArquivo(hojeISO()) });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    registrar('download');
  }

  async function gravarNaPasta(pasta) {
    const arq = await pasta.getFileHandle(nomeArquivo(hojeISO()), { create: true });
    const w = await arq.createWritable();
    await w.write(textoCopia()); await w.close();
    const nomes = [];
    for await (const [nome, h] of pasta.entries()) if (h.kind === 'file') nomes.push(nome);
    for (const n of paraApagar(nomes)) await pasta.removeEntry(n).catch(() => {});
    registrar('pasta');
  }

  // Precisa de um toque (gesto) quando o navegador pede a permissão de novo
  async function permitir(pasta, pedir) {
    const op = { mode: 'readwrite' };
    if ((await pasta.queryPermission?.(op)) === 'granted') return true;
    return pedir ? (await pasta.requestPermission?.(op)) === 'granted' : false;
  }

  async function escolherPasta() {
    const pasta = await window.showDirectoryPicker({ id: 'mastigo-copia', mode: 'readwrite', startIn: 'documents' });
    await guardarPasta(pasta);
    pastaNome = pasta.name; salvarMeta({ ...lerMeta(), pasta: pasta.name });
    await gravarNaPasta(pasta);
    return pasta;
  }

  async function gravarAgora(comToque) {
    const pasta = suportaPasta() ? await lerPasta() : null;
    if (pasta && await permitir(pasta, comToque)) { await gravarNaPasta(pasta); return 'pasta'; }
    if (!comToque) return null;
    if (suportaPasta()) { await escolherPasta(); return 'pasta'; }
    baixar(); return 'download';
  }

  // ---------- Aviso diário ----------
  function fecharAviso() { document.getElementById('aviso-copia')?.remove(); }
  function mostrarAviso(temPasta) {
    fecharAviso();
    const e = ctx.esc, el = document.createElement('aside');
    el.id = 'aviso-copia'; el.className = 'aviso-copia'; el.setAttribute('role', 'status');
    const principal = temPasta
      ? `<button class="button primary small" data-action="copia-gravar">Gravar a cópia de hoje</button>`
      : suportaPasta()
        ? `<button class="button primary small" data-action="copia-pasta">Escolher pasta (automático)</button><button class="button small" data-action="copia-baixar">Só baixar hoje</button>`
        : `<button class="button primary small" data-action="copia-baixar">Baixar cópia de hoje</button>`;
    const texto = temPasta
      ? `O navegador pediu de novo a permissão da pasta <b>${e(pastaNome || 'escolhida')}</b>. Um toque grava a cópia de hoje.`
      : suportaPasta()
        ? 'Seus dados ficam só neste navegador. Escolha uma pasta (de preferência do Google Drive ou OneDrive) e o Mastigô grava uma cópia por dia, sozinho.'
        : 'Seus dados ficam só neste navegador. Baixe a cópia de hoje e guarde num lugar seguro (Drive, e-mail ou computador).';
    el.innerHTML = `<div><strong>Cópia de segurança</strong><p>${texto}</p><div class="aviso-copia-botoes">${principal}<button class="button small" data-action="copia-adiar">Agora não</button></div></div>`;
    document.body.append(el);
  }

  async function aoIniciar() {
    try {
      if (/^#entrar/.test(location.hash) || sessionStorage.getItem('pipoca-familia')) return; // tela da família
      const dia = hojeISO();
      if (!precisaAvisar(lerMeta(), ctx.state, dia)) return;
      const pasta = suportaPasta() ? await lerPasta() : null;
      if (pasta) {
        pastaNome = pasta.name;
        if (await permitir(pasta, false)) { await gravarNaPasta(pasta); ctx.toast(`Cópia de hoje gravada na pasta ${pasta.name}.`); return; }
        mostrarAviso(true); return;
      }
      mostrarAviso(false);
    } catch { /* a cópia nunca deve atrapalhar o uso do sistema */ }
  }

  function cartao() {
    const m = lerMeta(), e = ctx.esc;
    const ultima = m.ultimaEm ? `Última cópia: <b>${dataHora(m.ultimaEm)}</b> (${m.modo === 'pasta' ? `gravada na pasta ${e(m.pasta || pastaNome || '')}` : 'baixada'}).` : '<b>Nenhuma cópia feita ainda neste navegador.</b>';
    const comoFunciona = suportaPasta()
      ? (m.pasta ? `Cópia automática diária na pasta <b>${e(m.pasta)}</b> (ficam as últimas ${MANTER}).` : 'Escolha uma pasta, de preferência sincronizada com o Google Drive ou o OneDrive, e o Mastigô grava uma cópia por dia ao ser aberto.')
      : 'Neste navegador a cópia é baixada: o Mastigô lembra uma vez por dia.';
    return `<section class="card cartao-copia"><h2>Cópia de segurança</h2><p>Os dados ficam só neste navegador. A cópia protege contra limpeza do navegador, troca ou perda do aparelho. ${comoFunciona}</p><p class="helper">${ultima}</p>
<div class="cartao-copia-botoes">${suportaPasta() ? `<button class="button" data-action="copia-pasta">${m.pasta ? 'Trocar a pasta' : 'Escolher pasta'}</button>` : ''}<button class="button primary" data-action="copia-agora">Fazer cópia agora</button><button class="button" data-action="copia-baixar">Baixar cópia</button><label class="button" for="copia-restaurar">Restaurar cópia</label><input id="copia-restaurar" type="file" accept=".json,application/json" hidden></div>
${m.pasta && suportaPasta() ? '<button class="text-button" data-action="copia-esquecer">Parar a cópia automática nesta pasta</button>' : ''}</section>`;
  }

  async function agir(fn, ok) {
    try { const r = await fn(); fecharAviso(); if (ok) ctx.toast(typeof ok === 'function' ? ok(r) : ok); ctx.render(); }
    catch (err) { if (err?.name === 'AbortError') return; ctx.toast('Não foi possível fazer a cópia: ' + (err?.message || 'erro desconhecido') + '. Use "Baixar cópia".'); }
  }

  let pendente = null; // cópia lida, esperando a confirmação da restauração

  return {
    aoIniciar,
    cartao,
    onClick(el) {
      const a = el.dataset.action;
      if (a === 'copia-baixar') { agir(async () => baixar(), 'Cópia baixada. Guarde o arquivo num lugar seguro.'); return true; }
      if (a === 'copia-pasta') { agir(escolherPasta, p => `${p.name ? `Pasta ${p.name}` : 'Pasta'} escolhida. A cópia de hoje já foi gravada.`); return true; }
      if (a === 'copia-gravar' || a === 'copia-agora') { agir(() => gravarAgora(true), r => r === 'pasta' ? 'Cópia gravada na pasta.' : 'Cópia baixada.'); return true; }
      if (a === 'copia-adiar') { salvarMeta({ ...lerMeta(), adiado: hojeISO() }); fecharAviso(); return true; }
      if (a === 'copia-esquecer') { agir(async () => { await esquecerPasta(); const m = lerMeta(); delete m.pasta; salvarMeta(m); pastaNome = ''; }, 'A cópia automática foi desligada. Os arquivos que já estão na pasta continuam lá.'); return true; }
      if (a === 'copia-confirmar' && pendente) {
        restaurarCopia(pendente, localStorage); pendente = null;
        ctx.close(); location.reload(); return true;
      }
      return false;
    },
    onChange(e) {
      if (e.id !== 'copia-restaurar' || !e.files?.[0]) return false;
      const arquivo = e.files[0]; e.value = '';
      arquivo.text().then(texto => {
        pendente = lerCopia(texto);
        const r = resumoCopia(pendente);
        ctx.modal('Restaurar esta cópia?', `<p>Cópia de <b>${dataHora(r.criadoEm)}</b>: ${r.criancas} criança(s), ${r.registros} registro(s) no diário e ${r.lancamentos} lançamento(s) no financeiro.</p><p>Os dados atuais deste navegador serão <b>substituídos</b> pelos da cópia. Se quiser guardar os atuais antes, cancele e use "Baixar cópia".</p><div class="form-footer"><button class="button" data-action="close">Cancelar</button><button class="button primary" data-action="copia-confirmar">Restaurar</button></div>`);
      }).catch(err => ctx.toast(err.message));
      return true;
    }
  };
}
