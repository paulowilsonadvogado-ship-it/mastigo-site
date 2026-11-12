// Biblioteca de alimentos única: catálogo do diário (desenhado no app.js), tabelas de composição (TACO, IBGE e USDA),
// medidas caseiras do IBGE e alimentos próprios. São os mesmos dados usados no cálculo do Plano alimentar.
import { TABELAS, tabelaPorId, baseTabelas, totalTabelas, CAMPOS, PRIORIDADE, buscarMedidas, medidasDe, medidasFonte } from './tabelas.js?v=e2cde6a';
import { tacoCategorias } from './taco.js?v=e2cde6a';
import { uid, num } from './util-nutri.js?v=e2cde6a';

const norm = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const COLUNAS = [['kcal', 'kcal', 0], ['ptn', 'Prot. (g)', 1], ['cho', 'Carb. (g)', 1], ['lip', 'Lip. (g)', 1], ['fibra', 'Fibra (g)', 1], ['ca', 'Cálcio (mg)', 0], ['fe', 'Ferro (mg)', 1], ['na', 'Sódio (mg)', 0]];
const CAMPOS_FORM = [['kcal', 'Energia (kcal)'], ['ptn', 'Proteínas (g)'], ['cho', 'Carboidratos (g)'], ['lip', 'Lipídios (g)'], ['fibra', 'Fibra (g)'], ['ca', 'Cálcio (mg)'], ['fe', 'Ferro (mg)'], ['zn', 'Zinco (mg)'], ['na', 'Sódio (mg)'], ['vitA', 'Vit. A (µg RAE)'], ['vitC', 'Vit. C (mg)'], ['k', 'Potássio (mg)']];
const LIMITE = 80;

