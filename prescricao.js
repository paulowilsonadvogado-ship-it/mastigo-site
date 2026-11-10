// Prescrição dietética e de suplementos em visual law ou no template (papel timbrado) da nutricionista.
// Requisitos atendidos: identificação do profissional e do paciente, data e assinatura (Res. CFN 304/2003 e 594/2017);
// para suplementos: nome/composição, dose, posologia, via de administração e duração (Res. CFN 656/2020, alterada pela 731/2022).
import { foods, icoAlimento } from './data.js';
import { uid, num, dataBR, imprimir, lerImagem } from './util-nutri.js';
import { idadeEmAnos, idadeTexto, escadaDoComer } from './nutri-ref.js';

const emojiRef = n => /caf[eé]/i.test(n) ? '☀️' : /lanche da manh|colação/i.test(n) ? '🍎' : /almo/i.test(n) ? '🍽️' : /lanche/i.test(n) ? '🧃' : /jantar/i.test(n) ? '🌙' : /ceia/i.test(n) ? '⭐' : '🥄';
const vias = ['Oral', 'Sublingual', 'Enteral (sonda)'];

export function createPrescricao(ctx, plano) {
  const { esc, icon, heading, button, toast, modal, close } = ctx;
  const S = () => ctx.state;
  const pac = () => S().patients.find(p => p.id === ctx.sel.id) || S().patients[0];
  function rasc(id) {
    S().rascunhosPrescricao = S().rascunhosPrescricao || {};
    const r = S().rascunhosPrescricao[id] || (S().rascunhosPrescricao[id] = { modelo: 'visual', titulo: 'Meu plano alimentar', incluir: { plano: true, quantidades: true, subs: true, alvos: true, suplementos: true, orientacoes: true }, suplementos: [], recado: '', retorno: '' });
    r.incluir = { plano: true, quantidades: true, subs: true, alvos: true, suplementos: true, orientacoes: true, ...r.incluir };
    return r;
  }

  function dadosDoc(p) {
    const a = S().anamneses[p.id] || {}, pl = plano.plano(p.id), r = rasc(p.id), perf = S().perfil;
    const anos = idadeEmAnos(a.nascimento);
    const refeicoes = pl.refeicoes.filter(x => x.itens.length || x.texto?.trim()).map(x => ({
      nome: x.nome, horario: x.horario, texto: x.texto,
      itens: x.itens.map(i => { const al = plano.achar(i.food); return { nome: al?.nome || '', g: i.g, medida: i.medida, subs: (i.subs || []).map(s => ({ nome: plano.achar(s.food)?.nome || '', g: s.g })) }; })
    }));
    const alvos = pl.alvos.map(x => ({ ...x, f: foods.find(f => f.id === x.food) }));
    return { p, a, pl, r, perf, anos, refeicoes, alvos, data: new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) };
  }

  const itemTexto = (i, q) => q ? `${i.medida ? `<b>${esc(i.medida)}</b> ` : ''}${i.medida ? `(${num(i.g, 0)} g)` : `<b>${num(i.g, 0)} g</b>`} de ${esc(i.nome)}` : esc(i.nome);
  const assinatura = (perf, d) => `<div class="doc-assina"><span></span><strong>${esc(perf.nome || S().professional)}</strong><small>Nutricionista${perf.crn ? ` · CRN-${esc(perf.regiaoCrn)} ${esc(perf.crn)}` : ''}</small><small>${esc(perf.cidade ? perf.cidade + ', ' : '')}${d.data}</small></div>`;
  const listaOrient = t => `<ul class="doc-check">${t.split(/\n+/).map(s => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean).map(s => `<li>${esc(s)}</li>`).join('')}</ul>`;

  function corpoVisual(d) {
    const { p, r, perf, refeicoes, alvos, pl } = d, inc = r.incluir;
    const c1 = perf.corPrincipal || '#7b2ff7', c2 = perf.corDestaque || '#ff2e7e';
    return `<div class="vl" style="--c1:${c1};--c2:${c2}">
<header class="vl-topo"><div class="vl-marca">${perf.logo ? `<img src="${perf.logo}" alt="">` : '<img class="vl-mastigo" src="./mastigo-icone.svg" alt="">'}<div><small>${esc(perf.nome || S().professional)}${perf.crn ? ` · CRN-${esc(perf.regiaoCrn)} ${esc(perf.crn)}` : ''}</small></div></div>
<div class="vl-titulo"><h1>${esc(r.titulo || 'Meu plano alimentar')}</h1><p>de <b>${esc(p.name)}</b>${d.anos != null ? ` · ${esc(idadeTexto(d.anos))}` : ''}</p></div></header>
${r.recado ? `<div class="vl-recado">💬 ${esc(r.recado)}</div>` : ''}
${inc.plano && refeicoes.length ? `<h2 class="vl-h2">🗓️ Minhas refeições do dia</h2><div class="vl-refeicoes">${refeicoes.map((x, i) => `<section class="vl-ref" style="--k:${i}"><div class="vl-hora"><span>${emojiRef(x.nome)}</span><b>${esc(x.horario)}</b></div><div class="vl-ref-corpo"><h3>${esc(x.nome)}</h3>${x.itens.length ? `<ul>${x.itens.map(i => `<li>${itemTexto(i, inc.quantidades)}${inc.subs && i.subs.length ? `<div class="vl-troca">🔄 Pode trocar por: ${i.subs.map(s => `<span>${inc.quantidades ? num(s.g, 0) + ' g de ' : ''}${esc(s.nome)}</span>`).join('')}</div>` : ''}</li>`).join('')}</ul>` : ''}${x.texto ? `<p class="vl-dica">💡 ${esc(x.texto)}</p>` : ''}</div></section>`).join('')}</div>` : ''}
${inc.alvos && alvos.length ? `<h2 class="vl-h2">🪜 Escada do comer: alimentos que vamos conhecer</h2><p class="vl-sub">Cada degrau é uma conquista. Comemore todos, não só o último. Sem pressão: a criança decide se come e quanto come.</p><div class="vl-alvos">${alvos.map(x => `<div class="vl-alvo"><b>${icoAlimento(x.f)} ${esc(x.f?.name || x.food)}</b><div class="vl-escada">${escadaDoComer.map((e, i) => `<span class="${i <= x.etapa ? 'on' : ''} ${i === x.etapa ? 'agora' : ''}">${i + 1}<small>${e}</small></span>`).join('')}</div></div>`).join('')}</div>` : ''}
${inc.suplementos && r.suplementos.length ? `<h2 class="vl-h2">💊 Suplementos</h2><div class="vl-supl">${r.suplementos.map(s => `<div class="vl-cap"><h3>${esc(s.nome)}</h3><p><b>Dose:</b> ${esc(s.dose)}</p><p><b>Como usar:</b> ${esc(s.posologia)}${s.horario ? ` · ⏰ ${esc(s.horario)}` : ''}</p><p><b>Via:</b> ${esc(s.via)} · <b>Por:</b> ${esc(s.duracao)}</p>${s.obs ? `<p class="vl-dica">💡 ${esc(s.obs)}</p>` : ''}</div>`).join('')}</div>` : ''}
${inc.orientacoes && pl.orientacoes?.trim() ? `<h2 class="vl-h2">✅ Combinados da família</h2>${listaOrient(pl.orientacoes)}` : ''}
<footer class="vl-rodape">${r.retorno ? `<div class="vl-retorno">📅 Próximo encontro: <b>${dataBR(r.retorno)}</b></div>` : ''}${assinatura(perf, d)}<p class="vl-contato">${[perf.telefone, perf.email, perf.instagram].filter(Boolean).map(esc).join(' · ')}</p></footer></div>`;
  }

  function corpoTemplate(d) {
    const { p, r, perf, refeicoes, alvos, pl } = d, inc = r.incluir;
    return `<div class="tp"><h1>${esc((r.titulo || 'Plano alimentar').toUpperCase())}</h1>
<p class="tp-id"><b>Paciente:</b> ${esc(p.name)}${d.anos != null ? ` · <b>Idade:</b> ${esc(idadeTexto(d.anos))}` : ''}${p.guardian ? ` · <b>Responsável:</b> ${esc(p.guardian)}` : ''}</p>
${r.recado ? `<p>${esc(r.recado)}</p>` : ''}
${inc.plano && refeicoes.length ? refeicoes.map(x => `<h2>${esc(x.horario)} · ${esc(x.nome)}</h2>${x.itens.length ? `<ul>${x.itens.map(i => `<li>${itemTexto(i, inc.quantidades)}${inc.subs && i.subs.length ? `<br><i>Substituições: ${i.subs.map(s => `${inc.quantidades ? num(s.g, 0) + ' g de ' : ''}${esc(s.nome)}`).join('; ')}</i>` : ''}</li>`).join('')}</ul>` : ''}${x.texto ? `<p><i>${esc(x.texto)}</i></p>` : ''}`).join('') : ''}
${inc.alvos && alvos.length ? `<h2>Exposição gradual a novos alimentos</h2><ul>${alvos.map(x => `<li>${esc(x.f?.name || x.food)}: etapa atual <b>${escadaDoComer[x.etapa]}</b> (escada: ${escadaDoComer.join(' → ')})</li>`).join('')}</ul>` : ''}
${inc.suplementos && r.suplementos.length ? `<h2>Prescrição de suplementos</h2><ol>${r.suplementos.map(s => `<li><b>${esc(s.nome)}</b> — ${esc(s.dose)}. ${esc(s.posologia)}${s.horario ? ` (${esc(s.horario)})` : ''}. Via ${esc(s.via.toLowerCase())}. Uso por ${esc(s.duracao)}.${s.obs ? ` ${esc(s.obs)}` : ''}</li>`).join('')}</ol>` : ''}
${inc.orientacoes && pl.orientacoes?.trim() ? `<h2>Orientações</h2>${listaOrient(pl.orientacoes)}` : ''}
${r.retorno ? `<p><b>Retorno:</b> ${dataBR(r.retorno)}</p>` : ''}${assinatura(perf, d)}</div>`;
  }

  // Documento completo (prévia e impressão)
  function documento(d, paraImpressao = false) {
    const t = S().perfil.template;
    if (d.r.modelo === 'template') {
      if (paraImpressao) return `${t.imagem ? `<img class="tp-fundo" src="${t.imagem}" alt="">` : ''}<table class="tp-tabela"><thead><tr><td style="height:${t.margemTopo}mm"></td></tr></thead><tbody><tr><td style="padding:0 ${t.margemLateral}mm">${corpoTemplate(d)}</td></tr></tbody><tfoot><tr><td style="height:${t.margemBase}mm"></td></tr></tfoot></table>`;
      return `<div class="folha tp-folha">${t.imagem ? `<img class="tp-fundo-prev" src="${t.imagem}" alt="">` : ''}<div style="padding:${t.margemTopo}mm ${t.margemLateral}mm ${t.margemBase}mm">${corpoTemplate(d)}</div></div>`;
    }
    return paraImpressao ? corpoVisual(d) : `<div class="folha">${corpoVisual(d)}</div>`;
  }

  function page() {
    const p = pac(); ctx.sel.id = p.id;
    const d = dadosDoc(p), r = d.r, t = S().perfil.template, perf = S().perfil;
    const historico = S().prescricoes.filter(x => x.paciente === p.id).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
    const chk = (k, l) => `<label class="check-chip"><input type="checkbox" data-incluir="${k}" ${r.incluir[k] ? 'checked' : ''}><span>${l}</span></label>`;
    return heading('Prescrição', 'Gere o documento da família em visual law ou no seu papel timbrado.',
      `<select id="pr-paciente" class="select-big" aria-label="Criança">${S().patients.map(x => `<option value="${esc(x.id)}" ${x.id === p.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>${button('Salvar no prontuário', 'pr-salvar', 'check')}${button('Enviar para a família', 'pr-enviar', 'heart')}${button('Imprimir / salvar PDF', 'pr-imprimir', 'print', true)}`) +
      `<div class="pr-grid"><div class="stack">
<section class="card pr-modelo"><div class="card-head"><h2>Modelo do documento</h2></div><div class="modelo-opcoes">
<button class="modelo ${r.modelo === 'visual' ? 'on' : ''}" data-modelo="visual"><span class="mini-vl"><i></i><i></i><i></i></span><b>Visual law Mastigô</b><small>Colorido, com ícones, horários e escada do comer. Ideal para a família.</small></button>
<button class="modelo ${r.modelo === 'template' ? 'on' : ''}" data-modelo="template"><span class="mini-tp">${t.imagem ? `<img src="${t.imagem}" alt="">` : ''}</span><b>Meu template</b><small>${t.imagem ? 'Seu papel timbrado já está cadastrado.' : 'Envie seu papel timbrado antes de gerar.'}</small></button></div>
${r.modelo === 'template' ? `<div class="tpl-config"><div class="field"><label for="tp-arquivo">Papel timbrado (imagem da página A4 em PNG ou JPG)</label><input id="tp-arquivo" type="file" accept="image/png,image/jpeg,image/webp"><small>No Word: abra seu modelo em branco → Arquivo → Exportar/Salvar como PDF; depois converta a página em imagem (PNG). Use a página inteira, em pé.</small></div>
<div class="field-grid three"><div class="field"><label for="tp-topo">Margem superior (mm)</label><input id="tp-topo" type="number" min="0" max="120" value="${t.margemTopo}" data-tpl="margemTopo"></div><div class="field"><label for="tp-base">Margem inferior (mm)</label><input id="tp-base" type="number" min="0" max="120" value="${t.margemBase}" data-tpl="margemBase"></div><div class="field"><label for="tp-lat">Margens laterais (mm)</label><input id="tp-lat" type="number" min="0" max="60" value="${t.margemLateral}" data-tpl="margemLateral"></div></div>${t.imagem ? `<button class="text-button" data-action="tp-remover">${icon('trash')}Remover papel timbrado</button>` : ''}</div>` : `<div class="field-grid" style="padding:0 20px 18px"><div class="field"><label for="vl-c1">Cor principal</label><input id="vl-c1" type="color" value="${esc(perf.corPrincipal || '#7b2ff7')}" data-cor="corPrincipal"></div><div class="field"><label for="vl-c2">Cor de destaque</label><input id="vl-c2" type="color" value="${esc(perf.corDestaque || '#ff2e7e')}" data-cor="corDestaque"></div></div>`}</section>
<section class="card"><div class="card-head"><h2>Conteúdo</h2></div><div style="padding:0 20px 20px">
<div class="field"><label for="pr-titulo">Título</label><input id="pr-titulo" maxlength="60" value="${esc(r.titulo)}" data-pr="titulo"></div>
<div class="check-grid">${chk('plano', 'Refeições do plano')}${chk('quantidades', 'Quantidades (g e medidas)')}${chk('subs', 'Substituições')}${chk('alvos', 'Escada do comer')}${chk('suplementos', 'Suplementos')}${chk('orientacoes', 'Orientações gerais')}</div>
<div class="field"><label for="pr-recado">Recado para a família</label><textarea id="pr-recado" rows="2" maxlength="400" data-pr="recado" placeholder="Ex.: Vocês estão indo muito bem! Uma mudança de cada vez.">${esc(r.recado)}</textarea></div>
<div class="field"><label for="pr-retorno">Próximo encontro</label><input id="pr-retorno" type="date" value="${esc(r.retorno)}" data-pr="retorno"></div>
${!d.refeicoes.length ? `<div class="note-box">O plano alimentar desta criança ainda está vazio. ${button('Montar plano', 'pr-ir-plano', 'plate')}</div>` : ''}</div></section>
<section class="card"><div class="card-head"><div><h2>Suplementos</h2><p>Res. CFN 656/2020: nome, dose, posologia, via e duração. A justificativa fica no prontuário.</p></div>${button('Adicionar', 'pr-add-supl', 'plus')}</div>
${r.suplementos.length ? r.suplementos.map(s => `<div class="supl-linha"><div><strong>${esc(s.nome)}</strong><small>${esc(s.dose)} · ${esc(s.posologia)} · ${esc(s.via)} · ${esc(s.duracao)}</small></div><div class="acoes"><button class="icon-button" data-edit-supl="${esc(s.id)}" aria-label="Editar">${icon('pen')}</button><button class="icon-button" data-del-supl="${esc(s.id)}" aria-label="Remover">${icon('trash')}</button></div></div>`).join('') : '<div class="empty">Nenhum suplemento prescrito.</div>'}</section>
${historico.length ? `<section class="card"><div class="card-head"><h2>Documentos salvos no prontuário</h2></div>${historico.map(h => `<div class="supl-linha"><div><strong>${esc(h.titulo)}</strong><small>${new Date(h.criadoEm).toLocaleString('pt-BR')} · ${h.modelo === 'template' ? 'Template' : 'Visual law'}${h.publicado ? ' · enviado à família' : ''}</small></div><div class="acoes"><button class="button small" data-reimprimir="${esc(h.id)}">${icon('print')}Reimprimir</button></div></div>`).join('')}</section>` : ''}
</div><div class="previa-wrap"><div class="previa-label">Prévia (A4)</div><div class="previa" id="pr-previa">${documento(d)}</div></div></div>`;
  }

  // Imagens (timbrado e logotipo) não são duplicadas em cada documento salvo
  const compactar = html => { const t = S().perfil.template.imagem, l = S().perfil.logo; if (t) html = html.split(t).join('__TIMBRADO__'); if (l) html = html.split(l).join('__LOGO__'); return html; };
  const expandir = html => html.split('__TIMBRADO__').join(S().perfil.template.imagem || '').split('__LOGO__').join(S().perfil.logo || '');

  ctx.expandirDoc = html => expandir(html);
  ctx.imprimirDoc = h => imprimir(expandir(h.html), { pagina: h.pagina, titulo: h.titulo });

  function atualizarPrevia() { const el = document.getElementById('pr-previa'); if (el) el.innerHTML = documento(dadosDoc(pac())); }

  function formSupl(s = {}) {
    modal(s.id ? 'Editar suplemento' : 'Prescrever suplemento', `<form id="pr-supl-form" data-id="${esc(s.id || '')}">
<div class="field"><label for="sp-nome">Nome e composição</label><input id="sp-nome" name="nome" maxlength="120" required value="${esc(s.nome || '')}" placeholder="Ex.: Ferro quelato (bisglicinato) — solução oral"></div>
<div class="field-grid"><div class="field"><label for="sp-dose">Dose</label><input id="sp-dose" name="dose" maxlength="80" required value="${esc(s.dose || '')}" placeholder="Ex.: 15 mg de ferro elementar (10 gotas)"></div>
<div class="field"><label for="sp-pos">Posologia (frequência)</label><input id="sp-pos" name="posologia" maxlength="120" required value="${esc(s.posologia || '')}" placeholder="Ex.: 1 vez ao dia, longe de leite e derivados"></div>
<div class="field"><label for="sp-via">Via de administração</label><select id="sp-via" name="via">${vias.map(v => `<option ${v === (s.via || 'Oral') ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
<div class="field"><label for="sp-dur">Duração</label><input id="sp-dur" name="duracao" maxlength="60" required value="${esc(s.duracao || '')}" placeholder="Ex.: 90 dias"></div>
<div class="field"><label for="sp-hora">Horário sugerido</label><input id="sp-hora" name="horario" maxlength="40" value="${esc(s.horario || '')}" placeholder="Ex.: 10h, com suco de laranja"></div></div>
<div class="field"><label for="sp-obs">Orientação para a família (opcional)</label><input id="sp-obs" name="obs" maxlength="200" value="${esc(s.obs || '')}"></div>
<div class="field"><label for="sp-just">Justificativa clínica (fica só no prontuário)</label><textarea id="sp-just" name="justificativa" rows="2" maxlength="600" required>${esc(s.justificativa || '')}</textarea></div>
<div class="form-footer"><button type="button" class="button" data-action="close">Cancelar</button><button class="button primary" type="submit">Salvar</button></div></form>`);
  }

  function imprimirAtual() {
    const p = pac(), d = dadosDoc(p), t = S().perfil.template;
    if (d.r.modelo === 'template' && !t.imagem) { toast('Envie seu papel timbrado antes de gerar no modelo "Meu template".'); return; }
    if (!S().perfil.crn) toast('Dica: preencha seu CRN em "Minha clínica" para a assinatura sair completa.');
    imprimir(documento(d, true), { pagina: d.r.modelo === 'template' ? 'margin:0' : 'margin:10mm', titulo: `${d.r.titulo} - ${p.name}` });
  }

  return {
    page,
    onClick(el) {
      const dd = el.dataset;
      if (dd.modelo) { rasc(pac().id).modelo = dd.modelo; ctx.save(); ctx.render(); return true; }
      if (dd.delSupl) { const r = rasc(pac().id); r.suplementos = r.suplementos.filter(s => s.id !== dd.delSupl); ctx.save(); ctx.render(); return true; }
      if (dd.editSupl) { formSupl(rasc(pac().id).suplementos.find(s => s.id === dd.editSupl)); return true; }
      if (dd.reimprimir) { const h = S().prescricoes.find(x => x.id === dd.reimprimir); if (h) imprimir(expandir(h.html), { pagina: h.pagina, titulo: h.titulo }); return true; }
      switch (dd.action) {
        case 'pr-imprimir': imprimirAtual(); return true;
        case 'pr-add-supl': formSupl(); return true;
        case 'pr-ir-plano': ctx.navigate('plano'); return true;
        case 'tp-remover': S().perfil.template.imagem = ''; ctx.save(); ctx.render(); return true;
        case 'pr-salvar':
        case 'pr-enviar': {
          const p = pac(), d = dadosDoc(p), enviar = dd.action === 'pr-enviar';
          if (d.r.modelo === 'template' && !S().perfil.template.imagem) { toast('Envie seu papel timbrado antes.'); return true; }
          if (enviar && !S().acessos?.[p.id]?.ativo) { toast('Esta família ainda não tem acesso. Libere em "Portal da família".'); ctx.navigate('familias'); return true; }
          const doc = { id: uid(), paciente: p.id, criadoEm: new Date().toISOString(), titulo: d.r.titulo, modelo: d.r.modelo, pagina: d.r.modelo === 'template' ? 'margin:0' : 'margin:10mm', html: compactar(documento(d, true)), suplementos: JSON.parse(JSON.stringify(d.r.suplementos)), publicado: enviar };
          S().prescricoes.push(doc);
          if (enviar) ctx.publicarFamilia?.(p.id, { tipo: 'documento', titulo: d.r.titulo || 'Novo plano alimentar', texto: d.r.recado || 'Seu novo plano e as orientações já estão disponíveis.', doc: doc.id });
          ctx.save(); ctx.render(); toast(enviar ? 'Enviado! A família já vê o documento no portal.' : 'Documento salvo no prontuário da criança.'); return true;
        }
      }
      return false;
    },
    onInput(e) {
      if (e.dataset.pr) { rasc(pac().id)[e.dataset.pr] = e.value; ctx.save(); atualizarPrevia(); return true; }
      if (e.dataset.tpl) { S().perfil.template[e.dataset.tpl] = Math.max(0, Math.min(120, Number(e.value) || 0)); ctx.save(); atualizarPrevia(); return true; }
      if (e.dataset.cor) { S().perfil[e.dataset.cor] = e.value; ctx.save(); atualizarPrevia(); return true; }
      return false;
    },
    onChange(e) {
      if (e.id === 'pr-paciente') { ctx.sel.id = e.value; ctx.render(); return true; }
      if (e.dataset.incluir) { rasc(pac().id).incluir[e.dataset.incluir] = e.checked; ctx.save(); atualizarPrevia(); return true; }
      if (e.id === 'tp-arquivo' && e.files?.[0]) {
        lerImagem(e.files[0], 1654, 0.85).then(img => { S().perfil.template.imagem = img; try { ctx.save(); } catch { } ctx.render(); toast('Papel timbrado salvo. Ajuste as margens para o texto não sobrepor o cabeçalho e o rodapé.'); }).catch(err => toast(err.message));
        return true;
      }
      if (e.dataset.pr || e.dataset.tpl || e.dataset.cor) return true;
      return false;
    },
    onSubmit(form, v) {
      if (form.id === 'pr-supl-form') {
        const r = rasc(pac().id), id = form.dataset.id;
        if (!v.nome.trim() || !v.dose.trim() || !v.posologia.trim() || !v.duracao.trim() || !v.justificativa.trim()) { toast('Preencha nome, dose, posologia, duração e justificativa.'); return true; }
        const s = { nome: v.nome.trim(), dose: v.dose.trim(), posologia: v.posologia.trim(), via: v.via, duracao: v.duracao.trim(), horario: (v.horario || '').trim(), obs: (v.obs || '').trim(), justificativa: v.justificativa.trim() };
        if (id) Object.assign(r.suplementos.find(x => x.id === id), s); else r.suplementos.push({ id: uid(), ...s });
        ctx.save(); close(); ctx.render(); toast('Suplemento salvo.'); return true;
      }
      return false;
    }
  };
}
