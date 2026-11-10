// Trilha alimentar: do rastreio que a família preenche aos cinco próximos alimentos do planejamento,
// com o motivo de cada escolha à mostra, e a escada de conquistas da criança.
// Base clínica: food chaining (Fraker et al., 2007: mudar uma característica por vez a partir do que já é
// aceito) e abordagem SOS (Toomey & Ross: exposição sem pressão, passos antes de comer).
import { foods, icoAlimento } from './data.js';
import { uid, dataBR } from './util-nutri.js';
import { GRUPOS, CORES, SABORES, TEXTURAS, normalizar, classificar, parecenca, diferencas, ROTULO_DIM } from './trilha-dados.js';

export const LISTAS = [
  ['frequente', 'Come com frequência', 'Está no prato quase todo dia. Toque no alimento para marcar rigidez (só de um jeito) ou mudar de lista.'],
  ['asVezes', 'Come às vezes', 'Aceita, mas não sempre.'],
  ['parou', 'Comia e parou de comer', 'Diga o motivo de cada um: ele muda a estratégia.'],
  ['familiaCome', 'A família come', 'Está na mesa de casa, mas a criança não come.'],
  ['familiaQuer', 'A família gostaria que comesse', 'O que os pais mais querem ver no prato.'],
  ['nunca', 'Nunca comeu', 'Nunca provou ou nunca foi oferecido.']
];
export const MOTIVOS = [
  ['', 'Escolha o motivo', false],
  ['forcada', 'foi forçada a comer', true],
  ['passou-mal', 'passou mal, engasgou ou vomitou', true],
  ['enjoou', 'enjoou de tanto comer', false],
  ['parou-oferta', 'a família parou de oferecer', false],
  ['trocas', 'a família passou a trocar por outro', false],
  ['mudou', 'mudou a marca, a receita ou o jeito de servir', false],
  ['nao-sei', 'ninguém sabe dizer', false]
];
export const MOMENTOS = [['inicio', 'Início do acompanhamento'], ['andamento', 'Acompanhamento em andamento'], ['ampliacao', 'Ampliação do repertório']];
export const NIVEIS = [
  ['mesa', 'Ficou perto ou aceitou na mesa', '#ffc400', 1],
  ['mexeu', 'Tocou, mexeu ou ajudou a preparar', '#ff7a00', 2],
  ['provou', 'Cheirou, lambeu ou mordeu', '#ff2e7e', 3],
  ['comeu-consulta', 'Comeu na consulta', '#7b2ff7', 4],
  ['comeu-casa', 'Comeu em casa, fora da consulta', '#00a892', 5],
  ['variou', 'Aceitou outra marca, formato ou preparo', '#1e8bff', 4],
  ['outro', 'Outra conquista', '#a08bd0', 2]
];
const TIPOS = {
  flexibilizar: { nome: 'Variar o que já come', cor: '#1e8bff' },
  consolidar: { nome: 'Firmar o que já conhece', cor: '#00a892' },
  resgatar: { nome: 'Trazer de volta', cor: '#ff7a00' },
  novo: { nome: 'Próximo passo', cor: '#7b2ff7' }
};
const BASE = {
  inicio: { flexibilizar: 10, consolidar: 9, resgatar: 7, resgatarAversivo: 2, novo: 3 },
  andamento: { flexibilizar: 7, consolidar: 7, resgatar: 7, resgatarAversivo: 4, novo: 5 },
  ampliacao: { flexibilizar: 5, consolidar: 5, resgatar: 6, resgatarAversivo: 5, novo: 6 }
};

export function trilhaVazia() {
  return { listas: Object.fromEntries(LISTAS.map(([k]) => [k, []])), momento: 'inicio', trocados: [], guardados: [], conquistados: [], conquistas: [], chegada: null, criadoEm: new Date().toISOString() };
}
export const atributos = item => item?.attrs || classificar(item?.nome);
export const chave = nome => classificar(nome)?.catalogo || normalizar(nome);
const motivoDe = id => MOTIVOS.find(m => m[0] === id) || MOTIVOS[0];
const juntar = (l, ult = 'e') => l.length <= 1 ? (l[0] || '') : `${l.slice(0, -1).join(', ')} ${ult} ${l.at(-1)}`;
const minusc = s => s.charAt(0).toLowerCase() + s.slice(1);

// O que a criança aceita hoje (come com frequência + às vezes) e onde estão os vazios do repertório
export function aceitos(t) { return [...t.listas.frequente, ...t.listas.asVezes]; }
export function lacunas(t) {
  const at = aceitos(t).map(atributos).filter(Boolean).filter(a => a.grupo !== 'extras');
  const tem = k => new Set(at.map(a => a[k]));
  return {
    cores: Object.keys(CORES).filter(c => !tem('cor').has(c)),
    grupos: ['energeticos', 'reguladores', 'construtores'].filter(g => !tem('grupo').has(g)),
    sabores: Object.keys(SABORES).filter(s => !tem('sabor').has(s))
  };
}
function preenche(a, gap) {
  if (!a || a.grupo === 'extras') return [];
  const r = [];
  if (gap.grupos.includes(a.grupo)) r.push(GRUPOS[a.grupo].nome.toLowerCase());
  if (gap.cores.includes(a.cor)) r.push(`cor ${CORES[a.cor].curto}`);
  if (gap.sabores.includes(a.sabor)) r.push(`sabor ${SABORES[a.sabor].toLowerCase()}`);
  return r;
}

