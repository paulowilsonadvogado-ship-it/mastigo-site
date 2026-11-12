// Tabelas de composição usadas no Plano alimentar e na Biblioteca: TACO, IBGE (POF 2008-2009) e USDA,
// mais a Tabela de Medidas Referidas do IBGE (medidas caseiras em gramas).
// A TBCA (USP) não entra: a licença dela (CC BY-NC-ND 4.0) proíbe uso comercial sem autorização da USP/FoRC.
import { tacoDados, tacoCategorias, tacoCampos, tacoFonte } from './taco.js?v=e2cde6a';
import { ibgeDados, ibgeCategorias, ibgeFonte } from './ibge.js?v=e2cde6a';
import { usdaDados, usdaCategorias, usdaFonte } from './usda.js?v=e2cde6a';
import { medidasIbge, medidasNomes, medidasFonte } from './medidas-ibge.js?v=e2cde6a';

export const CAMPOS = tacoCampos; // kcal, ptn, lip, cho, fibra, ca, fe, zn, na, k, vitA, vitC, mg
const nutrientes = (r, ini) => Object.fromEntries(CAMPOS.map((c, i) => [c, r[ini + i]]));

export const baseTaco = tacoDados.map(r => ({ id: 't' + r[0], nome: r[2], cat: tacoCategorias[r[1]], fonte: 'TACO', n: nutrientes(r, 3) }));
export const baseIbge = ibgeDados.map(r => ({ id: `i${r[0]}-${r[1]}`, nome: r[4] ? `${r[3]}, ${r[4]}` : r[3], cat: ibgeCategorias[r[2]], fonte: 'IBGE', medidas: `${r[0]}-${r[1]}`, naAdicao: r[18], n: nutrientes(r, 5) }));
export const baseUsda = usdaDados.map(r => ({ id: 'u' + r[0], nome: r[2], original: r[3], cat: usdaCategorias[r[1]], fonte: 'USDA', n: nutrientes(r, 4) }));

export const TABELAS = [
  { id: 'TACO', nome: 'TACO', titulo: 'TACO 4ª edição', fonte: tacoFonte, base: baseTaco, categorias: tacoCategorias,
    citacao: 'NEPA/UNICAMP. Tabela Brasileira de Composição de Alimentos – TACO. 4. ed. rev. e ampl. Campinas: NEPA/UNICAMP, 2011.',
    nota: 'Alimentos crus e cozidos sem sal, óleo ou temperos. Leite de vaca fluido sem valores completos.' },
  { id: 'IBGE', nome: 'IBGE', titulo: 'IBGE · POF 2008-2009', fonte: ibgeFonte, base: baseIbge, categorias: ibgeCategorias,
    citacao: 'IBGE. Pesquisa de Orçamentos Familiares 2008-2009: tabelas de composição nutricional dos alimentos consumidos no Brasil. Rio de Janeiro: IBGE, 2011.',
    nota: 'Alimentos e preparações como o brasileiro consome (cozido, frito, refogado, ensopado...). O sódio não inclui o sal acrescentado no preparo.' },
  { id: 'USDA', nome: 'USDA', titulo: 'USDA FoodData Central', fonte: usdaFonte, base: baseUsda, categorias: usdaCategorias,
    citacao: 'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central: SR Legacy, 2018. Disponível em: fdc.nal.usda.gov.',
    nota: `Seleção de ${baseUsda.length} alimentos que faltam ou estão incompletos na TACO e no IBGE (leite materno, leite fluido, frutas vermelhas, grãos, sementes, bebidas vegetais, papinhas), com nome traduzido e o original em inglês.` }
];
export const tabelaPorId = Object.fromEntries(TABELAS.map(t => [t.id, t]));
export const PRIORIDADE = { 'Próprio': 0, TACO: 1, IBGE: 2, USDA: 3 };
const indice = new Map(TABELAS.flatMap(t => t.base.map(a => [a.id, a])));
export const acharNasTabelas = id => indice.get(id) || null;
export const baseTabelas = (filtro = 'todas') => filtro === 'todas' ? TABELAS.flatMap(t => t.base) : (tabelaPorId[filtro]?.base || []);
export const totalTabelas = TABELAS.reduce((s, t) => s + t.base.length, 0);
export const FILTROS = [['todas', 'Todas as tabelas'], ['TACO', 'Só TACO'], ['IBGE', 'Só IBGE'], ['USDA', 'Só USDA'], ['Próprio', 'Só os meus alimentos']];
export const rotuloFonte = a => a?.fonte === 'Próprio' ? 'próprio' : (a?.fonte || '');

// ---------- Medidas caseiras (IBGE, Tabela de Medidas Referidas) ----------
export { medidasFonte };
export const medidasDe = chave => (medidasIbge[chave] || []).map(([i, g]) => ({ nome: medidasNomes[i], g }));
const norm = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const VAZIAS = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'sem', 'e', 'em', 'a', 'o', 'tipo', 'cru', 'crua', 'cozido', 'cozida']);
// Primeira palavra útil do nome ("Arroz, tipo 1, cozido" -> "arroz") para procurar medidas de um alimento parecido
export const termoMedida = nome => norm(nome).split(/[\s,()/]+/).find(w => w.length > 2 && !VAZIAS.has(w)) || '';
// Alimentos do IBGE com medidas cujo nome contém todas as palavras do termo
export function buscarMedidas(termo, limite = 8) {
  const palavras = norm(termo).trim().split(/\s+/).filter(Boolean);
  if (!palavras.length) return [];
  return baseIbge.filter(a => medidasIbge[a.medidas] && palavras.every(w => norm(a.nome).includes(w)))
    .sort((x, y) => (norm(y.nome).startsWith(palavras[0]) - norm(x.nome).startsWith(palavras[0])) || x.nome.length - y.nome.length)
    .slice(0, limite);
}

const FRACOES = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
export function qtdTexto(q) {
  const inteiro = Math.floor(q), resto = Math.round((q - inteiro) * 100) / 100;
  if (!resto) return String(inteiro);
  if (FRACOES[resto]) return inteiro ? `${inteiro} ${FRACOES[resto]}` : FRACOES[resto];
  return String(q).replace('.', ',');
}
function plural(p) {
  if (/ão$/.test(p)) return p.replace(/ão$/, 'ões');
  if (/[rz]$/.test(p)) return p + 'es';
  if (/s$/.test(p)) return p;
  if (/l$/.test(p)) return p.replace(/l$/, 'is');
  if (/m$/.test(p)) return p.replace(/m$/, 'ns');
  return p + 's';
}
// "2 colheres de sopa", "½ concha", "1 ½ fatias", "150 ml"
export function medidaTexto(q, nome) {
  if (nome === 'mililitro') return `${qtdTexto(q)} ml`;
  if (q <= 1) return `${qtdTexto(q)} ${nome}`;
  let parar = false;
  const partes = nome.split(' ').map(w => { if (parar || w === 'de' || /[(/]/.test(w)) { parar = true; return w; } return plural(w); });
  return `${qtdTexto(q)} ${partes.join(' ')}`;
}
