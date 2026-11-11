// Anamnese nutricional pediátrica com foco em seletividade alimentar.
// Estrutura baseada em: Res. CFN 594/2017 (prontuário), Res. CFN 304/2003 (prescrição e evolução),
// abordagem SOS (Toomey & Ross) e critérios de triagem para TARE/ARFID.
import { foods, icoAlimento } from './data.js?v=8bab5f8';
import { uid, dataBR, num, imprimir } from './util-nutri.js?v=8bab5f8';
import { idadeEmAnos, idadeTexto, imc, classificaImcIdade, classificaEstaturaIdade, sinaisProblemFeeder, triagemSeletividade } from './nutri-ref.js?v=8bab5f8';
import { avaliar, idadeEmDias, graficoCrescimento } from './crescimento.js?v=8bab5f8';
import { alergenicos } from './alergenicos.js?v=8bab5f8';

const diagnosticos = ['TEA (autismo)', 'TDAH', 'Transtorno do processamento sensorial', 'TARE/ARFID (suspeita ou diagnóstico)', 'Alergia à proteína do leite (APLV)', 'Doença do refluxo', 'Constipação intestinal', 'Prematuridade', 'Atraso do desenvolvimento', 'Disfagia / alteração oromotora', 'Anemia', 'Baixo peso', 'Excesso de peso'];
const terapias = ['Fonoaudiologia', 'Terapia ocupacional / integração sensorial', 'Psicologia', 'ABA', 'Fisioterapia', 'Psicopedagogia', 'Musicoterapia'];
export const texturas = ['Líquidos', 'Purês / pastosos', 'Amassados com pedaços', 'Macios em pedaços', 'Crocantes secos (biscoito, chips)', 'Que derretem na boca', 'Fibrosos (carne, folhas)', 'Mistos (sopa com pedaços, iogurte com fruta)', 'Molhados / com molho', 'Pegajosos'];
export const comportamentos = [
  ['telas', 'Come assistindo telas (TV, celular, tablet)'], ['distrai', 'Precisa de distração para comer'], ['longa', 'Refeição dura mais de 30 minutos'],
  ['engasgo', 'Engasgos ou ânsia frequentes'], ['vomito', 'Vômitos durante ou após refeições'], ['guarda', 'Guarda alimento na boca / demora para engolir'],
  ['pressao', 'Família insiste, negocia ou oferece recompensas'], ['beliscar', 'Belisca ao longo do dia (sem horários)'], ['leite', 'Consome grande volume de leite/mamadeira'],
  ['separado', 'Come em lugar ou horário diferente da família'], ['marca', 'Aceita só uma marca ou embalagem específica'], ['mistura', 'Não aceita alimentos misturados ou encostando no prato']
];
const bristol = ['', 'Tipo 1 — bolinhas duras', 'Tipo 2 — salsicha com caroços', 'Tipo 3 — salsicha com rachaduras', 'Tipo 4 — lisa e macia', 'Tipo 5 — pedaços macios', 'Tipo 6 — pastosa', 'Tipo 7 — líquida'];

const titTri = n => ({ alto: 'Atenção alta', medio: 'Atenção', baixo: 'Seletividade típica', vazio: 'Triagem pendente' })[n];