// Compara com o que já é aceito sempre e acha o alimento mais parecido (a "âncora" da ponte)
function ancoraPara(a, ancoras, chaveCand) {
  let melhor = null;
  for (const x of ancoras) {
    if (x.chave === chaveCand || !x.attrs) continue;
    const p = parecenca(a, x.attrs);
    if (!melhor || p > melhor.p) melhor = { ...x, p };
  }
  return melhor;
}
function descreverPonte(a, anc) {
  const dif = diferencas(a, anc.attrs), iguais = Object.keys(ROTULO_DIM).filter(k => !dif.includes(k));
  const nomeIg = { sabor: `o sabor ${SABORES[a.sabor].toLowerCase()}`, textura: 'a textura', cor: 'a cor', grupo: 'o grupo' };
  if (!dif.length) return `tem a mesma cor, o mesmo sabor e a mesma textura de ${anc.nome}`;
  if (!iguais.length) return `não se parece com nada que já come; é um passo maior`;
  return `tem ${juntar(iguais.map(k => nomeIg[k]))} de ${anc.nome} e muda só ${juntar(dif.map(k => ROTULO_DIM[k]))}`;
}

// ===== A trilha: escolhe os cinco próximos alimentos e explica cada escolha =====
export function montarTrilha(t, nomeCrianca = 'A criança', quantos = 5) {
  const N = nomeCrianca, gap = lacunas(t), base = BASE[t.momento] || BASE.inicio;
  const fora = new Set([...t.trocados, ...t.guardados, ...t.conquistados]);
  const ancoras = (t.listas.frequente.length ? t.listas.frequente : t.listas.asVezes).map(i => ({ nome: i.nome, chave: chave(i.nome), attrs: atributos(i) }));
  const listados = new Set(LISTAS.flatMap(([k]) => t.listas[k].map(i => chave(i.nome))));
  const cands = new Map();
  const add = (item, tipo, origem, extra = {}) => {
    const k = chave(item.nome);
    if (fora.has(k)) return;
    const atual = cands.get(k);
    if (atual) { atual.origens.add(origem); return; }
    cands.set(k, { chave: k, nome: item.nome, item, tipo, origens: new Set([origem]), attrs: atributos(item), ...extra });
  };
  t.listas.frequente.filter(i => i.rigidez).forEach(i => add(i, 'flexibilizar', 'frequente'));
  t.listas.asVezes.forEach(i => add(i, 'consolidar', 'asVezes'));
  t.listas.parou.forEach(i => add(i, 'resgatar', 'parou', { aversivo: motivoDe(i.motivo)[2] }));
  for (const lista of ['familiaQuer', 'familiaCome', 'nunca']) t.listas[lista].forEach(i => add(i, 'novo', lista));
  // Sugestões do catálogo: só o que ninguém listou, sem sementes (não são alvo de exposição)
  foods.filter(f => f.group !== 'Sementes' && !listados.has(f.id)).forEach(f => add({ nome: f.name }, 'novo', 'catalogo'));

  for (const c of cands.values()) {
    const anc = c.attrs ? ancoraPara(c.attrs, ancoras, c.chave) : null;
    c.ancora = anc; c.preenche = preenche(c.attrs, gap);
    const sim = anc?.p || 0;
    if (c.tipo === 'novo') {
      let s = base.novo + sim * 0.9;
      if (c.origens.has('familiaCome')) s += 2;
      if (c.origens.has('familiaQuer')) s += { inicio: 1.5, andamento: 2, ampliacao: 3 }[t.momento] || 1.5;
      if (c.origens.has('nunca')) s += 0.5;
      if (c.origens.has('catalogo') && c.origens.size === 1) s -= 1;
      if (c.preenche.length) s += { inicio: 0.5, andamento: 2, ampliacao: 3 }[t.momento] || 0.5;
      if (c.attrs?.grupo === 'extras') s -= 4;
      if (t.momento === 'inicio' && (c.attrs?.sabor === 'amargo' || c.attrs?.cor === 'verde')) s -= 1.5;
      if (!c.attrs) s -= 3;
      c.pontos = s;
    } else {
      c.pontos = (c.tipo === 'resgatar' && c.aversivo ? base.resgatarAversivo : base[c.tipo]) + sim * 0.3;
    }
  }
  // Escolha gulosa com diversidade: evita cinco alimentos do mesmo grupo ou do mesmo tipo
  const restantes = [...cands.values()], escolhidos = [];
  while (escolhidos.length < quantos && restantes.length) {
    const ajustado = c => c.pontos
      - 1.2 * Math.max(0, escolhidos.filter(e => e.attrs && c.attrs && e.attrs.grupo === c.attrs.grupo).length - 1)
      - (c.tipo === 'flexibilizar' ? 3 * escolhidos.filter(e => e.tipo === 'flexibilizar').length : 0)
      - (c.tipo === 'novo' ? (t.momento === 'ampliacao' ? 0.5 : 1.2) : 1) * Math.max(0, escolhidos.filter(e => e.tipo === c.tipo).length - 1)
      - (c.origens.has('catalogo') && c.origens.size === 1 ? 1.5 * escolhidos.filter(e => e.origens.has('catalogo') && e.origens.size === 1).length : 0);
    restantes.sort((a, b) => ajustado(b) - ajustado(a) || a.nome.localeCompare(b.nome));
    escolhidos.push(restantes.shift());
  }
  // O que cada um destrava: o candidato restante mais parecido, de preferência mudando uma coisa só
  const usados = new Set();
  for (const e of escolhidos) {
    if (e.tipo === 'flexibilizar' || !e.attrs) { e.destrava = null; continue; }
    let melhor = null;
    for (const r of restantes) {
      if (!r.attrs || r.attrs.grupo === 'extras' || r.tipo === 'flexibilizar') continue;
      const dif = diferencas(e.attrs, r.attrs), p = parecenca(e.attrs, r.attrs) + (dif.length === 1 ? 2 : 0) + r.pontos * 0.05 - (usados.has(r.chave) ? 3 : 0);
      if (dif.length && (!melhor || p > melhor.p)) melhor = { nome: r.nome, chave: r.chave, dif, p };
    }
    e.destrava = melhor;
    if (melhor) usados.add(melhor.chave);
  }
  return escolhidos.map(e => ({ ...e, texto: explicar(e, N, t.momento), etiquetas: etiquetas(e), origens: [...e.origens] }));
}

