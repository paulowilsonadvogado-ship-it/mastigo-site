// Portal da família: login dos pais (e-mail + PIN criado pela nutricionista) e área onde acompanham
// as atualizações (novidades, plano/prescrições enviadas, escada do comer, diário e consultas).
// Na demonstração os dados ficam no navegador. Na versão com servidor, o login usa o provedor de
// identidade (JWT) e a tabela pipoca.guardians, e o RLS limita os pais à própria criança.
import { foods, stages, icoAlimento } from './data.js?v=e2cde6a';
import { uid, dataBR, lerImagem } from './util-nutri.js?v=e2cde6a';
import { comportamentos, texturas } from './anamnese.js?v=e2cde6a';
import { idadeEmAnos, idadeTexto, escadaDoComer } from './nutri-ref.js?v=e2cde6a';
import { tiposNovidade, normalizarTelefone, formatarTelefone, mensagemAviso, linkWhatsApp } from './whatsapp.js?v=e2cde6a';

const MAX_TENTATIVAS = 5, BLOQUEIO_MIN = 10;

async function hashPin(pin, sal) {
  const dados = new TextEncoder().encode(`${sal}:${pin}`);
  if (crypto.subtle) {
    const h = await crypto.subtle.digest('SHA-256', dados);
    return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 0; for (const b of dados) h = (h * 31 + b) >>> 0; return 'fraco-' + h.toString(16);
}
const novoPin = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
const normEmail = e => String(e || '').trim().toLowerCase();

export function createPortal(ctx, plano) {
  const { esc, icon, heading, button, toast, modal, close } = ctx;
  const S = () => ctx.state;
  let aba = 'novidades', fpPaciente = null, pinRecemGerado = null;

  // Sessão da família só na aba do navegador (sessionStorage), nunca no armazenamento permanente
  function sessao() { try { return JSON.parse(sessionStorage.getItem('pipoca-familia') || 'null'); } catch { return ctx._sessaoMem || null; } }
  function setSessao(v) { try { v ? sessionStorage.setItem('pipoca-familia', JSON.stringify(v)) : sessionStorage.removeItem('pipoca-familia'); } catch { ctx._sessaoMem = v; } }

  const acessos = () => S().acessos || (S().acessos = {});
  const atualizacoes = () => S().atualizacoes || (S().atualizacoes = []);
  const paciente = id => S().patients.find(p => p.id === id);
  const questionarios = () => S().questionarios || (S().questionarios = {});
  const metas = () => S().metas || (S().metas = {});
  let fotoPendente = null;
  const semana = (base = new Date()) => { const d = new Date(base); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return Array.from({ length: 7 }, (_, i) => { const x = new Date(d); x.setDate(d.getDate() + i); return x.toLocaleDateString('sv-SE'); }); };
  function adesao(pid) {
    const m = metas()[pid]; if (!m?.itens?.length) return null;
    const dias = semana().filter(d => d <= new Date().toLocaleDateString('sv-SE'));
    const feitos = dias.reduce((t, d) => t + (m.marcacoes?.[d] || []).filter(id => m.itens.some(i => i.id === id)).length, 0);
    return Math.round(feitos / (dias.length * m.itens.length) * 100);
  }
  const perfil = () => S().perfil;

  // Publica no portal. Escada do comer: junta mudanças seguidas numa novidade só (enquanto não lida/avisada).
  function publicar(pacienteId, item, { avisar = true } = {}) {
    const agora = new Date().toISOString();
    let u = item.tipo === 'escada' && atualizacoes().find(x => x.paciente === pacienteId && x.tipo === 'escada' && !x.lidoEm && !x.avisadoEm);
    if (u) Object.assign(u, item, { criadoEm: agora });
    else { u = { id: uid(), paciente: pacienteId, criadoEm: agora, lidoEm: '', avisadoEm: '', ...item }; atualizacoes().push(u); }
    if (avisar && S().whatsapp?.perguntar !== false && acessos()[pacienteId]?.ativo) setTimeout(() => oferecerAviso(pacienteId), 80);
    return u;
  }

  // ===== Aviso pelo WhatsApp =====
  // Novidades que a família ainda não leu e que ainda não foram avisadas
  const pendentes = pid => atualizacoes().filter(u => u.paciente === pid && !u.lidoEm && !u.avisadoEm);
  function linkPortal() {
    const p = perfil().linkPortal || document.querySelector('meta[name="pipoca-portal"]')?.content || '';
    return p || location.href.split('#')[0] + '#entrar';
  }
  function textoAviso(pid) {
    const p = paciente(pid), ac = acessos()[pid] || {}, perf = perfil();
    return mensagemAviso({ responsavel: ac.nome || p?.guardian, crianca: p?.name, profissional: perf.nome || S().professional, registro: perf.crn ? `Nutricionista CRN-${perf.regiaoCrn} ${perf.crn}` : 'Nutricionista', novidades: pendentes(pid), link: linkPortal() });
  }
  function oferecerAviso(pid) {
    const p = paciente(pid), ac = acessos()[pid];
    if (!p || !ac?.ativo) return;
    const nome = esc(ac.nome || p.guardian);
    if (!ac.whatsapp) {
      modal('Avisar a família pelo WhatsApp', `<div class="wa-ok">${icon('check')}<span>Publicado no portal de <b>${esc(p.name)}</b>.</span></div><p>Para avisar ${nome} pelo WhatsApp, cadastre o número do responsável (com a autorização dele para receber avisos).</p>
<div class="form-footer"><button class="button" data-action="close">Agora não</button><button class="button primary" data-fam-config="${esc(pid)}">${icon('plus')}Cadastrar WhatsApp</button></div>`);
      return;
    }
    const texto = textoAviso(pid);
    modal('Avisar a família pelo WhatsApp', `<div class="wa-ok">${icon('check')}<span>Publicado no portal de <b>${esc(p.name)}</b>.</span></div>
<p>O WhatsApp abre com a mensagem pronta para <b>${nome}</b> · ${esc(formatarTelefone(ac.whatsapp))}. É só tocar em enviar.</p>
<div class="field"><label for="wa-texto">Mensagem (pode editar)</label><textarea id="wa-texto" data-wa-pid="${esc(pid)}" rows="9" maxlength="1200">${esc(texto)}</textarea></div>
<p class="helper">A mensagem não leva dados de saúde nem o PIN: só avisa que há novidades e traz o link da Área da Família.</p>
<div class="form-footer"><button class="button" data-action="close">Agora não</button><a class="button primary wa-botao" id="wa-link" href="${esc(linkWhatsApp(ac.whatsapp, texto))}" target="_blank" rel="noopener noreferrer" data-wa="${esc(pid)}">${waIcone}Abrir WhatsApp</a></div>`);
  }
  function registrarAviso(pid) {
    const agora = new Date().toISOString(), ac = acessos()[pid];
    pendentes(pid).forEach(u => { u.avisadoEm = agora; u.avisadoPor = 'whatsapp'; });
    if (ac) ac.ultimoAviso = agora;
    ctx.save();
    setTimeout(() => { close(); ctx.render(); toast('Aviso registrado. Confira no WhatsApp se a mensagem foi enviada.'); }, 150);
  }
  const waIcone = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" stroke="none"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>';
  function pendentesAviso() { return Object.keys(acessos()).filter(pid => acessos()[pid]?.ativo && pendentes(pid).length).length; }

  // ===== Tela de login dos pais =====
  function login() {
    const p = perfil();
    return `<div class="fam-login"><div class="fam-login-card"><div class="fam-login-topo">${p.logo ? `<img src="${p.logo}" alt="">` : '<img class="fam-mastigo" src="./mastigo-icone.svg" alt="Mastigô">'}<h1>Área da família</h1><p>Acompanhe o plano, as orientações e as conquistas do seu filho com ${esc(p.nome || S().professional)}.</p></div>
<form id="fam-login-form" autocomplete="on"><div class="field"><label for="fam-email">E-mail do responsável</label><input id="fam-email" name="email" type="email" autocomplete="username" required placeholder="seuemail@exemplo.com"></div>
<div class="field"><label for="fam-pin">PIN de acesso (6 números)</label><input id="fam-pin" name="pin" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="current-password" required placeholder="••••••"></div>
<p id="fam-erro" class="error" role="alert"></p><button class="button primary fam-entrar" type="submit">${icon('lock')}Entrar</button></form>
<p class="fam-ajuda">O e-mail e o PIN de acesso são criados pela nutricionista no sistema e enviados a vocês. Não tem PIN ou esqueceu? Peça um novo a ela.</p>
<button class="text-button fam-voltar" data-action="fam-voltar-prof">${icon('arrow')}Sou profissional: voltar ao painel</button></div>
<p class="fam-aviso">Ambiente demonstrativo: o acesso fica salvo neste navegador. Use somente dados fictícios.</p></div>`;
  }

  // ===== Portal =====
  function portal(s) {
    const p = paciente(s.paciente), ac = acessos()[s.paciente];
    if (!p || !ac?.ativo) { setSessao(null); return login(); }
    const a = S().anamneses[p.id] || {}, anos = idadeEmAnos(a.nascimento);
    const ups = atualizacoes().filter(u => u.paciente === p.id).sort((x, y) => y.criadoEm.localeCompare(x.criadoEm));
    const naoLidas = ups.filter(u => !u.lidoEm).length;
    const qPend = ac.compartilhar.questionario !== false && !questionarios()[p.id]?.enviadoEm;
    const abas = [['novidades', 'Novidades', 'bell', naoLidas], ['metas', 'Metas da semana', 'check'], ['plano', 'Plano', 'plate'], ['escada', 'Escada do comer', 'spark'], ['diario', 'Diário com foto', 'book'], ['questionario', 'Pré-consulta', 'clipboard', qPend ? '!' : 0], ['consultas', 'Consultas', 'calendar']]
      .filter(([id]) => id === 'novidades' || (id === 'metas' ? metas()[p.id]?.itens?.length : ac.compartilhar[id] !== false));
    if (!abas.some(x => x[0] === aba)) aba = 'novidades';
    const corpo = { novidades: () => novidades(p, ups), metas: () => metasFam(p), questionario: () => questionarioFam(p), plano: () => planoFam(p), escada: () => escadaFam(p), diario: () => diarioFam(p), consultas: () => consultasFam(p) }[aba]();
    return `<div class="fam"><header class="fam-topo"><div class="fam-crianca"><span class="avatar ${esc(p.color)}">${esc(p.initials)}</span><div><small>Olá, ${esc(ac.nome || p.guardian)}!</small><strong>${esc(p.name)}</strong><span>${anos != null ? esc(idadeTexto(anos)) : esc(p.age)} · acompanhado por ${esc(perfil().nome || S().professional)}</span></div></div><button class="button small" data-action="fam-sair">${icon('close')}Sair</button></header>
<nav class="fam-abas" aria-label="Área da família">${abas.map(([id, l, ic, n]) => `<button data-fam-aba="${id}" class="${aba === id ? 'on' : ''}" ${aba === id ? 'aria-current="page"' : ''}>${icon(ic)}<span>${l}</span>${n ? `<b>${n}</b>` : ''}</button>`).join('')}</nav>
<main class="fam-main" id="main" tabindex="-1">${corpo}</main><footer class="fam-rodape">${icon('heart')}Cada criança tem seu tempo. Cada descoberta tem seu valor.</footer></div>`;
  }

  function novidades(p, ups) {
    const prox = S().appointments.filter(a => a.patient === p.id && a.date >= new Date().toLocaleDateString('sv-SE')).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
    return `${prox ? `<div class="fam-destaque">${icon('calendar')}<div><small>Próximo encontro</small><b>${dataBR(prox.date)} às ${esc(prox.time)}</b><span>${esc(prox.type)}</span></div></div>` : ''}
<h2 class="fam-h2">Novidades da nutricionista</h2>${ups.length ? ups.map(u => `<article class="fam-nov ${u.lidoEm ? '' : 'nova'}"><div class="fam-nov-ic">${(tiposNovidade[u.tipo] || tiposNovidade.recado).icone}</div><div><small>${new Date(u.criadoEm).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}${u.lidoEm ? '' : ' · <b>nova</b>'}</small><h3>${esc(u.titulo)}</h3>${u.texto ? `<p>${esc(u.texto).replace(/\n/g, '<br>')}</p>` : ''}<div class="acoes">${u.doc ? `<button class="button small primary" data-fam-doc="${esc(u.doc)}" data-fam-lida="${esc(u.id)}">${icon('book')}Ver documento</button>` : ''}${!u.lidoEm ? `<button class="button small" data-fam-lida="${esc(u.id)}">${icon('check')}Marcar como lida</button>` : `<small>Lida em ${new Date(u.lidoEm).toLocaleDateString('pt-BR')}</small>`}</div></div></article>`).join('') : '<div class="empty">Ainda não há novidades. Quando a nutricionista enviar orientações, elas aparecem aqui.</div>'}`;
  }

  function docsPublicados(p) { return S().prescricoes.filter(x => x.paciente === p.id && x.publicado).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)); }

  function planoFam(p) {
    const docs = docsPublicados(p);
    if (!docs.length) return '<div class="empty">O plano ainda não foi enviado pela nutricionista.</div>';
    const atual = docs.find(d => d.id === fpPaciente) || docs[0];
    return `<div class="fam-doc-tools">${docs.length > 1 ? `<select id="fam-doc-sel" aria-label="Documento">${docs.map(d => `<option value="${esc(d.id)}" ${d.id === atual.id ? 'selected' : ''}>${esc(d.titulo)} · ${new Date(d.criadoEm).toLocaleDateString('pt-BR')}</option>`).join('')}</select>` : `<b>${esc(atual.titulo)}</b><small>enviado em ${new Date(atual.criadoEm).toLocaleDateString('pt-BR')}</small>`}<button class="button small" data-fam-imprimir="${esc(atual.id)}">${icon('print')}Imprimir / PDF</button></div>
<div class="fam-doc"><div class="folha fam-folha">${ctx.expandirDoc(atual.html)}</div></div>`;
  }

  function escadaFam(p) {
    const pl = S().planos[p.id];
    const alvos = pl?.alvos || [];
    if (!alvos.length) return '<div class="empty">A nutricionista ainda não escolheu alimentos para a escada do comer.</div>';
    return `<p class="fam-intro">Cada degrau é uma conquista! Toque no degrau que ${esc(p.name.split(' ')[0])} alcançou hoje com cada alimento. Sem pressão: a criança decide se come e quanto come.</p>
${alvos.map(x => { const f = foods.find(y => y.id === x.food), ult = (x.familia || []).at(-1); return `<section class="fam-alvo"><h3>${icoAlimento(f)} ${esc(f?.name || x.food)}</h3><div class="vl-escada fam-escada">${escadaDoComer.map((e, i) => `<button class="${i <= (ult?.etapa ?? -1) ? 'on' : ''} ${i === x.etapa ? 'meta' : ''}" data-fam-degrau="${esc(x.food)}|${i}" title="${e}">${i + 1}<small>${e}</small></button>`).join('')}</div><p class="fam-legenda">${ult ? `Último registro: <b>${escadaDoComer[ult.etapa]}</b> em ${dataBR(ult.data)}` : 'Nenhum registro ainda.'} · Combinado com a nutricionista: <b>${escadaDoComer[x.etapa]}</b></p></section>`; }).join('')}`;
  }

  function diarioFam(p) {
    const lista = S().entries.filter(e => e.patient === p.id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 12);
    return `<form id="fam-diario-form" class="card fam-card"><h2>Registrar uma descoberta</h2><div class="field-grid"><div class="field"><label for="fd-food">Alimento</label><select id="fd-food" name="food">${foods.map(f => `<option value="${esc(f.id)}">${esc(f.name)}</option>`).join('')}</select></div><div class="field"><label for="fd-meal">Refeição</label><select id="fd-meal" name="meal">${['Café da manhã', 'Lanche da manhã', 'Almoço', 'Lanche da tarde', 'Jantar', 'Ceia'].map(m => `<option>${m}</option>`).join('')}</select></div></div>
<div class="field"><span>Como foi?</span><div class="fam-stages">${stages.map(s => `<label class="fam-stage" style="--c:${s.color};--b:${s.bg}"><input type="radio" name="stage" value="${s.id}" required><span>${icon(s.icon)}${s.label}</span></label>`).join('')}</div></div>
<div class="field"><label for="fd-note">Quer contar algo? (opcional)</label><textarea id="fd-note" name="note" maxlength="600" rows="2" placeholder="Ex.: pegou com a mão e cheirou"></textarea></div><div class="field"><label for="fd-foto">📷 Foto do prato (opcional)</label><input id="fd-foto" type="file" accept="image/*" capture="environment"><div id="fd-foto-prev">${fotoPendente ? `<img class="foto-prev" src="${fotoPendente}" alt="Foto do prato">` : ''}</div></div><button class="button primary" type="submit">${icon('check')}Salvar descoberta</button></form>
<h2 class="fam-h2">Últimos registros</h2>${lista.length ? `<div class="card">${lista.map(e => { const f = foods.find(x => x.id === e.food), st = stages.find(s => s.id === e.stage); return `<div class="entry"><span class="food-icon">${icoAlimento(f)}</span><span class="entry-info"><strong>${esc(f?.name)}</strong><p>${esc(e.meal)} · ${dataBR(e.date)}${e.autor === 'familia' ? ' · registrado pela família' : ''}</p>${e.note ? `<p>${esc(e.note)}</p>` : ''}${e.foto ? `<img class="foto-diario" src="${e.foto}" alt="Foto do prato">` : ''}${e.retorno ? `<div class="retorno">💬 <b>Nutricionista:</b> ${esc(e.retorno.texto)}</div>` : ''}</span><span class="pill" style="color:${st?.color};background:${st?.bg}">${esc(st?.label)}</span></div>`; }).join('')}</div>` : '<div class="empty">Nenhum registro ainda.</div>'}`;
  }

  function metasFam(p) {
    const m = metas()[p.id], dias = semana(), hoje = new Date().toLocaleDateString('sv-SE'), ad = adesao(p.id);
    return `<p class="fam-intro">Metas combinadas com a nutricionista para esta semana. Marque o que vocês conseguiram em cada dia — sem cobrança: o importante é tentar.</p>
<div class="metas-adesao"><b>${ad ?? 0}%</b><span>das metas cumpridas até hoje nesta semana</span></div>
<div class="card metas-grade"><table><thead><tr><th>META</th>${dias.map(d => `<th class="${d === hoje ? 'hoje' : ''}">${new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}<br>${d.slice(8)}</th>`).join('')}</tr></thead><tbody>${m.itens.map(i => `<tr><td>${esc(i.texto)}</td>${dias.map(d => { const on = (m.marcacoes?.[d] || []).includes(i.id); return `<td><button class="meta-check ${on ? 'on' : ''}" data-meta="${esc(i.id)}|${d}" ${d > hoje ? 'disabled' : ''} aria-pressed="${on}" aria-label="${esc(i.texto)} em ${dataBR(d)}">${on ? '✓' : ''}</button></td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function questionarioFam(p) {
    const q = questionarios()[p.id], r = q?.respostas || {}, a = S().anamneses[p.id] || {};
    const t = (k, l, ph = '', rows = 2) => `<div class="field"><label for="q-${k}">${l}</label><textarea id="q-${k}" name="${k}" rows="${rows}" maxlength="1500" placeholder="${esc(ph)}">${esc(r[k] || '')}</textarea></div>`;
    const ck = (k, lista) => `<div class="check-grid">${lista.map(it => { const [v, l] = Array.isArray(it) ? it : [it, it]; return `<label class="check-chip"><input type="checkbox" name="${k}" value="${esc(v)}" ${(r[k] || []).includes(v) ? 'checked' : ''}><span>${esc(l)}</span></label>`; }).join('')}</div>`;
    return `${q?.enviadoEm ? `<div class="fam-destaque">${icon('check')}<div><small>Questionário enviado</small><b>${new Date(q.enviadoEm).toLocaleDateString('pt-BR')}</b><span>Você pode atualizar as respostas e enviar de novo.</span></div></div>` : `<p class="fam-intro">Antes da consulta, conte um pouco sobre a alimentação de ${esc(p.name.split(' ')[0])}. Isso ajuda a nutricionista a aproveitar melhor o tempo do atendimento. Leva uns 10 minutos.</p>`}
<form id="fam-q-form" class="card fam-card">${t('queixa', 'Qual a principal preocupação de vocês com a alimentação?', 'Ex.: come só arroz e batata; recusa frutas', 3)}${t('objetivos', 'O que esperam do acompanhamento?')}
${t('rotina', 'Conte um dia comum: o que comeu em cada refeição ontem?', 'Café da manhã: … / Almoço: … / Lanche: … / Jantar: …', 5)}
<div class="field"><span>Quais destes alimentos ${esc(p.name.split(' ')[0])} come sem dificuldade?</span><div class="check-grid">${foods.map(f => `<label class="check-chip food"><input type="checkbox" name="repertorio" value="${esc(f.id)}" ${(r.repertorio || []).includes(f.id) ? 'checked' : ''}><span>${icoAlimento(f)}${esc(f.name)}</span></label>`).join('')}</div></div>
${t('outrosAceitos', 'Outros alimentos que aceita (marcas e preparações também)', 'Ex.: nuggets, pão de queijo, biscoito de polvilho')}${t('recusados', 'Alimentos que recusa com mais força')}
<div class="field"><span>Na hora de comer, acontece…</span>${ck('comportamento', comportamentos)}</div>
<div class="field"><span>Texturas que aceita bem</span>${ck('texturasAceitas', texturas)}</div><div class="field"><span>Texturas que recusa</span>${ck('texturasRecusadas', texturas)}</div>
${t('sensorial', 'Cores, cheiros, temperaturas ou marcas que fazem diferença')}${t('alergias', 'Alergias ou intolerâncias alimentares (com diagnóstico)')}${t('medicamentos', 'Medicamentos e suplementos em uso')}
<div class="field-grid"><div class="field"><label for="q-ev">Quantas vezes faz cocô por semana?</label><input id="q-ev" name="evacuacoes" type="number" min="0" max="40" value="${esc(r.evacuacoes || '')}"></div><div class="field"><label for="q-sono">Horas de sono por noite</label><input id="q-sono" name="sono" type="number" min="0" max="18" step="0.5" value="${esc(r.sono || '')}"></div></div>
<p class="helper">As respostas vão apenas para a nutricionista de ${esc(p.name.split(' ')[0])} e ficam no prontuário, protegidas por sigilo profissional e pela LGPD.</p>
<button class="button primary" type="submit">${icon('check')}${q?.enviadoEm ? 'Atualizar respostas' : 'Enviar para a nutricionista'}</button></form>`;
  }

  function consultasFam(p) {
    const hoje = new Date().toLocaleDateString('sv-SE');
    const lista = S().appointments.filter(a => a.patient === p.id).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const fut = lista.filter(a => a.date >= hoje), pas = lista.filter(a => a.date < hoje).reverse();
    const linha = a => `<div class="appointment"><time>${esc(a.time)}</time><div><strong>${dataBR(a.date)}</strong><p>${esc(a.type)}</p></div></div>`;
    const perf = perfil();
    return `<h2 class="fam-h2">Próximos encontros</h2><div class="card">${fut.length ? fut.map(linha).join('') : '<div class="empty">Nenhum encontro agendado.</div>'}</div>${pas.length ? `<h2 class="fam-h2">Encontros anteriores</h2><div class="card">${pas.slice(0, 6).map(linha).join('')}</div>` : ''}
<div class="fam-contato">${icon('help')}<div><b>Precisa remarcar ou tirar uma dúvida?</b><span>${[perf.telefone && 'WhatsApp/telefone: ' + perf.telefone, perf.email && 'E-mail: ' + perf.email].filter(Boolean).map(esc).join(' · ') || 'Fale com a nutricionista pelos canais de sempre.'}</span></div></div>`;
  }

  // ===== Página da nutricionista: gestão do acesso das famílias =====
  function page() {
    const lista = S().patients;
    const ups = atualizacoes().slice().sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)).slice(0, 12);
    return heading('Portal da família', 'Libere o acesso dos pais e acompanhe se receberam e leram suas orientações.', `${button('Abrir tela de login dos pais', 'fam-abrir-login', 'lock')}${button('Enviar recado', 'fam-recado', 'plus', true)}`) +
      `<section class="card" style="margin-bottom:22px"><div class="table-wrap"><table><thead><tr><th>CRIANÇA</th><th>RESPONSÁVEL / ACESSO</th><th>SITUAÇÃO</th><th>ÚLTIMO ACESSO</th><th>NÃO LIDAS</th><th>PRÉ-CONSULTA</th><th>METAS DA SEMANA</th><th>WHATSAPP</th><th></th></tr></thead><tbody>${lista.map(p => {
        const ac = acessos()[p.id], nl = atualizacoes().filter(u => u.paciente === p.id && !u.lidoEm).length;
        return `<tr><td>${esc(p.name)}</td><td style="font-weight:400"><b>${esc(ac?.nome || p.guardian)}</b><small class="grp-linha">${esc(ac?.email || 'sem acesso')}</small></td><td>${ac ? (ac.ativo ? '<span class="pill" style="color:#0a8f5a;background:#dcfbe9">Ativo</span>' : '<span class="pill" style="color:#8a7fa3;background:#eee9f6">Desativado</span>') : '<span class="pill" style="color:#b26a00;background:#fff1cc">Sem acesso</span>'}</td><td style="font-weight:400">${ac?.ultimoAcesso ? new Date(ac.ultimoAcesso).toLocaleDateString('pt-BR') : '—'}</td><td>${nl || '—'}</td><td>${(() => { const q = questionarios()[p.id]; return q?.enviadoEm ? (q.importadoEm ? '<small>importado</small>' : `<button class="button small" data-page="anamnese" data-fam-sel="${esc(p.id)}">📋 Ver respostas</button>`) : '<small>—</small>'; })()}</td><td>${adesao(p.id) != null ? `<b>${adesao(p.id)}%</b>` : '<small>—</small>'}</td><td>${!ac ? '<small>—</small>' : ac.whatsapp ? (() => { const n = pendentes(p.id).length; return `<div class="wa-cel"><small>${esc(formatarTelefone(ac.whatsapp))}</small>${n && ac.ativo ? `<button class="button small wa-botao" data-fam-avisar="${esc(p.id)}">${waIcone}Avisar (${n})</button>` : `<small class="ok-txt">${ac.ultimoAviso ? '✓ avisado ' + new Date(ac.ultimoAviso).toLocaleDateString('pt-BR') : 'em dia'}</small>`}</div>`; })() : `<button class="button small" data-fam-config="${esc(p.id)}">${icon('plus')}Cadastrar</button>`}</td><td><div class="acoes"><button class="button small ${ac ? '' : 'primary'}" data-fam-config="${esc(p.id)}">${icon(ac ? 'settings' : 'plus')}${ac ? 'Configurar' : 'Liberar acesso'}</button>${ac ? `<button class="button small" data-fam-metas="${esc(p.id)}">${icon('check')}Metas</button>` : ''}</div></td></tr>`;
      }).join('')}</tbody></table></div></section>
<section class="card"><div class="card-head"><div><h2>Últimas novidades enviadas</h2><p>Documentos e recados que as famílias recebem no portal</p></div></div>${ups.length ? ups.map(u => `<div class="supl-linha"><div><strong>${(tiposNovidade[u.tipo] || tiposNovidade.recado).icone} ${esc(u.titulo)} · ${esc(paciente(u.paciente)?.name || '')}</strong><small>Enviado em ${new Date(u.criadoEm).toLocaleString('pt-BR')} · ${u.lidoEm ? '✅ lido pela família em ' + new Date(u.lidoEm).toLocaleString('pt-BR') : '⏳ ainda não lido'}${u.avisadoEm ? ' · 📲 avisado no WhatsApp em ' + new Date(u.avisadoEm).toLocaleString('pt-BR') : ''}</small></div><div class="acoes"><button class="icon-button" data-fam-del-up="${esc(u.id)}" aria-label="Remover novidade">${icon('trash')}</button></div></div>`).join('') : '<div class="empty">Nada enviado ainda. Use "Enviar para a família" na Prescrição ou mande um recado.</div>'}</section>
<div class="note-box dica-diario">${icon('book')} As fotos e os registros que as famílias mandam pelo portal ficam no <button class="text-button" data-page="diary">Diário alimentar</button>, junto com os registros do consultório. É lá que você deixa o retorno.</div><p class="helper">Segurança: o PIN é guardado só em forma criptografada (hash) e bloqueia após ${MAX_TENTATIVAS} tentativas erradas por ${BLOQUEIO_MIN} minutos. A família vê apenas a própria criança e somente o que você enviar — nunca a anamnese, as anotações clínicas ou o financeiro.</p>`;
  }

  // Registros feitos pelas famílias no portal (exibido no Diário alimentar da nutricionista)
  function diarioFeed(pid = '') {
    const lista = S().entries.filter(e => e.autor === 'familia' && (!pid || e.patient === pid)).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 10);
    return `<section class="card"><div class="card-head"><div><h2>📸 Enviados pelas famílias</h2><p>Registros e fotos do prato feitos no portal. Seu retorno aparece para a família.</p></div></div>${lista.length ? lista.map(e => { const f = foods.find(x => x.id === e.food), st = stages.find(s => s.id === e.stage); return `<div class="diario-fam"><div>${e.foto ? `<img class="foto-diario" src="${e.foto}" alt="Foto do prato">` : `<span class="food-icon">${icoAlimento(f)}</span>`}</div><div class="diario-fam-txt"><strong>${esc(paciente(e.patient)?.name || '')} · ${esc(f?.name)}</strong><small>${esc(e.meal)} · ${dataBR(e.date)} ${esc(e.time)} · <span style="color:${st?.color}">${esc(st?.label)}</span></small>${e.note ? `<p>${esc(e.note)}</p>` : ''}<form class="retorno-form" data-entry-id="${esc(e.id)}"><input name="retorno" maxlength="400" placeholder="Escreva um retorno para a família" value="${esc(e.retorno?.texto || '')}" aria-label="Retorno para a família"><button class="button small primary" type="submit">${e.retorno ? 'Atualizar' : 'Enviar'}</button></form></div></div>`; }).join('') : '<div class="empty">As famílias ainda não registraram descobertas pelo portal.</div>'}</section>`;
  }

  function editarMetas(pid) {
    const m = metas()[pid] || { itens: [] }, p = paciente(pid);
    const sugestoes = ['Refeição à mesa, sem telas', 'Oferecer o alimento novo no pratinho separado', 'Água entre as refeições', 'Criança ajudou a preparar um alimento', 'Fruta no lanche', 'Respeitar a saciedade (sem insistir)'];
    modal(`Metas da semana · ${esc(p.name)}`, `<p>Até 6 metas simples e positivas. A família marca o que cumpriu em cada dia e você acompanha a adesão (como nos diários com metas do Practice Better e do Healthie).</p>
<form id="fam-metas-form" data-pid="${esc(pid)}">${Array.from({ length: 6 }, (_, i) => `<div class="field"><label for="mt-${i}">Meta ${i + 1}</label><input id="mt-${i}" name="m${i}" maxlength="80" value="${esc(m.itens[i]?.texto || '')}" list="metas-sug"></div>`).join('')}<datalist id="metas-sug">${sugestoes.map(x => `<option value="${esc(x)}">`).join('')}</datalist>
<div class="form-footer"><button type="button" class="button" data-action="close">Cancelar</button><button class="button primary" type="submit">Salvar metas</button></div></form>`);
  }

  function configAcesso(pid) {
    const p = paciente(pid), ac = acessos()[pid];
    const c = ac?.compartilhar || { plano: true, escada: true, diario: true, questionario: true, consultas: true };
    const ck = (k, l) => `<label class="check-chip"><input type="checkbox" name="c_${k}" ${c[k] !== false ? 'checked' : ''}><span>${l}</span></label>`;
    modal(`Acesso da família · ${esc(p.name)}`, `${pinRecemGerado?.pid === pid ? `<div class="pin-box"><small>PIN gerado (mostrado só agora)</small><b>${pinRecemGerado.pin}</b><textarea readonly rows="4" id="pin-msg">${esc(mensagemAcesso(p, acessos()[pid], pinRecemGerado.pin))}</textarea><button type="button" class="button small" data-action="fam-copiar">${icon('book')}Copiar mensagem para enviar</button></div>` : ''}
<form id="fam-acesso-form" data-pid="${esc(pid)}"><div class="field-grid"><div class="field"><label for="fa-nome">Nome do responsável</label><input id="fa-nome" name="nome" maxlength="60" required value="${esc(ac?.nome || p.guardian || '')}"></div><div class="field"><label for="fa-email">E-mail de acesso</label><input id="fa-email" name="email" type="email" maxlength="90" required value="${esc(ac?.email || '')}"></div></div>
<div class="field-grid"><div class="field"><label for="fa-wa">WhatsApp do responsável</label><input id="fa-wa" name="whatsapp" inputmode="tel" maxlength="20" placeholder="(48) 99999-0000" value="${esc(ac?.whatsapp ? formatarTelefone(ac.whatsapp) : '')}"></div><label class="check wa-consent"><input type="checkbox" name="waConsent" ${ac?.waConsentEm ? 'checked' : ''}> O responsável autorizou receber avisos do portal por WhatsApp${ac?.waConsentEm ? ` <small>(registrado em ${new Date(ac.waConsentEm).toLocaleDateString('pt-BR')})</small>` : ''}</label></div>
<div class="field"><span>O que a família pode ver</span><div class="check-grid">${ck('plano', 'Plano e prescrições enviadas')}${ck('escada', 'Escada do comer')}${ck('diario', 'Diário com foto')}${ck('questionario', 'Questionário pré-consulta')}${ck('consultas', 'Consultas')}</div></div>
${ac ? `<label class="check"><input type="checkbox" name="ativo" ${ac.ativo ? 'checked' : ''}> Acesso ativo</label>` : ''}
<div class="form-footer">${ac ? `<button type="button" class="button" data-fam-novo-pin="${esc(pid)}">${icon('lock')}Gerar novo PIN</button>` : '<span>Ao salvar, o sistema gera o PIN de 6 números.</span>'}<button class="button primary" type="submit">${ac ? 'Salvar' : 'Liberar acesso e gerar PIN'}</button></div></form>`);
  }

  function mensagemAcesso(p, ac, pin) {
    const perf = perfil();
    return `Olá, ${ac?.nome || p.guardian}! Liberei seu acesso à Área da Família do Mastigô para acompanhar o plano e as orientações de ${p.name.split(' ')[0]}.\nE-mail: ${ac?.email}\nPIN: ${pin}\nGuarde o PIN com segurança e não compartilhe. Qualquer dúvida, estou à disposição.\n${perf.nome || S().professional}${perf.crn ? ` · CRN-${perf.regiaoCrn} ${perf.crn}` : ''}`;
  }

  async function gerarPin(pid) {
    const ac = acessos()[pid]; if (!ac) return;
    const pin = novoPin(); ac.sal = uid(); ac.pinHash = await hashPin(pin, ac.sal); ac.tentativas = 0; ac.bloqueadoAte = '';
    pinRecemGerado = { pid, pin }; ctx.save(); configAcesso(pid);
  }

  function recado(pid = '') {
    modal('Enviar recado para a família', `<form id="fam-recado-form"><div class="field"><label for="fr-pac">Criança</label><select id="fr-pac" name="paciente">${S().patients.filter(p => acessos()[p.id]?.ativo).map(p => `<option value="${esc(p.id)}" ${p.id === pid ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
<div class="field"><label for="fr-tit">Assunto</label><input id="fr-tit" name="titulo" maxlength="80" required placeholder="Ex.: Ótima semana! Próximo passo com o brócolis"></div>
<div class="field"><label for="fr-txt">Mensagem</label><textarea id="fr-txt" name="texto" rows="5" maxlength="1500" required></textarea></div>
<div class="form-footer"><button type="button" class="button" data-action="close">Cancelar</button><button class="button primary" type="submit">${icon('check')}Enviar</button></div></form>`);
    if (!S().patients.some(p => acessos()[p.id]?.ativo)) { close(); toast('Libere o acesso de ao menos uma família antes de enviar recados.'); }
  }

  async function entrar(v) {
    const erro = document.getElementById('fam-erro');
    const email = normEmail(v.email), pin = String(v.pin || '').trim();
    const pid = Object.keys(acessos()).find(k => normEmail(acessos()[k].email) === email && acessos()[k].ativo);
    const falha = msg => { if (erro) erro.textContent = msg; };
    if (!pid) { falha('E-mail ou PIN incorretos.'); return; }
    const ac = acessos()[pid];
    if (ac.bloqueadoAte && new Date(ac.bloqueadoAte) > new Date()) { falha(`Muitas tentativas. Tente novamente após ${new Date(ac.bloqueadoAte).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`); return; }
    if (await hashPin(pin, ac.sal) !== ac.pinHash) {
      ac.tentativas = (ac.tentativas || 0) + 1;
      if (ac.tentativas >= MAX_TENTATIVAS) { ac.bloqueadoAte = new Date(Date.now() + BLOQUEIO_MIN * 60000).toISOString(); ac.tentativas = 0; }
      ctx.save(); falha('E-mail ou PIN incorretos.'); return;
    }
    ac.tentativas = 0; ac.ultimoAcesso = new Date().toISOString(); ctx.save();
    setSessao({ paciente: pid, email, desde: ac.ultimoAcesso }); aba = 'novidades'; ctx.render();
  }

  return {
    page,
    publicar,
    diarioFeed,
    pendentesAviso,
    oferecerAviso,
    onWhatsApp(a) { if (a.dataset.wa) registrarAviso(a.dataset.wa); },
    // Retorna o HTML da área da família quando a pessoa está no login ou logada; senão null
    tela(pagina) { const s = sessao(); if (s) return portal(s); if (pagina === 'entrar') return login(); return null; },
    onClick(el) {
      const d = el.dataset, s = sessao();
      if (d.action === 'family' || d.action === 'fam-abrir-login') { ctx.navigate('entrar'); return true; }
      if (d.action === 'fam-voltar-prof') { ctx.navigate('overview'); return true; }
      if (d.action === 'fam-sair') { setSessao(null); ctx.navigate('entrar'); toast('Você saiu da área da família.'); return true; }
      if (d.famAba) { aba = d.famAba; ctx.render(); return true; }
      if (s && d.famLida) { const u = atualizacoes().find(x => x.id === d.famLida && x.paciente === s.paciente); if (u && !u.lidoEm) { u.lidoEm = new Date().toISOString(); ctx.save(); } if (!d.famDoc) { ctx.render(); return true; } }
      if (s && d.famDoc) { fpPaciente = d.famDoc; aba = 'plano'; ctx.render(); return true; }
      if (s && d.famImprimir) { const doc = S().prescricoes.find(x => x.id === d.famImprimir && x.paciente === s.paciente && x.publicado); if (doc) ctx.imprimirDoc(doc); return true; }
      if (s && d.famDegrau) {
        const [food, i] = d.famDegrau.split('|'), x = S().planos[s.paciente]?.alvos?.find(y => y.food === food);
        if (x) { x.familia = x.familia || []; x.familia.push({ data: new Date().toLocaleDateString('sv-SE'), etapa: Number(i) }); ctx.save(); ctx.render(); toast(`Registrado: ${escadaDoComer[i]}! Que conquista!`); }
        return true;
      }
      if (d.famConfig) { pinRecemGerado = null; configAcesso(d.famConfig); return true; }
      if (d.famAvisar) { oferecerAviso(d.famAvisar); return true; }
      if (d.famMetas) { editarMetas(d.famMetas); return true; }
      if (d.famSel) { ctx.sel.id = d.famSel; ctx.navigate('anamnese'); return true; }
      if (s && d.meta) {
        const [id, dia] = d.meta.split('|'), m = metas()[s.paciente]; if (!m) return true;
        m.marcacoes = m.marcacoes || {}; const lista = m.marcacoes[dia] || (m.marcacoes[dia] = []);
        const i = lista.indexOf(id); if (i >= 0) lista.splice(i, 1); else lista.push(id);
        ctx.save(); ctx.render(); return true;
      }
      if (d.famNovoPin) { gerarPin(d.famNovoPin); return true; }
      if (d.famDelUp) { S().atualizacoes = atualizacoes().filter(u => u.id !== d.famDelUp); ctx.save(); ctx.render(); return true; }
      if (d.action === 'fam-recado') { recado(); return true; }
      if (d.action === 'fam-copiar') { const t = document.getElementById('pin-msg'); t?.select(); navigator.clipboard?.writeText(t.value).then(() => toast('Mensagem copiada.'), () => toast('Selecione o texto e copie com Ctrl+C.')); return true; }
      return false;
    },
    onInput(e) {
      if (e.id === 'wa-texto') { const a = document.getElementById('wa-link'), ac = acessos()[e.dataset.waPid]; if (a && ac?.whatsapp) a.href = linkWhatsApp(ac.whatsapp, e.value); return true; }
      return false;
    },
    onChange(e) {
      if (e.id === 'fam-doc-sel') { fpPaciente = e.value; ctx.render(); return true; }
      if (e.id === 'fd-foto' && e.files?.[0]) {
        lerImagem(e.files[0], 720, 0.72).then(img => { fotoPendente = img; const pv = document.getElementById('fd-foto-prev'); if (pv) pv.innerHTML = `<img class="foto-prev" src="${img}" alt="Foto do prato">`; }).catch(err => toast(err.message));
        return true;
      }
      return false;
    },
    onSubmit(form, v) {
      if (form.id === 'fam-login-form') { entrar(v); return true; }
      if (form.id === 'fam-diario-form') {
        const s = sessao(); if (!s) return true;
        if (!v.stage) { toast('Escolha como foi.'); return true; }
        S().entries.unshift({ id: uid(), patient: s.paciente, food: v.food, stage: v.stage, meal: v.meal, date: new Date().toLocaleDateString('sv-SE'), time: new Date().toTimeString().slice(0, 5), preparation: '', note: (v.note || '').trim(), autor: 'familia', foto: fotoPendente || '' });
        fotoPendente = null;
        // Limita fotos guardadas no navegador (demonstração): mantém as 30 mais recentes
        S().entries.filter(e => e.foto).slice(30).forEach(e => { e.foto = ''; });
        ctx.save(); ctx.render(); toast('Descoberta salva. Cada passo conta!'); return true;
      }
      if (form.id === 'fam-q-form') {
        const s = sessao(); if (!s) return true;
        const fd = new FormData(form), r = {};
        for (const [k, val] of fd.entries()) if (!['repertorio', 'comportamento', 'texturasAceitas', 'texturasRecusadas'].includes(k)) r[k] = String(val).trim();
        for (const k of ['repertorio', 'comportamento', 'texturasAceitas', 'texturasRecusadas']) r[k] = fd.getAll(k);
        if (r.medicamentos) { r.suplementos = r.medicamentos; }
        questionarios()[s.paciente] = { respostas: r, enviadoEm: new Date().toISOString(), importadoEm: '' };
        ctx.save(); ctx.render(); toast('Respostas enviadas para a nutricionista. Obrigado!'); return true;
      }
      if (form.classList?.contains('retorno-form')) {
        const e = S().entries.find(x => x.id === form.dataset.entryId); if (!e) return true;
        const texto = String(new FormData(form).get('retorno') || '').trim();
        const mudou = texto && texto !== e.retorno?.texto;
        e.retorno = texto ? { texto, em: new Date().toISOString() } : null;
        if (mudou && acessos()[e.patient]?.ativo) { const f = foods.find(x => x.id === e.food); publicar(e.patient, { tipo: 'retorno', titulo: `Resposta ao registro do diário${f ? ' · ' + f.name : ''}`, texto }); }
        ctx.save(); ctx.render(); toast(texto ? 'Retorno enviado para a família.' : 'Retorno removido.'); return true;
      }
      if (form.id === 'fam-metas-form') {
        const pid = form.dataset.pid, antigo = metas()[pid] || { itens: [], marcacoes: {} };
        const textos = Array.from({ length: 6 }, (_, i) => String(v['m' + i] || '').trim()).filter(Boolean);
        const itens = textos.map(t => antigo.itens.find(i => i.texto === t) || { id: uid(), texto: t });
        metas()[pid] = { itens, marcacoes: antigo.marcacoes || {} };
        if (textos.length) publicar(pid, { tipo: 'metas', titulo: 'Novas metas da semana', texto: textos.map(t => '• ' + t).join('\n') });
        ctx.save(); close(); ctx.render(); toast('Metas salvas e enviadas para a família.'); return true;
      }
      if (form.id === 'fam-acesso-form') {
        const pid = form.dataset.pid, email = normEmail(v.email);
        const dono = Object.keys(acessos()).find(k => k !== pid && normEmail(acessos()[k].email) === email);
        if (dono) { toast('Este e-mail já dá acesso a outra criança. Use um e-mail diferente.'); return true; }
        const novo = !acessos()[pid];
        const ac = acessos()[pid] || (acessos()[pid] = { criadoEm: new Date().toISOString(), ativo: true });
        const tel = String(v.whatsapp || '').trim(), wa = tel ? normalizarTelefone(tel) : '';
        if (tel && !wa) { toast('WhatsApp inválido. Use DDD + número, ex.: (48) 99999-0000.'); return true; }
        if (wa && !v.waConsent) { toast('Marque que o responsável autorizou receber avisos por WhatsApp.'); return true; }
        ac.nome = v.nome.trim(); ac.email = email;
        if (wa !== (ac.whatsapp || '')) ac.waConsentEm = wa ? new Date().toISOString() : '';
        else if (wa && !ac.waConsentEm) ac.waConsentEm = new Date().toISOString();
        ac.whatsapp = wa;
        ac.compartilhar = { plano: !!v.c_plano, escada: !!v.c_escada, diario: !!v.c_diario, questionario: !!v.c_questionario, consultas: !!v.c_consultas };
        if (!novo) ac.ativo = !!v.ativo;
        ctx.save(); ctx.render();
        if (novo) gerarPin(pid); else { close(); toast('Acesso atualizado.'); }
        return true;
      }
      if (form.id === 'fam-recado-form') {
        if (!v.paciente) return true;
        publicar(v.paciente, { tipo: 'recado', titulo: v.titulo.trim(), texto: v.texto.trim() });
        ctx.save(); close(); ctx.render(); toast('Recado enviado para a família.'); return true;
      }
      return false;
    }
  };
}