export function createBiblioteca(ctx) {
  const { esc, icon, toast } = ctx;
  const S = () => ctx.state;
  let aba = 'catalogo', termo = '', categoria = '', tabela = 'todas', termoMed = '';

  const abas = () => `<div class="bib-abas" role="tablist" aria-label="Biblioteca de alimentos">${[['catalogo', '🍎 Alimentos do diário', null], ['taco', '📊 Tabelas de composição', totalTabelas], ['medidas', '🥄 Medidas caseiras', null], ['proprios', '🏷️ Alimentos próprios', S().alimentosProprios.length]]
    .map(([id, l, n]) => `<button role="tab" aria-selected="${aba === id}" class="${aba === id ? 'on' : ''}" data-bib-aba="${id}">${l}${n != null ? `<b>${n}</b>` : ''}</button>`).join('')}</div>`;

  const valor = (n, k, casas) => n?.[k] == null ? '<span class="tr">–</span>' : num(n[k], casas);
  function linhas(lista) {
    return lista.map(a => `<tr><td>${esc(a.nome)}${a.fonte === 'Próprio' ? ' <span class="tag-proprio">próprio</span>' : ` <span class="tag fonte">${esc(a.fonte)}</span>`}${a.original ? `<small class="bib-orig">${esc(a.original)}</small>` : ''}</td><td class="grp">${esc(a.cat || '')}</td>${COLUNAS.map(([k, , c]) => `<td class="n">${valor(a.n, k, c)}</td>`).join('')}</tr>`).join('');
  }
  function filtrar() {
    const palavras = norm(termo).trim().split(/\s+/).filter(Boolean);
    return [...(tabela === 'todas' ? S().alimentosProprios : []), ...baseTabelas(tabela)].filter(a => (!categoria || a.cat === categoria) && palavras.every(w => norm(a.nome).includes(w)))
      .sort((x, y) => palavras.length ? (norm(y.nome).startsWith(palavras[0]) - norm(x.nome).startsWith(palavras[0])) || (PRIORIDADE[x.fonte] ?? 9) - (PRIORIDADE[y.fonte] ?? 9) || x.nome.length - y.nome.length : 0);
  }
  function resultadosTaco() {
    const lista = filtrar();
    return `<div class="table-wrap"><table class="bib-tabela"><thead><tr><th>ALIMENTO (100 g)</th><th>GRUPO</th>${COLUNAS.map(([, l]) => `<th class="n">${l.toUpperCase()}</th>`).join('')}</tr></thead><tbody>${linhas(lista.slice(0, LIMITE))}</tbody></table></div>
${lista.length ? `<p class="helper bib-rodape">Mostrando ${Math.min(LIMITE, lista.length)} de ${lista.length} alimento(s). ${lista.length > LIMITE ? 'Refine a busca para ver outros. ' : ''}“–” = traço, não analisado ou sem valor na tabela.</p>` : '<div class="empty">Nenhum alimento encontrado. Se for um produto industrializado, cadastre como alimento próprio pelo rótulo.</div>'}`;
  }
  const gruposDaTabela = () => tabela === 'todas' ? [...new Set(TABELAS.flatMap(t => t.categorias))] : tabelaPorId[tabela].categorias;
  function fontes(lista) {
    return `<div class="bib-fontes">${lista.map(t => `<p><b>${esc(t.nome)}</b> · ${esc(t.citacao)} ${esc(t.nota || '')}</p>`).join('')}</div>`;
  }
  function taco() {
    return `<section class="card"><div class="bib-filtros"><label class="search">${icon('search')}<input id="bib-busca" placeholder="Buscar alimento (ex.: banana prata, arroz, mirtilo)" value="${esc(termo)}" aria-label="Buscar alimento"></label>
<select id="bib-tabela" aria-label="Tabela de composição"><option value="todas" ${tabela === 'todas' ? 'selected' : ''}>Todas as tabelas</option>${TABELAS.map(t => `<option value="${t.id}" ${tabela === t.id ? 'selected' : ''}>${esc(t.titulo)} (${t.base.length})</option>`).join('')}</select>
<select id="bib-cat" aria-label="Grupo de alimentos"><option value="">Todos os grupos</option>${gruposDaTabela().map(c => `<option ${c === categoria ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
<div id="bib-res">${resultadosTaco()}</div><p class="helper bib-fonte" style="padding:0 20px">Valores por 100 g de parte comestível. Estes são os mesmos alimentos usados no cálculo do Plano alimentar.</p>${fontes(tabela === 'todas' ? TABELAS : [tabelaPorId[tabela]])}</section>`;
  }
  function resultadosMedidas() {
    const lista = buscarMedidas(termoMed, 30);
    if (!termoMed.trim()) return '<div class="empty">Digite um alimento para ver as medidas caseiras e quanto pesa cada uma (ex.: arroz, feijão, banana, pão francês).</div>';
    if (!lista.length) return '<div class="empty">Nenhum alimento do IBGE com esse nome. Tente outra palavra.</div>';
    return `<div class="table-wrap"><table class="bib-tabela"><thead><tr><th>ALIMENTO (IBGE)</th><th>MEDIDAS CASEIRAS (PESO EM GRAMAS)</th></tr></thead><tbody>${lista.map(a => `<tr><td>${esc(a.nome)}<small class="bib-orig">${esc(a.cat)}</small></td><td>${medidasDe(a.medidas).map(m => `${esc(m.nome)}: <b>${String(m.g).replace('.', ',')} g</b>`).join(' · ')}</td></tr>`).join('')}</tbody></table></div>
<p class="helper bib-rodape">${lista.length === 30 ? 'Mostrando os 30 primeiros. Refine a busca para ver outros. ' : ''}No Plano alimentar, o botão da colher ao lado da medida preenche os gramas.</p>`;
  }
  function medidas() {
    return `<section class="card"><div class="bib-filtros"><label class="search">${icon('search')}<input id="bib-med-busca" placeholder="Buscar alimento (ex.: arroz, feijão, banana)" value="${esc(termoMed)}" aria-label="Buscar medidas caseiras"></label></div>
<div id="bib-med-res">${resultadosMedidas()}</div><div class="bib-fontes"><p><b>Fonte</b> · ${esc(medidasFonte)}. Medidas e pesos relatados pelos brasileiros na POF; confira com a medida usada pela família.</p></div></section>`;
  }
  function proprios() {
    const lista = S().alimentosProprios;
    return `<div class="bib-proprios"><form id="bib-alim-form" class="card form-card"><h2>Cadastrar alimento próprio</h2><p class="helper">Para produtos industrializados, receitas da família ou alimentos que não estão nas tabelas TACO, IBGE e USDA. Informe os valores por 100 g ou 100 ml, conforme o rótulo. O alimento passa a aparecer na busca do Plano alimentar.</p>
<div class="field-grid"><div class="field"><label for="ap-nome">Nome</label><input id="ap-nome" name="nome" maxlength="90" required placeholder="Ex.: Leite integral UHT (marca)"></div><div class="field"><label for="ap-cat">Grupo</label><select id="ap-cat" name="cat">${tacoCategorias.map(c => `<option>${esc(c)}</option>`).join('')}</select></div></div>
<div class="field-grid four">${CAMPOS_FORM.map(([k, l]) => `<div class="field"><label for="ap-${k}">${l}</label><input id="ap-${k}" name="${k}" type="number" step="0.01" min="0" ${k === 'kcal' ? 'required' : ''}></div>`).join('')}</div>
<div class="field"><label for="ap-fonte">Fonte dos valores</label><input id="ap-fonte" name="origem" maxlength="80" placeholder="Ex.: rótulo do produto, TBCA, receita padronizada"></div>
<div class="form-footer"><span>Salvo neste navegador</span><button class="button primary" type="submit">${icon('plus')}Cadastrar alimento</button></div></form>
<section class="card"><div class="card-head"><div><h2>Seus alimentos</h2><p>${lista.length} cadastrado(s)</p></div></div>${lista.length ? `<div class="table-wrap"><table><thead><tr><th>ALIMENTO</th><th class="n">KCAL</th><th class="n">PROT.</th><th class="n">CARB.</th><th class="n">LIP.</th><th>FONTE</th><th></th></tr></thead><tbody>${lista.map(x => `<tr><td>${esc(x.nome)}<small class="grp-linha">${esc(x.cat || '')}</small></td><td class="n">${valor(x.n, 'kcal', 0)}</td><td class="n">${valor(x.n, 'ptn', 1)}</td><td class="n">${valor(x.n, 'cho', 1)}</td><td class="n">${valor(x.n, 'lip', 1)}</td><td style="font-weight:400">${esc(x.origem || '—')}</td><td><button class="icon-button" data-bib-del="${esc(x.id)}" aria-label="Excluir ${esc(x.nome)}">${icon('trash')}</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Nenhum alimento próprio ainda.</div>'}</section></div>`;
  }

  return {
    get aba() { return aba; },
    abrir(a) { aba = a; ctx.navigate('foods'); },
    abas,
    conteudo: () => aba === 'taco' ? taco() : aba === 'medidas' ? medidas() : aba === 'proprios' ? proprios() : '',
    onClick(el) {
      const d = el.dataset;
      if (d.bibAba) { aba = d.bibAba; ctx.render(); return true; }
      if (d.bibDel) { S().alimentosProprios = S().alimentosProprios.filter(x => x.id !== d.bibDel); ctx.save(); ctx.render(); toast('Alimento excluído.'); return true; }
      return false;
    },
    onInput(e) {
      if (e.id === 'bib-busca') { termo = e.value; const r = document.getElementById('bib-res'); if (r) r.innerHTML = resultadosTaco(); return true; }
      if (e.id === 'bib-med-busca') { termoMed = e.value; const r = document.getElementById('bib-med-res'); if (r) r.innerHTML = resultadosMedidas(); return true; }
      return false;
    },
    onChange(e) {
      if (e.id === 'bib-cat') { categoria = e.value; const r = document.getElementById('bib-res'); if (r) r.innerHTML = resultadosTaco(); return true; }
      if (e.id === 'bib-tabela') { tabela = e.value; if (categoria && !gruposDaTabela().includes(categoria)) categoria = ''; ctx.render(); return true; }
      return false;
    },
    onSubmit(form, v) {
      if (form.id !== 'bib-alim-form') return false;
      if (!String(v.nome || '').trim()) { toast('Informe o nome do alimento.'); return true; }
      const n = Object.fromEntries(CAMPOS.map(c => [c, v[c] === '' || v[c] == null ? null : Number(v[c])]));
      S().alimentosProprios.push({ id: 'p-' + uid(), nome: v.nome.trim(), cat: v.cat, fonte: 'Próprio', origem: (v.origem || '').trim(), n });
      ctx.save(); ctx.render(); toast('Alimento cadastrado. Já aparece na busca do plano.'); return true;
    }
  };
}
