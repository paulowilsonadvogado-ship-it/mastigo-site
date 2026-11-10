// Principais alimentos alergênicos (Anvisa, RDC 26/2015, Anexo), agrupados como na rotulagem,
// e detector simples pelo nome do alimento (TACO e alimentos próprios). É um apoio: confira sempre
// o rótulo e a composição real das preparações.
export const alergenicos = [
  { id: 'leite', nome: 'Leite (de todos os mamíferos)', re: /\bleite|queijo|iogurte|requeij|manteiga|coalhada|ricota|nata\b|creme de leite|doce de leite|bebida l[aá]ctea|chantilly|sorvete|pudim|mingau|achocolatado|chocolate ao leite|leite condensado|catupiry|lasanha|estrogonofe|pizza|p[aã]o de queijo/i },
  { id: 'ovo', nome: 'Ovos', re: /\bovo|omelete|maionese|bolo|panqueca|quindim|suspiro|merengue|farofa de ovo|pudim|empada|torta/i },
  { id: 'trigo', nome: 'Trigo, centeio, cevada e aveia (glúten)', re: /trigo|\bp[aã]o\b|p[aã]o,|macarr[aã]o|biscoito|bolacha|bolo|torrada|aveia|cevada|centeio|cuscuz, de trigo|pizza|lasanha|empada|coxinha|esfiha|pastel|panqueca|nhoque|farinha l[aá]ctea|cereal matinal|granola|barra de cereal|wafer|croissant|bisnaguinha|torta|risole|quibe|cerveja/i },
  { id: 'soja', nome: 'Soja', re: /soja|tofu|missô|shoyu|prote[ií]na texturizada/i },
  { id: 'amendoim', nome: 'Amendoim', re: /amendoim|pa[çc]oca|pé-de-moleque|p[eé] de moleque/i },
  { id: 'castanhas', nome: 'Castanhas, nozes, amêndoa, avelã, pistache, macadâmia, pecã, pinoli', re: /castanha|am[eê]ndoa|avel[aã]|\bnoz|nozes|macad[aâ]mia|pistache|pec[aã]|pinoli|nutella|creme de avel/i },
  { id: 'peixes', nome: 'Peixes', re: /peixe|atum|sardinha|til[aá]pia|pescada|merluza|salm[aã]o|bacalhau|corvina|cação|ca[cç][aã]o|pintado|tucunar[eé]|dourada|anchova|badejo|manjuba|pescadinha|surimi|tainha|piramutaba|porquinho|robalo|truta|bagre|curimbat[aá]|lambari|pacu|tambaqui|pirarucu|sushi/i },
  { id: 'crustaceos', nome: 'Crustáceos', re: /camar[aã]o|caranguejo|siri|lagosta|lagostim|kani/i }
];

export function detectarAlergenicos(nome, alergias = []) {
  if (!alergias.length) return [];
  return alergenicos.filter(a => alergias.includes(a.id) && a.re.test(nome || ''));
}
