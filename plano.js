// Plano alimentar calculado com as tabelas TACO, IBGE (POF 2008-2009) e USDA (estilo WebDiet/Dietbox/Nutrium), com lista de substituições
// por equivalência energética (método de equivalentes, como nas listas de trocas dos EUA e o
// "método de troca de alimentos" chinês) e trilha de alimentos-ponte (food chaining) para seletividade.
import { CAMPOS, baseTaco, acharNasTabelas, baseTabelas, tabelaPorId, PRIORIDADE, FILTROS, rotuloFonte, medidasDe, buscarMedidas, termoMedida, medidaTexto, qtdTexto, medidasFonte } from './tabelas.js?v=e2cde6a';
import { foods, icoAlimento } from './data.js?v=e2cde6a';
import { uid, num, dataBR } from './util-nutri.js?v=e2cde6a';
import { detectarAlergenicos } from './alergenicos.js?v=e2cde6a';
import { idadeEmAnos, idadeTexto, eerIOM, tmbSchofield, niveisAtividade, metas, amdr, rotulosNutrientes, escadaDoComer } from './nutri-ref.js?v=e2cde6a';

const norm = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export { baseTaco }; // compatibilidade: a base unificada (TACO + IBGE + USDA) fica em tabelas.js

export const refeicoesPadrao = () => [
  { id: uid(), nome: 'Café da manhã', horario: '07:30', itens: [], texto: '' },
  { id: uid(), nome: 'Lanche da manhã', horario: '09:30', itens: [], texto: '' },
  { id: uid(), nome: 'Almoço', horario: '12:00', itens: [], texto: '' },
  { id: uid(), nome: 'Lanche da tarde', horario: '15:30', itens: [], texto: '' },
  { id: uid(), nome: 'Jantar', horario: '19:00', itens: [], texto: '' }
];

// Soma nutrientes de uma lista de itens {food, g}
export function somar(itens, achar) {
  const t = Object.fromEntries(CAMPOS.map(c => [c, 0]));
  const faltando = new Set();
  for (const it of itens) {
    const a = achar(it.food); if (!a) continue;
    const f = (Number(it.g) || 0) / 100;
    for (const c of CAMPOS) {
      const v = a.n[c];
      if (v == null) { if (f > 0) faltando.add(c); continue; }
      t[c] += v * f;
    }
  }
  return { t, faltando };
}