function explicar(e, N, momento) {
  const anc = e.ancora && e.ancora.p > 0 ? e.ancora : null;
  if (e.tipo === 'flexibilizar') return `Hoje ${N} aceita este alimento de um jeito só. Antes de apresentar coisa nova, vale afrouxar essa regra com pequenas variações (marca, formato, tamanho ou cor), servidas ao lado da versão de sempre. Flexibilizar o que já é aceito costuma ser o caminho mais curto para o resto do plano.`;
  if (e.tipo === 'consolidar') return `${N} já come às vezes. Como o alimento é conhecido, dá para firmar a aceitação nas próximas consultas${anc ? `, servindo junto de ${anc.nome}, que está no prato de todo dia` : ''}.`;
  if (e.tipo === 'resgatar') {
    const m = motivoDe(e.item.motivo);
    const pq = m[0] ? ` (${m[1]})` : '';
    return e.aversivo
      ? `${N} já comeu e deixou de comer${pq}. Como a saída veio de uma experiência ruim, a volta pede calma: comece só pela exposição, sem pedir que prove.${momento === 'inicio' ? ' Pode ficar para um momento mais adiante do acompanhamento.' : ''}`
      : `${N} já comeu e deixou de comer${pq}. Sem experiência ruim no caminho, a volta tende a ser rápida: ofereça na versão que era aceita${anc ? ` e junto de ${anc.nome}` : ''}.`;
  }
  const partes = [anc ? `Alimento novo para ${N}. Entra porque ${descreverPonte(e.attrs, anc)}.` : `Alimento novo para ${N}.`];
  if (e.origens.has('familiaCome')) partes.push('A família já come, então ele aparece na mesa sem preparo extra.');
  if (e.origens.has('familiaQuer')) partes.push('Também é um pedido da família.');
  if (e.preenche.length) partes.push(`Ajuda a cobrir um vazio do repertório: ${juntar(e.preenche)}.`);
  if (!e.attrs) partes.push('Classifique este alimento no rastreio para o sistema explicar melhor a escolha.');
  return partes.join(' ');
}
function etiquetas(e) {
  const r = [];
  if (e.tipo === 'flexibilizar') r.push('só aceita de um jeito');
  if (e.origens.has('asVezes')) r.push('já conhece');
  if (e.origens.has('parou')) r.push('já fez parte do cardápio');
  if (e.origens.has('familiaCome')) r.push('a família já come');
  if (e.origens.has('familiaQuer')) r.push('pedido da família');
  if (e.origens.has('nunca')) r.push('nunca provou');
  if (e.origens.has('catalogo') && e.origens.size === 1) r.push('sugestão do Mastigô');
  if (e.aversivo) r.push('cuidado: experiência ruim');
  return r;
}