export function createAnamnese(ctx) {
  const { esc, icon, heading, button, toast } = ctx;
  const paciente = () => ctx.state.patients.find(p => p.id === ctx.sel.id) || ctx.state.patients[0];
  const dados = id => ctx.state.anamneses[id] || (ctx.state.anamneses[id] = { evolucoes: [] });

  const txt = (name, label, a, ph = '', rows = 2) => `<div class="field"><label for="an-${name}">${label}</label><textarea id="an-${name}" name="${name}" rows="${rows}" maxlength="2000" placeholder="${esc(ph)}">${esc(a[name] || '')}</textarea></div>`;
  const inp = (name, label, a, tipo = 'text', extra = '') => `<div class="field"><label for="an-${name}">${label}</label><input id="an-${name}" name="${name}" type="${tipo}" value="${esc(a[name] ?? '')}" ${extra}></div>`;
  const sel = (name, label, a, opcoes) => `<div class="field"><label for="an-${name}">${label}</label><select id="an-${name}" name="${name}">${opcoes.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o || 'Selecionar…']; return `<option value="${esc(v)}" ${String(a[name] ?? '') === String(v) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select></div>`;
  const checks = (name, lista, marcados = []) => `<div class="check-grid">${lista.map(item => { const [v, l] = Array.isArray(item) ? item : [item, item]; return `<label class="check-chip"><input type="checkbox" name="${name}" value="${esc(v)}" ${marcados.includes(v) ? 'checked' : ''}><span>${esc(l)}</span></label>`; }).join('')}</div>`;
  const secao = (n, cor, titulo, corpo, aberto = false) => `<details class="an-sec" style="--sec:${cor}" ${aberto ? 'open' : ''}><summary><span class="an-num">${n}</span>${titulo}${icon('chevron')}</summary><div class="an-body">${corpo}</div></details>`;

  function repertorioTotal(a) {
    const outros = (a.outrosAceitos || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
    return (a.repertorio?.length || 0) + outros.length;
  }

  function page() {
    const p = paciente(); ctx.sel.id = p.id;
    const a = dados(p.id);
    const anos = idadeEmAnos(a.nascimento);
    const valorImc = imc(Number(a.peso), Number(a.estatura));
    const tri = triagemSeletividade(a.triagem || {}, repertorioTotal(a));
    const av = avaliar({ sexo: a.sexo, nascimento: a.nascimento, data: a.dataAvaliacao || new Date().toLocaleDateString('sv-SE'), peso: a.peso, estatura: a.estatura, pc: a.pc }) || {};
    const zs = { zImc: av.zImc ?? '', zEst: av.zEst ?? '', zPeso: av.zPeso ?? '', zPc: av.zPc ?? '' };
    const q = ctx.state.questionarios?.[p.id];
    const grupos = [...new Set(foods.map(f => f.group))];
    return heading('Anamnese nutricional', 'Avaliação pediátrica com foco em seletividade alimentar. Tudo fica no prontuário da criança.',
      `<select id="an-paciente" class="select-big" aria-label="Criança">${ctx.state.patients.map(x => `<option value="${esc(x.id)}" ${x.id === p.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>${button('Imprimir prontuário', 'an-imprimir', 'print')}`) +
      `<div class="an-resumo"><div class="an-crianca"><span class="avatar ${esc(p.color)}">${esc(p.initials)}</span><div><strong>${esc(p.name)}</strong><small>${anos != null ? idadeTexto(anos) : esc(p.age)} · Responsável: ${esc(p.guardian)}</small></div></div>
<div class="an-kpi"><b>${repertorioTotal(a)}</b><small>alimentos aceitos</small></div><div class="an-kpi"><b>${valorImc ? num(valorImc) : '–'}</b><small>IMC (kg/m²)</small></div><div class="an-kpi"><b>${esc(classificaImcIdade(zs.zImc, anos ?? 5) || '–')}</b><small>IMC/idade</small></div>
<div class="triagem ${tri.nivel}" id="an-triagem"><strong>${titTri(tri.nivel)}</strong><span>${esc(tri.texto)}</span></div></div>` +
      (q && !q.importadoEm ? `<div class="q-banner">${icon('bell')}<div><b>A família respondeu o questionário pré-consulta</b><span>Enviado em ${new Date(q.enviadoEm).toLocaleString('pt-BR')}. Importe para preencher os campos vazios da anamnese (nada que você já escreveu é apagado).</span></div><button class="button small primary" data-action="an-importar-q">${icon('download')}Importar respostas</button></div>` : '') +
      `<form id="an-form" class="an-form">` +
      secao(1, '#7b2ff7', 'Identificação e queixa principal', `<div class="field-grid">${sel('sexo', 'Sexo', a, [['', 'Selecionar…'], ['F', 'Feminino'], ['M', 'Masculino']])}${inp('nascimento', 'Data de nascimento', a, 'date', `max="${new Date().toLocaleDateString('sv-SE')}"`)}${inp('escola', 'Escola / período', a)}${inp('encaminhamento', 'Encaminhado por', a)}</div>${txt('queixa', 'Queixa principal (nas palavras da família)', a, 'Ex.: só come arroz branco e batata frita; recusa frutas e carnes', 3)}${txt('objetivos', 'O que a família espera do acompanhamento', a)}`, true) +
      secao(2, '#ff2e7e', 'Gestação, nascimento e primeiros anos', `<div class="field-grid">${sel('parto', 'Tipo de parto', a, ['', 'Normal', 'Cesárea'])}${inp('ig', 'Idade gestacional (semanas)', a, 'number', 'min="22" max="44"')}${inp('pesoNasc', 'Peso ao nascer (g)', a, 'number', 'min="300" max="6000"')}${inp('compNasc', 'Comprimento ao nascer (cm)', a, 'number', 'step="0.1"')}${sel('amamentacao', 'Aleitamento materno', a, ['', 'Exclusivo até 6 meses', 'Exclusivo por menos de 6 meses', 'Misto (peito + fórmula)', 'Somente fórmula', 'Ainda amamenta'])}${inp('aleitamentoAte', 'Aleitamento até (meses)', a, 'number', 'min="0" max="60"')}${inp('introducao', 'Introdução alimentar (idade em meses)', a, 'number', 'min="0" max="36"')}${sel('metodoIntro', 'Método de introdução', a, ['', 'Tradicional (papinhas)', 'BLW', 'Participativa (mista)', 'Industrializados'])}</div>${txt('historicoIntro', 'Como foi a introdução alimentar? Quando começou a recusar?', a, 'Ex.: aceitava bem papinhas; recusou pedaços a partir de 1 ano')}${txt('internacoes', 'Internações, cirurgias, sondas ou uso prolongado de mamadeira', a)}`) +
      secao(3, '#ff7a00', 'Saúde, diagnósticos e terapias', `<p class="helper">Diagnósticos informados pela família ou por laudos (não é diagnóstico nutricional).</p>${checks('diagnosticos', diagnosticos, a.diagnosticos || [])}<h4>Alergia alimentar confirmada (RDC 26/2015) — o plano alimentar alerta automaticamente</h4>${checks('alergenicos', alergenicos.map(x => [x.id, x.nome]), a.alergenicos || [])}<div class="field-grid">${txt('alergias', 'Alergias e intolerâncias alimentares (detalhes)', a)}${txt('medicamentos', 'Medicamentos em uso (nome e dose)', a)}${txt('suplementos', 'Suplementos e fórmulas em uso', a)}${txt('exames', 'Exames recentes relevantes (data e resultado)', a, 'Ex.: ferritina, hemograma, vitamina D')}</div><h4>Terapias em andamento</h4>${checks('terapias', terapias, a.terapias || [])}`) +
      secao(4, '#00bfa6', 'Comportamento alimentar e rotina', `${checks('comportamento', comportamentos, a.comportamento || [])}<div class="field-grid">${inp('refeicoesDia', 'Refeições por dia', a, 'number', 'min="1" max="12"')}${inp('tempoRefeicao', 'Tempo médio de refeição (min)', a, 'number', 'min="1" max="180"')}${inp('quemOferece', 'Quem oferece as refeições', a)}${inp('ondeCome', 'Onde costuma comer', a, 'text', 'placeholder="Mesa, sofá, cadeirinha…"')}${inp('agua', 'Água por dia (copos de 200 ml)', a, 'number', 'min="0" max="20" step="0.5"')}${inp('leiteDia', 'Leite/mamadeira por dia (ml)', a, 'number', 'min="0" max="3000"')}</div>${txt('rotina', 'Rotina alimentar de um dia típico (recordatório 24 h)', a, 'Café da manhã: … / Lanche: … / Almoço: …', 5)}`) +
      secao(5, '#1e8bff', 'Aspectos sensoriais e repertório alimentar', `<h4>Texturas que aceita</h4>${checks('texturasAceitas', texturas, a.texturasAceitas || [])}<h4>Texturas que recusa</h4>${checks('texturasRecusadas', texturas, a.texturasRecusadas || [])}<div class="field-grid">${txt('sensorial', 'Cores, temperaturas, cheiros ou marcas que influenciam', a)}${txt('recusados', 'Alimentos que recusa com mais força', a)}</div><h4>Repertório: marque os alimentos que a criança aceita de forma consistente</h4><div class="repertorio">${grupos.map(g => `<div><strong>${esc(g)}</strong><div class="check-grid">${foods.filter(f => f.group === g).map(f => `<label class="check-chip food"><input type="checkbox" name="repertorio" value="${esc(f.id)}" ${(a.repertorio || []).includes(f.id) ? 'checked' : ''}><span>${icoAlimento(f)}${esc(f.name)}</span></label>`).join('')}</div></div>`).join('')}</div>${txt('outrosAceitos', 'Outros alimentos aceitos (inclusive marcas e preparações; separe por vírgula)', a, 'Ex.: nuggets Sadia, pão de queijo, biscoito Maizena', 3)}`) +
      secao(6, '#d4148f', 'Triagem: seletividade x dificuldade alimentar', `<p class="helper">Baseada nos critérios de Toomey (abordagem SOS). É uma triagem para orientar a investigação, não um diagnóstico.</p>${checks('triagem', sinaisProblemFeeder, Object.keys(a.triagem || {}).filter(k => a.triagem[k]))}`) +
      secao(7, '#8a6a00', 'Eliminações e sono', `<div class="field-grid">${sel('bristol', 'Formato das fezes (Escala de Bristol)', a, bristol.map((b, i) => [i ? String(i) : '', b || 'Selecionar…']))}${inp('evacuacoes', 'Evacuações por semana', a, 'number', 'min="0" max="40"')}${inp('sono', 'Horas de sono por noite', a, 'number', 'min="0" max="18" step="0.5"')}${sel('despertares', 'Despertares noturnos', a, ['', 'Não', 'Às vezes', 'Frequentes'])}</div>`) +
      secao(8, '#0a8f5a', 'Antropometria', `<div class="field-grid three">${inp('dataAvaliacao', 'Data da avaliação', { dataAvaliacao: a.dataAvaliacao || new Date().toLocaleDateString('sv-SE') }, 'date')}${inp('peso', 'Peso (kg)', a, 'number', 'step="0.01" min="0.5" max="200"')}${inp('estatura', 'Estatura (cm)', a, 'number', 'step="0.1" min="30" max="220"')}${inp('pc', 'Perímetro cefálico (cm)', a, 'number', 'step="0.1"')}${inp('cb', 'Circunferência do braço (cm)', a, 'number', 'step="0.1"')}${inp('zImc', 'Escore-z IMC/idade (OMS)', zs, 'number', 'step="0.01" readonly class="auto"')}${inp('zEst', 'Escore-z estatura/idade (OMS)', zs, 'number', 'step="0.01" readonly class="auto"')}${inp('zPeso', 'Escore-z peso/idade (OMS)', zs, 'number', 'step="0.01" readonly class="auto"')}${inp('zPc', 'Escore-z perímetro cefálico (OMS)', zs, 'number', 'step="0.01" readonly class="auto"')}</div><p class="helper">Escores-z calculados automaticamente pelas curvas da OMS (0–5 anos: padrões 2006; 5–19 anos: referência 2007; peso/idade até 10 anos; perímetro cefálico até 5 anos). Até 2 anos, medir comprimento deitado; depois, estatura em pé. IMC: <b id="an-imc">${valorImc ? num(valorImc) + ' kg/m²' : '–'}</b> · IMC/idade: <b>${esc(classificaImcIdade(zs.zImc, anos ?? 5) || '–')}</b> · Estatura/idade: <b>${esc(classificaEstaturaIdade(zs.zEst) || '–')}</b></p>`) +
      secao(9, '#5b16d0', 'Diagnóstico nutricional e conduta', `${txt('diagnosticoNutricional', 'Diagnóstico nutricional', a, 'Ex.: eutrofia (IMC/I z +0,4), seletividade alimentar com repertório restrito (14 alimentos), baixa ingestão de ferro e fibras', 3)}${txt('conduta', 'Conduta e plano terapêutico', a, 'Ex.: plano alimentar com alimentos-ponte; exposição gradual pela escada do comer; suplementação de ferro; encaminhamento à fonoaudiologia', 4)}<div class="field-grid">${inp('retorno', 'Retorno previsto', a, 'date')}${inp('frequencia', 'Frequência de acompanhamento', a, 'text', 'placeholder="Ex.: quinzenal"')}</div>`, true) +
      `<div class="form-footer sticky-save"><span>${a.atualizadoEm ? 'Última atualização: ' + new Date(a.atualizadoEm).toLocaleString('pt-BR') : 'Ainda não salva'}</span><button class="button primary" type="submit">${icon('check')}Salvar anamnese</button></div></form>` +
      `<div class="note-box dica-evolucao">${icon('chart')} Os retornos (evolução nutricional), as curvas de crescimento da OMS e as descobertas alimentares ficam juntos em <button class="text-button" data-page="progress">Evolução ${icon('arrow')}</button></div>`;
  }


  // Evolução nutricional (retornos + curvas da OMS) — exibida na página "Evolução"
  function evolucaoCard(pid) {
    const p = ctx.state.patients.find(x => x.id === pid) || paciente(); ctx.sel.id = p.id;
    const a = dados(p.id);
    return `<section class="card evolucao"><div class="card-head"><div><h2>Evolução nutricional</h2><p>Registro de cada retorno (Res. CFN 304/2003, art. 5º)</p></div></div>
<form id="an-evolucao" data-pid="${esc(p.id)}" class="field-grid four" style="padding:0 23px 18px">${inp('evData', 'Data', { evData: new Date().toLocaleDateString('sv-SE') }, 'date')}${inp('evPeso', 'Peso (kg)', {}, 'number', 'step="0.01"')}${inp('evEstatura', 'Estatura (cm)', {}, 'number', 'step="0.1"')}<div class="field" style="grid-column:1/-1"><label for="an-evTexto">Evolução (aceitação, tolerância, intercorrências, condutas)</label><textarea id="an-evTexto" name="evTexto" rows="2" maxlength="2000" required></textarea></div><div><button class="button primary" type="submit">${icon('plus')}Registrar evolução</button></div></form>
${(a.evolucoes || []).length ? `<div class="table-wrap"><table><thead><tr><th>DATA</th><th>PESO</th><th>ESTATURA</th><th>IMC</th><th>Z IMC/I</th><th>Z E/I</th><th>EVOLUÇÃO</th></tr></thead><tbody>${a.evolucoes.slice().sort((x, y) => y.data.localeCompare(x.data)).map(e => { const z = avaliar({ sexo: a.sexo, nascimento: a.nascimento, data: e.data, peso: e.peso, estatura: e.estatura }) || {}; return `<tr><td>${dataBR(e.data)}</td><td>${e.peso ? num(e.peso, 2) + ' kg' : '–'}</td><td>${e.estatura ? num(e.estatura) + ' cm' : '–'}</td><td>${num(imc(e.peso, e.estatura))}</td><td>${z.zImc ?? '–'}</td><td>${z.zEst ?? '–'}</td><td style="font-weight:400">${esc(e.texto)}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty">Nenhuma evolução registrada ainda.</div>'}${graficos(a)}</section>`;
  }

  function graficos(a) {
    if (!a.sexo || !a.nascimento) return '<p class="helper" style="padding:0 23px 20px">Informe sexo e data de nascimento para ver as curvas de crescimento da OMS.</p>';
    const medidas = [...(a.peso && a.estatura ? [{ data: a.dataAvaliacao || new Date().toLocaleDateString('sv-SE'), peso: Number(a.peso), estatura: Number(a.estatura) }] : []), ...(a.evolucoes || []).filter(e => e.peso && e.estatura)];
    const unicos = [...new Map(medidas.map(m => [m.data, m])).values()].sort((x, y) => x.data.localeCompare(y.data));
    const pts = unicos.map(m => ({ dias: idadeEmDias(a.nascimento, m.data), imc: m.peso / ((m.estatura / 100) ** 2), est: m.estatura })).filter(p => p.dias != null);
    if (!pts.length) return '';
    return `<div class="graficos-cresc"><div><h3>IMC para a idade</h3>${graficoCrescimento({ indicador: 'imc', sexo: a.sexo, titulo: 'IMC para a idade', unidade: 'kg/m²', pontos: pts.map(p => ({ dias: p.dias, valor: p.imc })) })}</div><div><h3>Estatura para a idade</h3>${graficoCrescimento({ indicador: 'est', sexo: a.sexo, titulo: 'Estatura para a idade', unidade: 'cm', pontos: pts.map(p => ({ dias: p.dias, valor: p.est })) })}</div></div>`;
  }

  function importarQuestionario() {
    const p = paciente(), a = dados(p.id), q = ctx.state.questionarios?.[p.id];
    if (!q) return;
    for (const [k, v] of Object.entries(q.respostas)) {
      if (Array.isArray(v)) { a[k] = [...new Set([...(a[k] || []), ...v])]; }
      else if (v && !String(a[k] || '').trim()) a[k] = v;
    }
    q.importadoEm = new Date().toISOString();
    ctx.save(); ctx.render(); toast('Respostas da família importadas para a anamnese. Revise e salve.');
  }

  function coletar(form) {
    const fd = new FormData(form), a = {};
    for (const [k, v] of fd.entries()) if (!['diagnosticos', 'terapias', 'comportamento', 'texturasAceitas', 'texturasRecusadas', 'repertorio', 'triagem', 'alergenicos'].includes(k)) a[k] = typeof v === 'string' ? v.trim() : v;
    for (const k of ['diagnosticos', 'terapias', 'comportamento', 'texturasAceitas', 'texturasRecusadas', 'repertorio', 'alergenicos']) a[k] = fd.getAll(k);
    a.triagem = Object.fromEntries(fd.getAll('triagem').map(k => [k, true]));
    return a;
  }

  function atualizarTriagem() {
    const form = document.getElementById('an-form'), box = document.getElementById('an-triagem');
    if (!form || !box) return;
    const a = coletar(form), t = triagemSeletividade(a.triagem, repertorioTotal(a));
    box.className = 'triagem ' + t.nivel;
    box.innerHTML = `<strong>${titTri(t.nivel)}</strong><span>${esc(t.texto)}</span>`;
    const k = document.querySelector('.an-kpi b'); if (k) k.textContent = repertorioTotal(a);
    const i = imc(Number(a.peso), Number(a.estatura)), el = document.getElementById('an-imc'); if (el) el.textContent = i ? num(i) + ' kg/m²' : '–';
    const av = avaliar({ sexo: a.sexo, nascimento: a.nascimento, data: a.dataAvaliacao, peso: a.peso, estatura: a.estatura, pc: a.pc }) || {};
    for (const k of ['zImc', 'zEst', 'zPeso', 'zPc']) { const f = document.getElementById('an-' + k); if (f) f.value = av[k] ?? ''; }
  }

  function imprimirProntuario() {
    const p = paciente(), a = dados(p.id), perf = ctx.state.perfil, anos = idadeEmAnos(a.nascimento);
    const nomeAlim = id => foods.find(f => f.id === id)?.name || id;
    const linha = (r, v) => v && (!Array.isArray(v) || v.length) ? `<tr><th>${r}</th><td>${esc(Array.isArray(v) ? v.join(', ') : v)}</td></tr>` : '';
    const comp = (a.comportamento || []).map(id => comportamentos.find(c => c[0] === id)?.[1]).filter(Boolean);
    const tri = (a.triagem ? Object.keys(a.triagem) : []).map(id => sinaisProblemFeeder.find(s => s[0] === id)?.[1]).filter(Boolean);
    const t = triagemSeletividade(a.triagem || {}, repertorioTotal(a));
    const html = `<div class="prontuario"><header>${perf.logo ? `<img src="${perf.logo}" alt="">` : ''}<div><h1>Anamnese nutricional pediátrica</h1><p>${esc(perf.nome || ctx.state.professional)} · Nutricionista${perf.crn ? ` · CRN-${esc(perf.regiaoCrn)} ${esc(perf.crn)}` : ''}</p></div></header>
<table>${linha('Paciente', p.name)}${linha('Data de nascimento', a.nascimento ? dataBR(a.nascimento) + ` (${idadeTexto(anos)})` : '')}${linha('Sexo', a.sexo === 'F' ? 'Feminino' : a.sexo === 'M' ? 'Masculino' : '')}${linha('Responsável', p.guardian)}${linha('Queixa principal', a.queixa)}${linha('Expectativas da família', a.objetivos)}
${linha('Parto / IG / peso ao nascer', [a.parto, a.ig && a.ig + ' semanas', a.pesoNasc && a.pesoNasc + ' g'].filter(Boolean).join(' · '))}${linha('Aleitamento', [a.amamentacao, a.aleitamentoAte && 'até ' + a.aleitamentoAte + ' meses'].filter(Boolean).join(' · '))}${linha('Introdução alimentar', [a.introducao && a.introducao + ' meses', a.metodoIntro].filter(Boolean).join(' · '))}${linha('Histórico da introdução', a.historicoIntro)}${linha('Internações / intercorrências', a.internacoes)}
${linha('Diagnósticos informados', a.diagnosticos)}${linha('Terapias', a.terapias)}${linha('Alergias / intolerâncias', a.alergias)}${linha('Medicamentos', a.medicamentos)}${linha('Suplementos', a.suplementos)}${linha('Exames', a.exames)}
${linha('Comportamento à mesa', comp)}${linha('Refeições/dia · duração', [a.refeicoesDia, a.tempoRefeicao && a.tempoRefeicao + ' min'].filter(Boolean).join(' · '))}${linha('Água · leite', [a.agua && a.agua + ' copos', a.leiteDia && a.leiteDia + ' ml de leite'].filter(Boolean).join(' · '))}${linha('Recordatório / rotina', a.rotina)}
${linha('Texturas aceitas', a.texturasAceitas)}${linha('Texturas recusadas', a.texturasRecusadas)}${linha('Aspectos sensoriais', a.sensorial)}${linha('Repertório (' + repertorioTotal(a) + ' alimentos)', [...(a.repertorio || []).map(nomeAlim), a.outrosAceitos].filter(Boolean).join(', '))}${linha('Recusa com mais força', a.recusados)}
${linha('Triagem (sinais presentes)', tri)}${linha('Interpretação da triagem', t.texto)}${linha('Evacuações · Bristol', [a.evacuacoes && a.evacuacoes + '/semana', bristol[Number(a.bristol)] || ''].filter(Boolean).join(' · '))}${linha('Sono', [a.sono && a.sono + ' h/noite', a.despertares && 'despertares: ' + a.despertares].filter(Boolean).join(' · '))}
${linha('Antropometria', [a.dataAvaliacao && dataBR(a.dataAvaliacao), a.peso && a.peso + ' kg', a.estatura && a.estatura + ' cm', imc(Number(a.peso), Number(a.estatura)) && 'IMC ' + num(imc(Number(a.peso), Number(a.estatura))), a.pc && 'PC ' + a.pc + ' cm', a.cb && 'CB ' + a.cb + ' cm'].filter(Boolean).join(' · '))}${linha('Escores-z (OMS)', [a.zImc !== '' && a.zImc != null && `IMC/I ${a.zImc} (${classificaImcIdade(a.zImc, anos ?? 5)})`, a.zEst !== '' && a.zEst != null && `E/I ${a.zEst} (${classificaEstaturaIdade(a.zEst)})`, a.zPeso !== '' && a.zPeso != null && `P/I ${a.zPeso}`, a.zPc !== '' && a.zPc != null && `PC/I ${a.zPc}`].filter(Boolean).join(' · '))}${linha('Alergia alimentar (RDC 26/2015)', (a.alergenicos || []).map(id => alergenicos.find(x => x.id === id)?.nome))}
${linha('Diagnóstico nutricional', a.diagnosticoNutricional)}${linha('Conduta', a.conduta)}${linha('Retorno', [a.retorno && dataBR(a.retorno), a.frequencia].filter(Boolean).join(' · '))}</table>
${(a.evolucoes || []).length ? `<h2>Evolução nutricional</h2><table>${a.evolucoes.map(e => `<tr><th>${dataBR(e.data)}</th><td>${[e.peso && e.peso + ' kg', e.estatura && e.estatura + ' cm'].filter(Boolean).join(' · ')}${e.peso || e.estatura ? ' — ' : ''}${esc(e.texto)}</td></tr>`).join('')}</table>` : ''}
<div class="assinatura"><span></span><strong>${esc(perf.nome || ctx.state.professional)}</strong><small>Nutricionista${perf.crn ? ` · CRN-${esc(perf.regiaoCrn)} ${esc(perf.crn)}` : ''} · ${new Date().toLocaleDateString('pt-BR')}</small></div>
<p class="confidencial">Documento de prontuário. Informações confidenciais protegidas pelo sigilo profissional (Código de Ética do Nutricionista) e pela LGPD.</p></div>`;
    imprimir(html, { titulo: `Anamnese - ${p.name}` });
  }

  return {
    page,
    evolucaoCard,
    onClick(el) {
      if (el.dataset.action === 'an-imprimir') { imprimirProntuario(); return true; }
      if (el.dataset.action === 'an-importar-q') { importarQuestionario(); return true; }
      return false;
    },
    onChange(e) {
      if (e.id === 'an-paciente') { ctx.sel.id = e.value; ctx.render(); return true; }
      if (e.closest?.('#an-form')) { atualizarTriagem(); return false; }
      return false;
    },
    onInput(e) { if (e.closest?.('#an-form') && ['an-peso', 'an-estatura', 'an-pc', 'an-outrosAceitos'].includes(e.id)) atualizarTriagem(); return false; },
    onSubmit(form) {
      if (form.id === 'an-form') {
        const p = paciente(), atual = dados(p.id), novo = coletar(form);
        Object.assign(atual, novo, { atualizadoEm: new Date().toISOString() });
        if (novo.nascimento) { const anos = idadeEmAnos(novo.nascimento); if (anos != null) p.age = idadeTexto(anos); p.nascimento = novo.nascimento; }
        if (novo.sexo) p.sexo = novo.sexo;
        ctx.save(); ctx.render(); toast('Anamnese salva no prontuário.'); return true;
      }
      if (form.id === 'an-evolucao') {
        const fd = Object.fromEntries(new FormData(form)), a = dados(form.dataset.pid || paciente().id);
        if (!fd.evTexto?.trim()) { toast('Descreva a evolução.'); return true; }
        a.evolucoes = a.evolucoes || [];
        a.evolucoes.push({ id: uid(), data: fd.evData, peso: Number(fd.evPeso) || null, estatura: Number(fd.evEstatura) || null, texto: fd.evTexto.trim() });
        if (Number(fd.evPeso) && Number(fd.evEstatura) && fd.evData >= (a.dataAvaliacao || '')) { a.peso = fd.evPeso; a.estatura = fd.evEstatura; a.dataAvaliacao = fd.evData; }
        ctx.save(); ctx.render(); toast('Evolução registrada.'); return true;
      }
      return false;
    }
  };
}