export function createPlano(ctx) {
  const { esc, icon, heading, button, toast, modal, close } = ctx;
  const S = () => ctx.state;
  const achar = id => acharNasTabelas(id) || S().alimentosProprios.find(a => a.id === id) || null;
  // Tabela usada na busca do plano (preferência salva): todas, TACO, IBGE, USDA ou só os alimentos próprios
  const filtro = () => FILTROS.some(([id]) => id === S().tabelaBusca) ? S().tabelaBusca : 'todas';
  const todos = (f = filtro()) => [...(f === 'todas' || f === 'Próprio' ? S().alimentosProprios : []), ...(f === 'Próprio' ? [] : baseTabelas(f))];
  const tagFonte = a => a?.fonte === 'Próprio' ? ' <span class="tag">próprio</span>' : a?.fonte ? ` <span class="tag fonte" title="${esc(tabelaPorId[a.fonte]?.fonte || a.fonte)}${a.original ? ' · ' + esc(a.original) : ''}">${esc(a.fonte)}</span>` : '';
  const pac = () => S().patients.find(p => p.id === ctx.sel.id) || S().patients[0];
  const anam = id => S().anamneses[id] || (S().anamneses[id] = { evolucoes: [] });
  function plano(id) {
    const pl = S().planos[id] || (S().planos[id] = { atividade: 'pouco', vetMeta: '', dist: { cho: 55, ptn: 15, lip: 30 }, refeicoes: refeicoesPadrao(), orientacoes: '', alvos: [] });
    pl.alvos = pl.alvos || []; pl.dist = pl.dist || { cho: 55, ptn: 15, lip: 30 };
    return pl;
  }

  function necessidades(p, a, pl) {
    const anos = idadeEmAnos(a.nascimento), peso = Number(a.peso), est = Number(a.estatura), sexo = a.sexo || 'M';
    const eer = anos != null ? eerIOM({ sexo, anos, peso, estatura: est, atividade: pl.atividade }) : null;
    const tmb = anos != null ? tmbSchofield({ sexo, anos, peso }) : null;
    const meta = Number(pl.vetMeta) || eer || 0;
    const m = anos != null ? metas({ anos, sexo, peso }) : null;
    return { anos, peso, est, sexo, eer, tmb, meta, m, faixas: anos != null ? amdr(anos) : null };
  }

  const cor = pct => pct == null ? '#b9b2c9' : pct < 70 ? '#e5195e' : pct < 90 ? '#ff9800' : pct <= 130 ? '#0aa86b' : '#ff9800';

  function resumoHTML(p, a, pl) {
    const nec = necessidades(p, a, pl);
    const itens = pl.refeicoes.flatMap(r => r.itens);
    const { t, faltando } = somar(itens, achar);
    const kcal = t.kcal || 0;
    const pctMacro = k => kcal ? (t[k] * (k === 'lip' ? 9 : 4)) / kcal * 100 : 0;
    const barra = (rot, valor, alvo, un, extra = '') => {
      const pct = alvo ? valor / alvo * 100 : null;
      return `<div class="nut-row"><div class="bar-label"><span>${rot}${extra}</span><b>${num(valor, valor < 10 ? 1 : 0)} ${un}${alvo ? ` / ${num(alvo, alvo < 10 ? 1 : 0)} · <i style="color:${cor(pct)}">${num(pct, 0)}%</i>` : ''}</b></div><div class="track"><span style="width:${Math.min(100, pct ?? 0)}%;background:${cor(pct)}"></span></div></div>`;
    };
    const macro = (k, rot) => {
      const pct = pctMacro(k), faixa = nec.faixas?.[k];
      const ok = faixa ? pct >= faixa[0] && pct <= faixa[1] : true;
      const alvoG = nec.meta ? nec.meta * (pl.dist[k] / 100) / (k === 'lip' ? 9 : 4) : null;
      return `<div class="macro ${ok ? 'ok' : 'fora'}"><b>${num(t[k], 1)} g</b><span>${rot}</span><small>${num(pct, 0)}% do VET${faixa ? ` · faixa ${faixa[0]}–${faixa[1]}%` : ''}${alvoG ? ` · meta ${num(alvoG, 0)} g` : ''}</small></div>`;
    };
    const m = nec.m;
    const alertas = [];
    if (m) {
      for (const k of ['ca', 'fe', 'zn', 'vitA', 'vitC', 'fibra']) if (m[k] && t[k] < m[k] * 0.7 && itens.length) alertas.push(`${rotulosNutrientes[k][0]} abaixo de 70% da recomendação`);
      if (m.naMax && t.na > m.naMax) alertas.push(`Sódio acima do limite de redução de risco (${m.naMax} mg)`);
      if (m.ptn && t.ptn < m.ptn && itens.length) alertas.push('Proteína abaixo da RDA por kg de peso');
    }
    const comAlerg = [...new Set(itens.flatMap(i => detectarAlergenicos(achar(i.food)?.nome, a.alergenicos || []).map(x => `${achar(i.food)?.nome} (${x.id})`)))];
    if (comAlerg.length) alertas.unshift(`ALERGIA: possíveis alergênicos da criança no plano — ${comAlerg.join('; ')}`);
    if (faltando.size) alertas.push(`Alguns alimentos não têm valor na tabela de origem para: ${[...faltando].map(c => rotulosNutrientes[c]?.[0] || c).join(', ')} (o total pode estar subestimado)`);
    const fontes = [...new Set(itens.map(i => achar(i.food)?.fonte).filter(Boolean))].sort((x, y) => PRIORIDADE[x] - PRIORIDADE[y]).map(f => f === 'Próprio' ? 'alimentos próprios' : f);
    return `<div class="card-head"><div><h2>Resumo do plano</h2><p>${itens.length} alimento(s)${fontes.length ? ' · ' + esc(fontes.join(', ')) : ''}</p></div></div>
<div class="resumo-kcal"><div><b>${num(kcal, 0)}</b><span>kcal no plano</span></div><div><b>${nec.meta ? num(nec.meta, 0) : '–'}</b><span>meta (VET)</span></div><div><b class="${nec.meta && Math.abs(kcal - nec.meta) / nec.meta <= 0.1 ? 'ok' : 'alerta'}">${nec.meta ? num(kcal / nec.meta * 100, 0) + '%' : '–'}</b><span>adequação</span></div></div>
<div class="macros">${macro('cho', 'Carboidratos')}${macro('ptn', 'Proteínas')}${macro('lip', 'Lipídios')}</div>
<div class="progress-wrap">${barra('Proteínas (RDA/kg)', t.ptn, m?.ptn, 'g')}${barra('Fibra alimentar', t.fibra, m?.fibra, 'g')}${barra('Cálcio', t.ca, m?.ca, 'mg')}${barra('Ferro', t.fe, m?.fe, 'mg')}${barra('Zinco', t.zn, m?.zn, 'mg')}${barra('Vitamina A (RAE)', t.vitA, m?.vitA, 'µg')}${barra('Vitamina C', t.vitC, m?.vitC, 'mg')}${barra('Sódio', t.na, m?.naMax, 'mg', ' <small>(limite)</small>')}</div>
${alertas.length ? `<div class="alertas">${alertas.map(x => `<p>${icon('bell')}${esc(x)}</p>`).join('')}</div>` : itens.length ? `<div class="insight">${icon('check')}Sem alertas nos nutrientes monitorados.</div>` : ''}
<p class="helper" style="padding:0 23px 18px">Metas: DRIs/IOM para ${m ? esc(m.faixa.replace('M', ' (masc.)').replace('F', ' (fem.)')) + (m.faixa.includes('m') ? '' : ' anos') : 'a faixa etária'}. Adequação de 90–130% em verde.</p>`;
  }

  const alergiasDe = () => anam(pac().id).alergenicos || [];
  function linhaItem(r, it) {
    const a = achar(it.food), f = (Number(it.g) || 0) / 100;
    const alerg = detectarAlergenicos(a?.nome, alergiasDe());
    const v = c => a?.n[c] == null ? '–' : num(a.n[c] * f, c === 'kcal' ? 0 : 1);
    return `<tr data-item="${esc(it.id)}"><td><strong>${esc(a?.nome || 'Alimento removido')}</strong>${tagFonte(a)}${alerg.map(x => ` <span class="tag alerg" title="Possível presença de alergênico (RDC 26/2015). Confira o rótulo/preparação.">⚠ ${esc(x.id)}</span>`).join('')}${it.subs?.length ? `<br><small>${it.subs.length} substituição(ões)</small>` : ''}</td>
<td><input class="qtd" type="number" min="0" max="3000" step="1" value="${esc(it.g)}" data-qtd="${esc(r.id)}|${esc(it.id)}" aria-label="Quantidade em gramas"></td>
<td><div class="medida-wrap"><input class="medida" maxlength="60" value="${esc(it.medida || '')}" placeholder="Ex.: 2 col. sopa" data-medida="${esc(r.id)}|${esc(it.id)}" aria-label="Medida caseira"><button class="icon-button" data-medidas="${esc(r.id)}|${esc(it.id)}" aria-label="Escolher medida caseira do IBGE" title="Medidas caseiras do IBGE">${icon('spoon')}</button></div></td>
<td id="kc-${esc(it.id)}">${v('kcal')}</td><td id="pt-${esc(it.id)}">${v('ptn')}</td><td id="ch-${esc(it.id)}">${v('cho')}</td><td id="li-${esc(it.id)}">${v('lip')}</td>
<td><div class="acoes"><button class="icon-button" data-subs="${esc(r.id)}|${esc(it.id)}" aria-label="Substituições" title="Lista de substituições">${icon('spark')}</button><button class="icon-button" data-del-item="${esc(r.id)}|${esc(it.id)}" aria-label="Remover alimento">${icon('trash')}</button></div></td></tr>`;
  }

  function refeicaoHTML(r, i) {
    const s = somar(r.itens, achar).t;
    const cores = ['#7b2ff7', '#ff2e7e', '#ff7a00', '#00bfa6', '#1e8bff', '#d4148f', '#8a6a00'];
    return `<section class="card refeicao" style="--ref:${cores[i % cores.length]}"><div class="ref-head"><input class="ref-hora" type="time" value="${esc(r.horario)}" data-ref-hora="${esc(r.id)}" aria-label="Horário"><input class="ref-nome" value="${esc(r.nome)}" maxlength="40" data-ref-nome="${esc(r.id)}" aria-label="Nome da refeição"><span class="ref-kcal" id="sub-${esc(r.id)}">${num(s.kcal, 0)} kcal</span><button class="icon-button" data-del-ref="${esc(r.id)}" aria-label="Remover refeição">${icon('trash')}</button></div>
<div class="busca-wrap"><div class="busca-linha"><label class="search">${icon('search')}<input data-busca="${esc(r.id)}" placeholder="Buscar alimento (ex.: banana prata, arroz cozido)" aria-label="Buscar alimento"></label><select data-tabela-busca="${esc(r.id)}" aria-label="Tabela usada na busca">${FILTROS.map(([id, l]) => `<option value="${id}" ${filtro() === id ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div class="busca-res" id="res-${esc(r.id)}"></div></div>
${r.itens.length ? `<div class="table-wrap"><table class="itens"><thead><tr><th>ALIMENTO</th><th>GRAMAS</th><th>MEDIDA CASEIRA</th><th>KCAL</th><th>PTN</th><th>CHO</th><th>LIP</th><th></th></tr></thead><tbody>${r.itens.map(it => linhaItem(r, it)).join('')}</tbody><tfoot><tr><td>Subtotal</td><td></td><td></td><td id="st-kc-${esc(r.id)}">${num(s.kcal, 0)}</td><td>${num(s.ptn, 1)}</td><td>${num(s.cho, 1)}</td><td>${num(s.lip, 1)}</td><td></td></tr></tfoot></table></div>` : ''}
<div class="field" style="padding:0 20px 18px"><label>Opções e orientações desta refeição (plano qualitativo)</label><textarea rows="2" maxlength="1500" data-ref-texto="${esc(r.id)}" placeholder="Ex.: oferecer o alimento novo em um pratinho separado, junto com os alimentos já aceitos">${esc(r.texto || '')}</textarea></div></section>`;
  }

  function pontesHTML(p, a, pl) {
    const aceitos = (a.repertorio || []).map(id => foods.find(f => f.id === id)).filter(Boolean);
    const gruposAceitos = new Set(aceitos.map(f => f.group));
    const sugestoes = foods.filter(f => !(a.repertorio || []).includes(f.id) && gruposAceitos.has(f.group) && !pl.alvos.some(x => x.food === f.id)).slice(0, 14);
    const outros = foods.filter(f => !gruposAceitos.has(f.group) && !(a.repertorio || []).includes(f.id) && !pl.alvos.some(x => x.food === f.id)).slice(0, 8);
    return `<section class="card pontes"><div class="card-head"><div><h2>Alimentos-alvo e escada do comer</h2><p>Food chaining: parta do que a criança já aceita e mude uma característica por vez</p></div></div>
${aceitos.length ? `<div class="chips-linha"><small>Aceita hoje:</small>${aceitos.slice(0, 16).map(f => `<span class="mini-chip">${icoAlimento(f)}${esc(f.name)}</span>`).join('')}${aceitos.length > 16 ? `<span class="mini-chip">+${aceitos.length - 16}</span>` : ''}</div>` : `<p class="helper" style="padding:0 23px">Marque o repertório na Anamnese para receber sugestões de alimentos-ponte.</p>`}
${sugestoes.length || outros.length ? `<div class="chips-linha"><small>Próximos passos sugeridos:</small>${[...sugestoes, ...outros].map(f => `<button class="mini-chip add" data-alvo="${esc(f.id)}">${icoAlimento(f)}${esc(f.name)} ${icon('plus')}</button>`).join('')}</div>` : ''}
${pl.alvos.length ? `<div class="alvos">${pl.alvos.map(x => { const f = foods.find(y => y.id === x.food); return `<div class="alvo"><strong>${icoAlimento(f)} ${esc(f?.name || x.food)}</strong><div class="escada">${escadaDoComer.map((e, i) => `<button class="degrau ${i <= x.etapa ? 'on' : ''}" data-etapa="${esc(x.food)}|${i}" aria-pressed="${i === x.etapa}" title="${e}">${i + 1}. ${e}</button>`).join('')}</div>${(x.familia || []).length ? `<small class="fam-info">👨‍👩‍👧 Família informou: <b>${escadaDoComer[x.familia.at(-1).etapa]}</b> em ${dataBR(x.familia.at(-1).data)}</small>` : ''}<button class="icon-button" data-del-alvo="${esc(x.food)}" aria-label="Remover alvo">${icon('close')}</button></div>`; }).join('')}</div>` : '<div class="empty">Escolha alimentos-alvo acima. Eles entram na prescrição em visual law com a escada do comer.</div>'}</section>`;
  }

  function page() {
    const p = pac(); ctx.sel.id = p.id;
    const a = anam(p.id), pl = plano(p.id), nec = necessidades(p, a, pl);
    const distSoma = Number(pl.dist.cho) + Number(pl.dist.ptn) + Number(pl.dist.lip);
    return heading('Plano alimentar', 'Calculado com as tabelas TACO, IBGE e USDA, medidas caseiras do IBGE, metas pediátricas e lista de substituições.',
      `<select id="pl-paciente" class="select-big" aria-label="Criança">${S().patients.map(x => `<option value="${esc(x.id)}" ${x.id === p.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>${button('Modelos', 'pl-modelos', 'book')}${button('Alimento próprio', 'pl-alimento', 'plus')}${button('Gerar prescrição', 'pl-prescrever', 'pen', true)}`) +
      `<section class="card necessidades"><div class="card-head"><div><h2>Necessidades energéticas</h2><p>Dados da anamnese. Ajuste aqui se precisar.</p></div></div><form id="pl-nec" class="field-grid six">
<div class="field"><label for="pl-sexo">Sexo</label><select id="pl-sexo" name="sexo"><option value="">–</option><option value="F" ${a.sexo === 'F' ? 'selected' : ''}>Feminino</option><option value="M" ${a.sexo === 'M' ? 'selected' : ''}>Masculino</option></select></div>
<div class="field"><label for="pl-nasc">Nascimento</label><input id="pl-nasc" name="nascimento" type="date" value="${esc(a.nascimento || '')}"></div>
<div class="field"><label for="pl-peso">Peso (kg)</label><input id="pl-peso" name="peso" type="number" step="0.01" value="${esc(a.peso || '')}"></div>
<div class="field"><label for="pl-est">Estatura (cm)</label><input id="pl-est" name="estatura" type="number" step="0.1" value="${esc(a.estatura || '')}"></div>
<div class="field"><label for="pl-ativ">Atividade física</label><select id="pl-ativ" name="atividade">${niveisAtividade.map(n => `<option value="${n.id}" ${pl.atividade === n.id ? 'selected' : ''}>${n.label}</option>`).join('')}</select></div>
<div class="field"><label for="pl-vet">Meta de energia (kcal)</label><input id="pl-vet" name="vetMeta" type="number" min="0" max="5000" value="${esc(pl.vetMeta || '')}" placeholder="${nec.eer || ''}"></div>
<div class="field"><label for="pl-cho">Carboidratos (%)</label><input id="pl-cho" name="cho" type="number" min="0" max="100" value="${pl.dist.cho}"></div>
<div class="field"><label for="pl-ptn">Proteínas (%)</label><input id="pl-ptn" name="ptn" type="number" min="0" max="100" value="${pl.dist.ptn}"></div>
<div class="field"><label for="pl-lip">Lipídios (%)</label><input id="pl-lip" name="lip" type="number" min="0" max="100" value="${pl.dist.lip}"></div>
<div class="field" style="align-self:end"><button class="button primary" type="submit">Recalcular</button></div></form>
<div class="nec-res"><div><b>${nec.anos != null ? esc(idadeTexto(nec.anos)) : '–'}</b><span>idade</span></div><div><b>${nec.eer ? num(nec.eer, 0) + ' kcal' : '–'}</b><span>EER (IOM)</span></div><div><b>${nec.tmb ? num(nec.tmb, 0) + ' kcal' : '–'}</b><span>TMB (Schofield)</span></div><div><b>${nec.meta ? num(nec.meta, 0) + ' kcal' : '–'}</b><span>VET adotado</span></div><div><b class="${distSoma === 100 ? 'ok' : 'alerta'}">${distSoma}%</b><span>soma dos macros</span></div></div>
${nec.anos == null || !nec.peso ? '<p class="helper" style="padding:0 23px 18px">Informe sexo, nascimento, peso e estatura para calcular as necessidades.</p>' : ''}</section>` +
      `<div class="plano-grid"><div class="stack">${pl.refeicoes.map((r, i) => refeicaoHTML(r, i)).join('')}<button class="button add-ref" data-action="pl-add-ref">${icon('plus')}Adicionar refeição</button>
<section class="card"><div class="card-head"><h2>Orientações gerais do plano</h2></div><div class="field" style="padding:0 20px 20px"><textarea rows="4" maxlength="3000" data-pl-orient="1" placeholder="Ex.: oferecer água entre as refeições; evitar telas à mesa; respeitar a saciedade; não usar comida como recompensa">${esc(pl.orientacoes || '')}</textarea></div></section>
${pontesHTML(p, a, pl)}</div><aside class="card resumo-plano" id="plano-resumo">${resumoHTML(p, a, pl)}</aside></div>`;
  }

  function atualizarResumo() {
    const p = pac(), a = anam(p.id), pl = plano(p.id);
    const el = document.getElementById('plano-resumo'); if (el) el.innerHTML = resumoHTML(p, a, pl);
  }

  function resultados(termo) {
    const t = norm(termo).trim(); if (t.length < 2) return [];
    const palavras = t.split(/\s+/);
    return todos().filter(a => palavras.every(w => norm(a.nome).includes(w)))
      .sort((x, y) => (norm(y.nome).startsWith(palavras[0]) - norm(x.nome).startsWith(palavras[0])) || (PRIORIDADE[x.fonte] ?? 9) - (PRIORIDADE[y.fonte] ?? 9) || x.nome.length - y.nome.length).slice(0, 20);
  }

  function substituicoes(item) {
    const a = achar(item.food); if (!a) return [];
    const kcalItem = (a.n.kcal || 0) * (Number(item.g) || 0) / 100;
    const perfil = x => { const k = (x.n.cho || 0) * 4 + (x.n.ptn || 0) * 4 + (x.n.lip || 0) * 9 || 1; return [(x.n.cho || 0) * 4 / k, (x.n.ptn || 0) * 4 / k, (x.n.lip || 0) * 9 / k]; };
    const pa = perfil(a);
    return todos('todas').filter(x => x.id !== a.id && x.cat === a.cat && x.n.kcal > 0)
      .map(x => { const px = perfil(x); return { x, d: Math.hypot(px[0] - pa[0], px[1] - pa[1], px[2] - pa[2]), g: kcalItem ? Math.round(kcalItem / x.n.kcal * 100) : 0 }; })
      .sort((u, v) => u.d - v.d).slice(0, 18);
  }

  function abrirSubs(rid, iid) {
    const pl = plano(pac().id), r = pl.refeicoes.find(x => x.id === rid), it = r?.itens.find(x => x.id === iid); if (!it) return;
    const a = achar(it.food), lista = substituicoes(it);
    modal(`Substituições para ${esc(a?.nome || '')}`, `<p>Alimentos do mesmo grupo (${esc(a?.cat || '')}) em quantidade com a mesma energia de ${num(it.g, 0)} g (${num((a?.n.kcal || 0) * it.g / 100, 0)} kcal), ordenados pela semelhança de carboidratos, proteínas e lipídios.</p>
<form id="pl-subs-form" data-ref="${esc(rid)}" data-item="${esc(iid)}"><div class="subs-lista">${lista.map(({ x, g }) => `<label class="check-chip sub"><input type="checkbox" name="subs" value="${esc(x.id)}|${g}" ${it.subs?.some(s => s.food === x.id) ? 'checked' : ''}><span><b>${esc(x.nome)}</b><small>${g} g · ${num(x.n.ptn * g / 100, 1)} g ptn · ${num(x.n.cho * g / 100, 1)} g cho</small></span></label>`).join('') || '<div class="empty">Sem alimentos equivalentes no grupo.</div>'}</div>
<div class="form-footer"><button type="button" class="button" data-action="close">Cancelar</button><button class="button primary" type="submit">Salvar substituições</button></div></form>`);
  }

  // Medidas caseiras do IBGE: as do próprio alimento (se for do IBGE) ou as de alimentos parecidos, pela busca
  function listaMedidas(chave, termo, item) {
    const grupos = chave && !termo ? [{ nome: null, medidas: medidasDe(chave) }] : buscarMedidas(termo).map(a => ({ nome: a.nome, medidas: medidasDe(a.medidas) }));
    if (!grupos.length || !grupos.some(g => g.medidas.length)) return `<div class="empty">${termo ? 'Nenhum alimento do IBGE com esse nome. Tente outra palavra (ex.: arroz, feijão, banana).' : 'Busque o alimento acima.'}</div>`;
    return grupos.map(g => `${g.nome ? `<h3 class="med-alimento">${esc(g.nome)}</h3>` : ''}<div class="med-lista">${g.medidas.filter(m => m.nome !== 'mililitro').map(m => `<button type="button" class="check-chip med" data-med="${esc(item)}|${m.g}|${esc(m.nome)}"><b>${esc(m.nome)}</b><small>${String(m.g).replace('.', ',')} g</small></button>`).join('')}</div>`).join('');
  }
  function abrirMedidas(chave) {
    const { it } = acharItem(chave); if (!it) return;
    const a = achar(it.food), exata = a?.medidas;
    const termo = exata ? '' : termoMedida(a?.nome);
    modal(`Medida caseira · ${esc(a?.nome || '')}`, `<p>${exata ? 'Medidas referidas para este alimento' : 'Este alimento não é da tabela do IBGE: veja as medidas de alimentos parecidos e confira se valem para ele'} (${esc(medidasFonte)}). Escolha a quantidade e a medida; os gramas do item são preenchidos.</p>
<div class="med-topo"><div class="field"><label for="med-qtd">Quantidade</label><select id="med-qtd">${[0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5, 6].map(q => `<option value="${q}" ${q === 1 ? 'selected' : ''}>${qtdTexto(q)}</option>`).join('')}</select></div><label class="search">${icon('search')}<input id="med-busca" data-med-item="${esc(chave)}" data-med-chave="${esc(exata || '')}" value="${esc(termo)}" placeholder="${exata ? 'Ou busque medidas de outro alimento do IBGE' : 'Buscar alimento do IBGE (ex.: arroz, feijão)'}" aria-label="Buscar medidas de outro alimento"></label></div>
<div id="med-res">${listaMedidas(exata, termo, chave)}</div>`);
  }

  function aplicarNec(v) {
    const p = pac(), a = anam(p.id), pl = plano(p.id);
    for (const k of ['sexo', 'nascimento', 'peso', 'estatura']) a[k] = v[k];
    if (v.sexo) p.sexo = v.sexo;
    if (v.nascimento) { const anos = idadeEmAnos(v.nascimento); if (anos != null) p.age = idadeTexto(anos); }
    pl.atividade = v.atividade; pl.vetMeta = v.vetMeta;
    pl.dist = { cho: Number(v.cho) || 0, ptn: Number(v.ptn) || 0, lip: Number(v.lip) || 0 };
  }

  function modelos() {
    const ms = S().modelosPlano;
    modal('Modelos de plano alimentar', `<p>Salve o plano atual como modelo ou aplique um modelo salvo. Os alimentos e quantidades são copiados; ajuste depois para a criança.</p>
<form id="pl-modelo-form" class="field-grid"><div class="field"><label for="pm-nome">Nome do novo modelo</label><input id="pm-nome" name="nome" maxlength="60" required placeholder="Ex.: 4–6 anos, 1.400 kcal, seletividade"></div><div class="field" style="align-self:end"><button class="button primary" type="submit">Salvar plano atual como modelo</button></div></form>
${ms.length ? `<div class="table-wrap" style="margin-top:16px"><table><thead><tr><th>MODELO</th><th>CRIADO EM</th><th></th></tr></thead><tbody>${ms.map(m => `<tr><td>${esc(m.nome)}</td><td>${dataBR(m.criadoEm)}</td><td><div class="acoes"><button class="button small primary" data-aplicar-modelo="${esc(m.id)}">Aplicar</button><button class="icon-button" data-del-modelo="${esc(m.id)}" aria-label="Excluir modelo">${icon('trash')}</button></div></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Nenhum modelo salvo.</div>'}`);
  }

  // Mudanças na escada do comer viram uma novidade no portal (agrupada; o aviso por WhatsApp fica pendente)
  function avisarEscada() {
    const p = pac(), alvos = plano(p.id).alvos;
    if (!S().acessos?.[p.id]?.ativo || !alvos.length) return;
    ctx.publicarFamilia?.(p.id, { tipo: 'escada', titulo: 'Escada do comer atualizada', texto: alvos.map(x => `• ${foods.find(f => f.id === x.food)?.name || x.food}: combinado "${escadaDoComer[x.etapa]}"`).join('\n') }, { avisar: false });
  }

  function acharItem(chave) {
    const [rid, iid] = chave.split('|'), pl = plano(pac().id), r = pl.refeicoes.find(x => x.id === rid);
    return { pl, r, it: r?.itens.find(x => x.id === iid) };
  }

  return {
    page,
    plano, achar, somar: itens => somar(itens, achar), necessidades: id => { const p = S().patients.find(x => x.id === id); return necessidades(p, anam(id), plano(id)); },
    onClick(el) {
      const d = el.dataset;
      if (d.addFood) {
        const [rid, fid] = d.addFood.split('|'), pl = plano(pac().id), r = pl.refeicoes.find(x => x.id === rid);
        if (r) { r.itens.push({ id: uid(), food: fid, g: 100, medida: '', subs: [] }); ctx.save(); ctx.render(); setTimeout(() => document.querySelector(`[data-qtd="${rid}|${r.itens.at(-1).id}"]`)?.select(), 30); }
        return true;
      }
      if (d.delItem) { const { r, it } = acharItem(d.delItem); if (r && it) { r.itens = r.itens.filter(x => x !== it); ctx.save(); ctx.render(); } return true; }
      if (d.delRef) { const pl = plano(pac().id); pl.refeicoes = pl.refeicoes.filter(x => x.id !== d.delRef); ctx.save(); ctx.render(); toast('Refeição removida.'); return true; }
      if (d.subs) { const [r, i] = d.subs.split('|'); abrirSubs(r, i); return true; }
      if (d.medidas) { abrirMedidas(d.medidas); return true; }
      if (d.med) {
        const [rid, iid, g, nome] = d.med.split('|'), { it } = acharItem(rid + '|' + iid); if (!it) return true;
        const q = Number(document.getElementById('med-qtd')?.value) || 1, gramas = q * Number(g);
        it.g = gramas >= 10 ? Math.round(gramas) : Math.round(gramas * 10) / 10; it.medida = medidaTexto(q, nome).slice(0, 60);
        ctx.save(); close(); ctx.render(); toast(`${it.medida} = ${String(it.g).replace('.', ',')} g`); return true;
      }
      if (d.alvo) { plano(pac().id).alvos.push({ food: d.alvo, etapa: 0 }); avisarEscada(); ctx.save(); ctx.render(); toast('Alimento-alvo adicionado.'); return true; }
      if (d.delAlvo) { const pl = plano(pac().id); pl.alvos = pl.alvos.filter(x => x.food !== d.delAlvo); ctx.save(); ctx.render(); return true; }
      if (d.etapa) { const [f, i] = d.etapa.split('|'); const x = plano(pac().id).alvos.find(y => y.food === f); if (x) { x.etapa = Number(i); avisarEscada(); ctx.save(); ctx.render(); } return true; }
      if (d.aplicarModelo) {
        const m = S().modelosPlano.find(x => x.id === d.aplicarModelo), pl = plano(pac().id);
        if (m) { pl.refeicoes = JSON.parse(JSON.stringify(m.refeicoes)).map(r => ({ ...r, id: uid(), itens: r.itens.map(i => ({ ...i, id: uid() })) })); pl.orientacoes = m.orientacoes || pl.orientacoes; pl.dist = { ...m.dist }; ctx.save(); close(); ctx.render(); toast('Modelo aplicado.'); }
        return true;
      }
      if (d.delModelo) { S().modelosPlano = S().modelosPlano.filter(x => x.id !== d.delModelo); ctx.save(); modelos(); return true; }
      switch (d.action) {
        case 'pl-add-ref': plano(pac().id).refeicoes.push({ id: uid(), nome: 'Nova refeição', horario: '17:00', itens: [], texto: '' }); ctx.save(); ctx.render(); return true;
        case 'pl-modelos': modelos(); return true;
        case 'pl-alimento': ctx.abrirBiblioteca('proprios'); return true;
        case 'pl-prescrever': ctx.navigate('prescricao'); return true;
      }
      return false;
    },
    onInput(e) {
      if (e.dataset.busca) {
        const rid = e.dataset.busca, box = document.getElementById('res-' + rid), lista = resultados(e.value);
        const dicaLeite = /leite/.test(norm(e.value)) && filtro() === 'TACO' ? '<p class="helper" style="padding:6px 12px">Na TACO, o leite de vaca fluido não tem valores completos: use o do IBGE ou da USDA (escolha "Todas as tabelas") ou cadastre como alimento próprio pelo rótulo.</p>' : '';
        box.innerHTML = lista.length ? lista.map(a => `<button type="button" data-add-food="${esc(rid)}|${esc(a.id)}"${a.original ? ` title="${esc(a.original)}"` : ''}><span><b>${esc(a.nome)}</b><small>${esc(a.cat)} · ${esc(rotuloFonte(a))}</small></span><em>${detectarAlergenicos(a.nome, alergiasDe()).length ? '⚠ alergênico · ' : ''}${a.n.kcal == null ? 'sem dados' : num(a.n.kcal, 0) + ' kcal/100 g'}</em></button>`).join('') + dicaLeite : (e.value.trim().length >= 2 ? '<p class="helper" style="padding:10px 12px">Nenhum alimento encontrado. Cadastre um alimento próprio.</p>' : '') + dicaLeite;
        return true;
      }
      if (e.dataset.qtd) {
        const { r, it } = acharItem(e.dataset.qtd); if (!it) return true;
        it.g = Math.max(0, Math.min(3000, Number(e.value) || 0));
        const a = achar(it.food), f = it.g / 100, set = (id, c, cs) => { const x = document.getElementById(id); if (x) x.textContent = a?.n[c] == null ? '–' : num(a.n[c] * f, cs); };
        set('kc-' + it.id, 'kcal', 0); set('pt-' + it.id, 'ptn', 1); set('ch-' + it.id, 'cho', 1); set('li-' + it.id, 'lip', 1);
        const s = somar(r.itens, achar).t; const sub = document.getElementById('sub-' + r.id); if (sub) sub.textContent = num(s.kcal, 0) + ' kcal';
        const st = document.getElementById('st-kc-' + r.id); if (st) st.textContent = num(s.kcal, 0);
        atualizarResumo(); ctx.save(); return true;
      }
      if (e.id === 'med-busca') { const box = document.getElementById('med-res'); if (box) box.innerHTML = listaMedidas(e.dataset.medChave, e.value.trim(), e.dataset.medItem); return true; }
      if (e.dataset.medida) { const { it } = acharItem(e.dataset.medida); if (it) { it.medida = e.value.slice(0, 60); ctx.save(); } return true; }
      if (e.dataset.refNome) { const r = plano(pac().id).refeicoes.find(x => x.id === e.dataset.refNome); if (r) { r.nome = e.value.slice(0, 40); ctx.save(); } return true; }
      if (e.dataset.refTexto) { const r = plano(pac().id).refeicoes.find(x => x.id === e.dataset.refTexto); if (r) { r.texto = e.value.slice(0, 1500); ctx.save(); } return true; }
      if (e.dataset.plOrient) { plano(pac().id).orientacoes = e.value.slice(0, 3000); ctx.save(); return true; }
      return false;
    },
    onChange(e) {
      if (e.id === 'pl-paciente') { ctx.sel.id = e.value; ctx.render(); return true; }
      if (e.dataset.tabelaBusca) {
        S().tabelaBusca = e.value; ctx.save();
        document.querySelectorAll('[data-tabela-busca]').forEach(s => { s.value = e.value; });
        const campo = document.querySelector(`[data-busca="${CSS.escape(e.dataset.tabelaBusca)}"]`); if (campo?.value.trim()) this.onInput(campo);
        return true;
      }
      if (e.dataset.refHora) { const pl = plano(pac().id), r = pl.refeicoes.find(x => x.id === e.dataset.refHora); if (r) { r.horario = e.value; pl.refeicoes.sort((x, y) => x.horario.localeCompare(y.horario)); ctx.save(); ctx.render(); } return true; }
      if (e.dataset.qtd) { ctx.render(); return true; }
      return false;
    },
    autosalvar(form) {
      if (form.id !== 'pl-nec' || !pac()) return false;
      aplicarNec(Object.fromEntries(new FormData(form))); ctx.save(); return true;
    },
    onSubmit(form, v) {
      if (form.id === 'pl-nec') {
        aplicarNec(v);
        const pl = plano(pac().id);
        ctx.save(); ctx.render();
        toast(pl.dist.cho + pl.dist.ptn + pl.dist.lip === 100 ? 'Necessidades recalculadas.' : 'Atenção: a soma dos macronutrientes deve ser 100%.');
        return true;
      }
      if (form.id === 'pl-subs-form') {
        const { it } = acharItem(form.dataset.ref + '|' + form.dataset.item); if (!it) return true;
        it.subs = new FormData(form).getAll('subs').map(s => { const [food, g] = s.split('|'); return { food, g: Number(g) }; });
        ctx.save(); close(); ctx.render(); toast('Substituições salvas.'); return true;
      }
      if (form.id === 'pl-modelo-form') {
        const pl = plano(pac().id);
        S().modelosPlano.push({ id: uid(), nome: v.nome.trim(), criadoEm: new Date().toLocaleDateString('sv-SE'), refeicoes: JSON.parse(JSON.stringify(pl.refeicoes)), orientacoes: pl.orientacoes, dist: { ...pl.dist } });
        ctx.save(); modelos(); toast('Modelo salvo.'); return true;
      }
      return false;
    }
  };
}