// ===== Tela =====
export function createTrilha(ctx) {
  const { esc, icon, heading, button, toast } = ctx;
  const S = () => ctx.state;
  const paciente = () => S().patients.find(p => p.id === ctx.sel.id) || S().patients[0];
  const primeiroNome = p => (p?.name || 'A criança').split(' ')[0];
  const trilha = id => { S().trilhas = S().trilhas || {}; return S().trilhas[id] || (S().trilhas[id] = trilhaVazia()); };
  let itemAberto = null;

  const onde = (t, k) => LISTAS.find(([l]) => t.listas[l].some(i => chave(i.nome) === k));
  const acharItem = (t, lista, id) => t.listas[lista]?.find(i => i.id === id);
  const catalogoDe = nome => { const c = classificar(nome)?.catalogo; return c ? foods.find(f => f.id === c) : null; };
  const icone = nome => { const f = catalogoDe(nome); return f ? icoAlimento(f) : ''; };

  function registrarChegada(t) {
    if (t.chegada || !aceitos(t).length) return;
    const at = aceitos(t), cat = at.map(i => catalogoDe(i.nome));
    const frutas = cat.filter(f => f?.group === 'Frutas').length, legumes = cat.filter(f => f?.group === 'Legumes e verduras').length;
    t.chegada = { data: new Date().toLocaleDateString('sv-SE'), total: at.length, frutas, legumes,
      texto: `Chegou comendo ${at.length} ${at.length === 1 ? 'alimento' : 'alimentos'}${frutas ? `, ${frutas} ${frutas === 1 ? 'fruta' : 'frutas'}` : ', nenhuma fruta'}${legumes ? ` e ${legumes} ${legumes === 1 ? 'legume ou verdura' : 'legumes e verduras'}` : ' e nenhum legume ou verdura'}.` };
  }

  function adicionar(lista, texto) {
    const t = trilha(paciente().id), nomes = String(texto || '').split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    const repetidos = [];
    for (const n of nomes) {
      const nome = n.charAt(0).toUpperCase() + n.slice(1), k = chave(nome), ja = onde(t, k);
      if (ja) { repetidos.push(`${nome} (já está em "${ja[1]}")`); continue; }
      t.listas[lista].push({ id: uid(), nome, ...(lista === 'parou' ? { motivo: '' } : {}) });
    }
    registrarChegada(t); ctx.save(); ctx.render();
    if (repetidos.length) toast(`Não repeti: ${repetidos.join('; ')}.`);
  }

  function chip(lista, i) {
    const a = atributos(i);
    return `<span class="tr-chip ${i.rigidez ? 'rigido' : ''} ${a ? '' : 'sem-classe'}"><button type="button" data-tr-item="${lista}|${esc(i.id)}" title="Mudar de lista, marcar rigidez ou classificar">${icone(i.nome)}${esc(i.nome)}${i.rigidez ? '<em>rigidez</em>' : ''}${a ? '' : '<em>classificar</em>'}</button><button type="button" class="x" data-tr-del="${lista}|${esc(i.id)}" aria-label="Tirar ${esc(i.nome)} da lista">×</button></span>`;
  }
  function cartaoLista([k, titulo, dica], t) {
    const itens = t.listas[k];
    const corpo = k === 'parou'
      ? itens.map(i => `<div class="tr-parou">${chip(k, i)}<select data-tr-motivo="${esc(i.id)}" aria-label="Por que parou de comer ${esc(i.nome)}">${MOTIVOS.map(([v, l]) => `<option value="${v}" ${i.motivo === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`).join('')
      : `<div class="tr-chips">${itens.map(i => chip(k, i)).join('')}</div>`;
    return `<div class="tr-lista" data-lista="${k}"><h3>${titulo} <small>${itens.length}</small></h3><p>${dica}</p>${corpo}<label class="sr-only" for="tr-add-${k}">Adicionar em ${titulo}</label><textarea id="tr-add-${k}" rows="2" placeholder="Digite ou cole aqui; separe por vírgula ou linha"></textarea><button class="button small" data-tr-add="${k}">${icon('plus')}Adicionar</button></div>`;
  }

  function mapa(t) {
    const cel = {}, semClasse = [];
    const pos = (lista, i) => { const a = atributos(i); if (!a) { semClasse.push([lista, i]); return; } (cel[`${a.sabor}|${a.grupo}|${a.cor}`] ||= []).push([lista, i]); };
    ['frequente', 'asVezes', 'parou'].forEach(l => t.listas[l].forEach(i => pos(l, i)));
    const gr = Object.keys(GRUPOS), co = Object.keys(CORES);
    const nomeCel = ([l, i]) => `<span class="tr-m-${l}">${esc(i.nome)}</span>`;
    const g = lacunas(t);
    const vazios = [...g.grupos.map(x => GRUPOS[x].nome), ...g.cores.map(x => `cor ${CORES[x].curto}`), ...g.sabores.map(x => `sabor ${SABORES[x].toLowerCase()}`)];
    return `<div class="tr-mapa-rolagem"><table class="tr-mapa"><thead><tr><th rowspan="2" scope="col">Sabor</th>${gr.map(x => `<th colspan="4" scope="colgroup" class="tr-g-${x}">${GRUPOS[x].nome}<small>${GRUPOS[x].dica}</small></th>`).join('')}</tr><tr>${gr.map(() => co.map(c => `<th scope="col"><i style="background:${CORES[c].ponto}"></i>${CORES[c].nome}</th>`).join('')).join('')}</tr></thead>
<tbody>${Object.entries(SABORES).map(([s, nome]) => `<tr><th scope="row">${nome}</th>${gr.map(x => co.map(c => { const v = cel[`${s}|${x}|${c}`] || []; const soParou = v.length && v.every(([l]) => l === 'parou'); return `<td class="${v.length ? (soParou ? 'parou' : 'cheio') : ''}">${v.map(nomeCel).join('')}</td>`; }).join('')).join('')}</tr>`).join('')}</tbody></table></div>
<p class="tr-legenda"><span class="tr-m-frequente">Come com frequência</span><span class="tr-m-asVezes">Come às vezes</span><span class="tr-m-parou">Comia e parou</span></p>
${vazios.length ? `<p class="tr-vazios"><b>Sem nada no repertório:</b> ${vazios.map(v => `<span>${esc(v)}</span>`).join('')}</p>` : '<p class="tr-vazios ok">Todos os grupos, cores e sabores têm pelo menos um alimento aceito.</p>'}
${semClasse.length ? `<p class="tr-vazios"><b>Fora do mapa até classificar:</b> ${semClasse.map(([l, i]) => `<button class="tr-chip-mini" data-tr-item="${l}|${esc(i.id)}">${esc(i.nome)}</button>`).join('')}</p>` : ''}`;
  }

  function cartoesTrilha(t, p) {
    const lista = montarTrilha(t, primeiroNome(p));
    const pl = S().planos?.[p.id];
    if (!lista.length) return '<div class="empty">Preencha o rastreio para a trilha aparecer.</div>';
    return `<div class="tr-cartoes">${lista.map((e, n) => {
      const tipo = TIPOS[e.tipo], cat = catalogoDe(e.nome), noPlano = cat && pl?.alvos?.some(x => x.food === cat.id);
      const dest = e.tipo === 'flexibilizar' ? 'Quando aceitar outras versões dele, sobra espaço para alimento novo.' : e.destrava ? `Se este entrar, abre caminho para <b>${esc(e.destrava.nome)}</b> (muda ${juntar(e.destrava.dif.map(k => ROTULO_DIM[k]))}).` : '';
      return `<article class="tr-cartao" style="--tipo:${tipo.cor}"><header><span class="tr-ordem">${n + 1} de ${lista.length}</span><span class="tr-tipo">${tipo.nome}</span></header>
<h3>${cat ? icoAlimento(cat) : ''}${esc(e.nome)}</h3><p>${esc(e.texto)}</p>
${e.etiquetas.length ? `<div class="tr-etiquetas">${e.etiquetas.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
${dest ? `<p class="tr-destrava">${dest}</p>` : ''}
<div class="tr-acoes"><button class="button small primary" data-tr-conq="${esc(e.chave)}">${icon('check')}Conquistado</button><button class="button small" data-tr-trocar="${esc(e.chave)}">Trocar</button><button class="button small" data-tr-guardar="${esc(e.chave)}">Guardar para depois</button>${cat ? (noPlano ? '<span class="tr-noplano">Já está no plano</span>' : `<button class="text-button" data-tr-plano="${esc(cat.id)}">${icon('plate')}Levar para o plano</button>`) : ''}</div></article>`;
    }).join('')}</div>`;
  }

  function escada(t) {
    const cs = [...t.conquistas].sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id));
    const hoje = aceitos(t).length, dif = t.chegada ? hoje - t.chegada.total : 0;
    const nivel = id => NIVEIS.find(n => n[0] === id) || NIVEIS.at(-1);
    return `<div class="tr-escada">
<div class="tr-hoje"><b>${hoje}</b> ${hoje === 1 ? 'alimento aceito' : 'alimentos aceitos'} hoje${t.chegada ? ` <span class="${dif >= 0 ? 'mais' : 'menos'}">${dif >= 0 ? '+' : ''}${dif} desde a chegada</span>` : ''}</div>
<ol class="tr-degraus">${cs.map((c, i) => { const nv = nivel(c.nivel); return `<li style="--i:${Math.min(i, 10)};--nv:${nv[2]}"><div class="tr-degrau"><b>${esc(c.alimento || c.texto)}</b><small>${esc(nv[1])}${c.alimento && c.texto ? ` · ${esc(c.texto)}` : ''}</small><time>${dataBR(c.data)}</time><button class="x" data-tr-del-conq="${esc(c.id)}" aria-label="Apagar esta conquista">×</button></div></li>`; }).reverse().join('')}</ol>
${cs.length ? '' : '<div class="empty">As conquistas aparecem aqui, degrau por degrau, a partir da primeira.</div>'}
<div class="tr-chegada"><span>Quando chegou${t.chegada ? ` · ${dataBR(t.chegada.data)}` : ''}</span><textarea id="tr-chegada" rows="2" aria-label="Como a criança chegou" placeholder="Ex.: chegou comendo 9 alimentos e saía da mesa quando via o prato servido.">${esc(t.chegada?.texto || '')}</textarea></div></div>`;
  }

  function alemDaQuantidade(t, p) {
    const a = S().anamneses?.[p.id] || {}, aceitas = a.texturasAceitas || [];
    const coresNoPrato = new Set(aceitos(t).map(atributos).filter(Boolean).map(x => x.cor));
    return `<div class="tr-alem"><h3>Texturas que aceita</h3><p class="helper">As mesmas da anamnese: marcar aqui atualiza lá também.</p><div class="tr-chips">${Object.values(TEXTURAS).map(x => `<button type="button" class="tr-toggle ${aceitas.includes(x) ? 'on' : ''}" data-tr-textura="${esc(x)}" aria-pressed="${aceitas.includes(x)}">${esc(x)}</button>`).join('')}</div>
<h3>Cores que já aparecem no prato</h3><div class="tr-chips">${Object.entries(CORES).map(([k, c]) => `<span class="tr-cor ${coresNoPrato.has(k) ? 'on' : ''}"><i style="background:${c.ponto}"></i>${c.nome}</span>`).join('')}</div>
<form id="tr-conq-livre" class="tr-conq-form"><h3>Registrar uma conquista</h3><p class="helper">Conquista é um alimento mais o que a criança passou a fazer com ele. Se não envolver um alimento (sentar à mesa com a família, por exemplo), deixe o alimento em branco e escreva o que aconteceu.</p>
<div class="field-grid"><div class="field"><label for="tr-cl-alim">Alimento <small>(opcional)</small></label><input id="tr-cl-alim" name="alimento" maxlength="60"></div><div class="field"><label for="tr-cl-nivel">O que passou a fazer</label><select id="tr-cl-nivel" name="nivel">${NIVEIS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div></div>
<div class="field-grid"><div class="field"><label for="tr-cl-texto">O que aconteceu</label><input id="tr-cl-texto" name="texto" maxlength="140" placeholder="Ex.: passou a sentar à mesa com a família"></div><div class="field"><label for="tr-cl-data">Data</label><input id="tr-cl-data" name="data" type="date" value="${new Date().toLocaleDateString('sv-SE')}" max="${new Date().toLocaleDateString('sv-SE')}"></div></div>
<div class="form-footer"><span>Entra na escada de conquistas</span><button class="button primary" type="submit">Registrar conquista</button></div></form></div>`;
  }

  function page() {
    const p = paciente(); ctx.sel.id = p.id;
    const t = trilha(p.id), vazio = LISTAS.every(([k]) => !t.listas[k].length);
    const temAnamnese = (S().anamneses?.[p.id]?.repertorio || []).length || S().anamneses?.[p.id]?.outrosAceitos;
    const gTrocados = t.trocados.length, gGuardados = t.guardados;
    return heading('Trilha alimentar', 'Do rastreio da família aos cinco próximos alimentos, com o motivo de cada escolha à mostra.',
      `<select id="tr-paciente" class="select-big" aria-label="Criança">${S().patients.map(x => `<option value="${esc(x.id)}" ${x.id === p.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>${temAnamnese ? button('Trazer da anamnese', 'tr-importar', 'clipboard') : ''}`) +
`<div class="trilha">
<section class="card tr-sec"><div class="tr-sec-cab"><span class="tr-n">1</span><div><h2>Rastreio</h2><p>As listas que a família preenche. Pode colar tudo de uma vez, separado por vírgula ou por linha.</p></div></div>
<div class="tr-listas">${LISTAS.map(l => cartaoLista(l, t)).join('')}</div></section>
${vazio ? '' : `<section class="card tr-sec"><div class="tr-sec-cab"><span class="tr-n">2</span><div><h2>Mapa do repertório</h2><p>Grupo, cor e sabor de tudo o que a criança come. Onde está cheio e onde não tem nada.</p></div></div>${mapa(t)}</section>
<section class="card tr-sec"><div class="tr-sec-cab"><span class="tr-n">3</span><div><h2>Os cinco próximos alimentos</h2><p>Para guiar o planejamento. Na consulta, trabalhe um ou dois de cada vez. Quando um é conquistado, trocado ou guardado, a trilha se reorganiza.</p></div>
<div class="field tr-momento"><label for="tr-momento">Momento do acompanhamento</label><select id="tr-momento">${MOMENTOS.map(([v, l]) => `<option value="${v}" ${t.momento === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
${cartoesTrilha(t, p)}
${gGuardados.length || gTrocados ? `<div class="tr-fora">${gGuardados.length ? `<span>Guardados para depois:</span>${gGuardados.map(k => `<button class="tr-chip-mini" data-tr-voltar="${esc(k)}" title="Voltar para a trilha">${esc(nomeDaChave(t, k))} ↩</button>`).join('')}` : ''}${gTrocados ? `<button class="text-button" data-action="tr-desfazer-trocas">Desfazer ${gTrocados} ${gTrocados === 1 ? 'troca' : 'trocas'}</button>` : ''}</div>` : ''}</section>
<section class="card tr-sec"><div class="tr-sec-cab"><span class="tr-n">4</span><div><h2>Escada de conquistas</h2><p>Cada degrau é algo que ${esc(primeiroNome(p))} passou a fazer. Bom para mostrar à família o caminho desde a chegada.</p></div></div>
<div class="tr-evolucao">${escada(t)}${alemDaQuantidade(t, p)}</div></section>`}
</div>`;
  }
  function nomeDaChave(t, k) {
    for (const [l] of LISTAS) { const i = t.listas[l].find(x => chave(x.nome) === k); if (i) return i.nome; }
    return foods.find(f => f.id === k)?.name || k;
  }

  function abrirItem(lista, id) {
    const t = trilha(paciente().id), i = acharItem(t, lista, id); if (!i) return;
    itemAberto = { lista, id };
    const a = atributos(i) || {};
    const sel = (nome, rot, opcoes, v) => `<div class="field"><label for="tr-i-${nome}">${rot}</label><select id="tr-i-${nome}" name="${nome}" required><option value="">Escolha</option>${Object.entries(opcoes).map(([k, o]) => `<option value="${k}" ${v === k ? 'selected' : ''}>${esc(typeof o === 'string' ? o : o.nome)}</option>`).join('')}</select></div>`;
    ctx.modal(esc(i.nome), `<p>Mover para outra lista:</p><div class="tr-mover">${LISTAS.filter(([k]) => k !== lista).map(([k, tit]) => `<button type="button" class="button small" data-tr-mover="${k}">${tit}</button>`).join('')}</div>
<form id="tr-item-form">${lista === 'frequente' ? `<label class="check"><input type="checkbox" name="rigidez" ${i.rigidez ? 'checked' : ''}> Rigidez: só aceita de um jeito (uma marca, um formato, uma cor)</label>` : ''}
<h3 class="tr-modal-sub">Classificação ${i.attrs ? '<small>(ajustada à mão)</small>' : a.grupo ? '<small>(automática)</small>' : '<small>(o sistema não reconheceu)</small>'}</h3>
<div class="field-grid">${sel('grupo', 'Grupo', GRUPOS, a.grupo)}${sel('cor', 'Cor', CORES, a.cor)}${sel('sabor', 'Sabor', SABORES, a.sabor)}${sel('textura', 'Textura', TEXTURAS, a.textura)}</div>
<div class="form-footer"><button type="button" class="button danger" data-tr-del="${lista}|${esc(i.id)}">Tirar da lista</button><button class="button primary" type="submit">Salvar</button></div></form>`);
  }

  function abrirConquista(k) {
    const t = trilha(paciente().id), e = montarTrilha(t, primeiroNome(paciente())).find(x => x.chave === k); if (!e) return;
    const hoje = new Date().toLocaleDateString('sv-SE');
    ctx.modal(`Conquista com ${esc(e.nome)}`, `<form id="tr-conq-form" data-chave="${esc(k)}"><p>O que ${esc(primeiroNome(paciente()))} passou a fazer? O alimento sai da trilha e entra na escada de conquistas; um novo ocupa o lugar.</p>
<div class="field"><label for="tr-c-nivel">Conquista</label><select id="tr-c-nivel" name="nivel">${NIVEIS.map(([v, l]) => `<option value="${v}" ${(e.tipo === 'flexibilizar' ? 'variou' : 'comeu-consulta') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
<div class="field-grid"><div class="field"><label for="tr-c-texto">Detalhe <small>(opcional)</small></label><input id="tr-c-texto" name="texto" maxlength="140" placeholder="Ex.: comeu duas colheres"></div><div class="field"><label for="tr-c-data">Data</label><input id="tr-c-data" name="data" type="date" value="${hoje}" max="${hoje}"></div></div>
${e.tipo === 'flexibilizar' ? '<label class="check"><input type="checkbox" name="tirarRigidez" checked> Tirar a marcação de rigidez</label>' : `<label class="check"><input type="checkbox" name="mover" ${e.tipo === 'consolidar' ? '' : 'checked'}> Passar para "${e.tipo === 'consolidar' ? 'Come com frequência' : 'Come às vezes'}"</label>`}
<div class="form-footer"><span></span><button class="button primary" type="submit">Registrar conquista</button></div></form>`);
  }

  function moverPara(t, k, destino) {
    for (const [l] of LISTAS) {
      const idx = t.listas[l].findIndex(i => chave(i.nome) === k);
      if (idx >= 0) { if (l === destino) return; const [i] = t.listas[l].splice(idx, 1); delete i.motivo; if (destino !== 'frequente') delete i.rigidez; t.listas[destino].push(i); return; }
    }
    const f = foods.find(x => x.id === k);
    if (f) t.listas[destino].push({ id: uid(), nome: f.name });
  }

  return {
    page,
    onClick(el) {
      const d = el.dataset, p = paciente(), t = trilha(p.id);
      if (d.trAdd) { adicionar(d.trAdd, document.getElementById(`tr-add-${d.trAdd}`)?.value); return true; }
      if (d.trItem) { const [l, id] = d.trItem.split('|'); abrirItem(l, id); return true; }
      if (d.trDel) { const [l, id] = d.trDel.split('|'); t.listas[l] = t.listas[l].filter(i => i.id !== id); if (document.getElementById('modal').open) ctx.close(); ctx.save(); ctx.render(); return true; }
      if (d.trMover && itemAberto) {
        const i = acharItem(t, itemAberto.lista, itemAberto.id);
        if (i) { t.listas[itemAberto.lista] = t.listas[itemAberto.lista].filter(x => x.id !== i.id); if (d.trMover !== 'frequente') delete i.rigidez; if (d.trMover === 'parou') i.motivo = ''; else delete i.motivo; t.listas[d.trMover].push(i); }
        itemAberto = null; ctx.close(); ctx.save(); ctx.render(); return true;
      }
      if (d.trConq) { abrirConquista(d.trConq); return true; }
      if (d.trTrocar) { t.trocados.push(d.trTrocar); ctx.save(); ctx.render(); toast('Trocado. Entrou o próximo da fila.'); return true; }
      if (d.trGuardar) { t.guardados.push(d.trGuardar); ctx.save(); ctx.render(); toast('Guardado para depois.'); return true; }
      if (d.trVoltar) { t.guardados = t.guardados.filter(k => k !== d.trVoltar); ctx.save(); ctx.render(); return true; }
      if (d.action === 'tr-desfazer-trocas') { t.trocados = []; ctx.save(); ctx.render(); return true; }
      if (d.trPlano) {
        const pl = S().planos?.[p.id];
        if (!pl) { toast('Abra o Plano alimentar desta criança uma vez e tente de novo.'); return true; }
        pl.alvos = pl.alvos || [];
        if (!pl.alvos.some(x => x.food === d.trPlano)) pl.alvos.push({ food: d.trPlano, etapa: 0 });
        ctx.save(); ctx.render(); toast('Entrou nos alimentos-alvo do plano, com a escada do comer.'); return true;
      }
      if (d.trTextura) {
        const a = S().anamneses[p.id] || (S().anamneses[p.id] = { evolucoes: [] });
        const l = new Set(a.texturasAceitas || []); l.has(d.trTextura) ? l.delete(d.trTextura) : l.add(d.trTextura);
        a.texturasAceitas = [...l]; ctx.save(); ctx.render(); return true;
      }
      if (d.trDelConq) { t.conquistas = t.conquistas.filter(c => c.id !== d.trDelConq); ctx.save(); ctx.render(); return true; }
      if (d.action === 'tr-importar') {
        const a = S().anamneses?.[p.id] || {};
        const nomes = [...(a.repertorio || []).map(id => foods.find(f => f.id === id)?.name).filter(Boolean), ...String(a.outrosAceitos || '').split(/[,;\n]+/).map(s => s.trim()).filter(Boolean)];
        const antes = t.listas.frequente.length;
        adicionar('frequente', nomes.join('\n'));
        const n = trilha(p.id).listas.frequente.length - antes;
        toast(n ? `${n} ${n === 1 ? 'alimento veio' : 'alimentos vieram'} da anamnese para "Come com frequência".` : 'Tudo o que está na anamnese já está no rastreio.');
        return true;
      }
      return false;
    },
    onChange(e) {
      if (e.id === 'tr-paciente') { ctx.sel.id = e.value; ctx.render(); return true; }
      const t = trilha(paciente().id);
      if (e.id === 'tr-momento') { t.momento = e.value; ctx.save(); ctx.render(); return true; }
      if (e.dataset?.trMotivo) { const i = t.listas.parou.find(x => x.id === e.dataset.trMotivo); if (i) { i.motivo = e.value; ctx.save(); ctx.render(); } return true; }
      if (e.id === 'tr-chegada') { t.chegada = { ...(t.chegada || { data: new Date().toLocaleDateString('sv-SE'), total: aceitos(t).length }), texto: e.value.trim() }; ctx.save(); toast('Ponto de partida salvo.'); return true; }
      return false;
    },
    onSubmit(form, v) {
      const t = trilha(paciente().id);
      if (form.id === 'tr-item-form' && itemAberto) {
        const i = acharItem(t, itemAberto.lista, itemAberto.id);
        if (i) {
          if (itemAberto.lista === 'frequente') { if (v.rigidez) i.rigidez = true; else delete i.rigidez; }
          const novo = { grupo: v.grupo, cor: v.cor, sabor: v.sabor, textura: v.textura }, auto = classificar(i.nome);
          if (!auto || ['grupo', 'cor', 'sabor', 'textura'].some(k => auto[k] !== novo[k])) i.attrs = { ...novo, catalogo: auto?.catalogo || '' }; else delete i.attrs;
        }
        itemAberto = null; ctx.close(); ctx.save(); ctx.render(); toast('Alimento atualizado.'); return true;
      }
      if (form.id === 'tr-conq-form') {
        const k = form.dataset.chave, nome = nomeDaChave(t, k);
        const ondeEsta = onde(t, k)?.[0];
        t.conquistas.push({ id: uid(), alimento: nome, nivel: v.nivel, texto: (v.texto || '').trim(), data: v.data || new Date().toLocaleDateString('sv-SE') });
        if (!t.conquistados.includes(k)) t.conquistados.push(k);
        if (v.tirarRigidez) { const i = t.listas.frequente.find(x => chave(x.nome) === k); if (i) delete i.rigidez; }
        if (v.mover) moverPara(t, k, ondeEsta === 'asVezes' ? 'frequente' : 'asVezes');
        ctx.close(); ctx.save(); ctx.render(); toast('Conquista registrada. Um novo alimento entrou na trilha.'); return true;
      }
      if (form.id === 'tr-conq-livre') {
        const alimento = (v.alimento || '').trim(), texto = (v.texto || '').trim();
        if (!alimento && !texto) { toast('Informe o alimento ou escreva o que aconteceu.'); return true; }
        t.conquistas.push({ id: uid(), alimento, nivel: v.nivel, texto, data: v.data || new Date().toLocaleDateString('sv-SE') });
        ctx.save(); ctx.render(); toast('Conquista registrada.'); return true;
      }
      return false;
    }
  };
}

// Exemplo fictício para a demonstração (criança p1)
export function trilhaDemo() {
  const d = n => { const x = new Date(); x.setDate(x.getDate() - n); return x.toLocaleDateString('sv-SE'); };
  const it = (nome, extra = {}) => ({ id: uid(), nome, ...extra });
  const t = trilhaVazia();
  t.listas.frequente = ['Arroz branco', 'Feijão carioca', 'Batata', 'Pão francês', 'Ovo mexido', 'Frango desfiado', 'Banana prata', 'Iogurte natural', 'Biscoito de polvilho'].map(n => it(n));
  t.listas.frequente.push(it('Pão de queijo', { rigidez: true }));
  t.listas.asVezes = ['Maçã', 'Mamão', 'Cenoura cozida', 'Queijo minas'].map(n => it(n));
  t.listas.parou = [it('Macarrão', { motivo: 'trocas' }), it('Carne moída', { motivo: 'forcada' })];
  t.listas.familiaCome = ['Abóbora', 'Chuchu', 'Tangerina'].map(n => it(n));
  t.listas.familiaQuer = ['Brócolis', 'Morango'].map(n => it(n));
  t.listas.nunca = ['Tomate', 'Espinafre'].map(n => it(n));
  t.chegada = { data: d(70), total: 10, frutas: 1, legumes: 0, texto: 'Chegou comendo 10 alimentos, com uma fruta só e nenhum legume ou verdura. Saía da mesa quando via o prato servido.' };
  t.conquistas = [
    { id: uid(), alimento: '', nivel: 'mesa', texto: 'Passou a ficar à mesa com a família até o fim do almoço', data: d(60) },
    { id: uid(), alimento: 'Cenoura cozida', nivel: 'mexeu', texto: 'ajudou a descascar', data: d(46) },
    { id: uid(), alimento: 'Maçã', nivel: 'comeu-casa', texto: '', data: d(33) },
    { id: uid(), alimento: 'Cenoura cozida', nivel: 'comeu-consulta', texto: '', data: d(19) },
    { id: uid(), alimento: 'Brócolis', nivel: 'provou', texto: 'lambeu e deu uma mordida', data: d(6) }
  ];
  return t;
}
