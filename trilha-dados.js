// Classificação dos alimentos para a Trilha alimentar: grupo (energéticos, reguladores, construtores,
// extras), cor, sabor e textura. Reconhece o texto livre que a família escreve ("Frango empanado",
// "Banana prata", "Biscoito de polvilho") e liga ao catálogo quando dá. A nutricionista pode corrigir
// qualquer classificação na tela; o que ela corrige vale só para aquela criança.
import { texturas as TEXTURAS_ANAMNESE } from './anamnese.js?v=90a3970';

export const GRUPOS = {
  energeticos: { nome: 'Energéticos', dica: 'cereais, pães, massas e tubérculos' },
  reguladores: { nome: 'Reguladores', dica: 'frutas, legumes e verduras' },
  construtores: { nome: 'Construtores', dica: 'leite, carnes, ovos e feijões' },
  extras: { nome: 'Energéticos extras', dica: 'doces, frituras e ultraprocessados' }
};
export const CORES = {
  claro: { nome: 'Branco / amarelo / laranja', curto: 'claro', ponto: '#f4c542' },
  marrom: { nome: 'Marrom', curto: 'marrom', ponto: '#8a5a3c' },
  vermelho: { nome: 'Vermelho / rosa / roxo', curto: 'vermelho, rosa ou roxo', ponto: '#d4148f' },
  verde: { nome: 'Verde', curto: 'verde', ponto: '#2e9d5b' }
};
export const SABORES = { doce: 'Doce', salgado: 'Salgado', azedo: 'Azedo', amargo: 'Amargo', umami: 'Umami' };
// Mesmos nomes de textura da anamnese, para as duas telas falarem a mesma língua
const T = Object.fromEntries(['liquido', 'pure', 'amassado', 'macio', 'crocante', 'derrete', 'fibroso', 'misto', 'molhado', 'pegajoso'].map((k, i) => [k, TEXTURAS_ANAMNESE[i]]));
export const TEXTURAS = T;

export const normalizar = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// [padrão, grupo, cor, sabor, textura, id no catálogo]. Ordem importa: o mais específico vem antes.
const E = 'energeticos', R = 'reguladores', C = 'construtores', X = 'extras';
const REGRAS = [
  // Preparações e industrializados (antes dos ingredientes que aparecem no nome)
  ['pao de queijo', E, 'claro', 'salgado', 'macio'],
  ['semente de abobora', X, 'verde', 'salgado', 'crocante', 'semente-de-abobora'],
  ['biscoito recheado|bolacha recheada|recheado|oreo|negresco', X, 'marrom', 'doce', 'crocante'],
  ['biscoito de polvilho|polvilho', X, 'claro', 'salgado', 'derrete'],
  ['cream cracker|agua e sal|biscoito salgado|bolacha salgada', X, 'claro', 'salgado', 'crocante'],
  ['biscoito|bolacha|maizena|rosquinha|wafer|cookie', X, 'claro', 'doce', 'crocante'],
  ['batata frita|batata palha|batata chips|fritas', X, 'claro', 'salgado', 'crocante'],
  ['salgadinho|chips|doritos|cheetos|fandangos|ruffles', X, 'claro', 'salgado', 'crocante'],
  ['pipoca', E, 'claro', 'salgado', 'crocante'],
  ['nugget|nuggets|empanado|empanada|milanesa', C, 'marrom', 'umami', 'crocante'],
  ['danoninho|petit suisse', C, 'vermelho', 'doce', 'pure'],
  ['iogurte natural', C, 'claro', 'azedo', 'pure', 'iogurte-natural'],
  ['coalhada', C, 'claro', 'azedo', 'pure', 'coalhada'],
  ['iogurte de (morango|frutas vermelhas|uva|amora|framboesa)', C, 'vermelho', 'doce', 'pure'],
  ['iogurte|danone|yakult|bebida lactea', C, 'claro', 'doce', 'pure'],
  ['requeijao|cream cheese|queijo cremoso', C, 'claro', 'salgado', 'pure'],
  ['queijo minas|minas frescal', C, 'claro', 'salgado', 'macio', 'queijo-minas'],
  ['mucarela|mussarela|muzzarela|mozzarella', C, 'claro', 'salgado', 'macio', 'queijo-mucarela'],
  ['ricota', C, 'claro', 'salgado', 'macio', 'ricota'],
  ['queijo', C, 'claro', 'salgado', 'macio'],
  ['leite condensado|doce de leite|brigadeiro', X, 'marrom', 'doce', 'pegajoso'],
  ['achocolatado|nescau|toddy|toddynho|chocolate quente', X, 'marrom', 'doce', 'liquido'],
  ['vitamina', C, 'claro', 'doce', 'liquido'],
  ['leite', C, 'claro', 'doce', 'liquido', 'leite'],
  ['mingau|papinha', E, 'claro', 'doce', 'pure'],
  ['acai', X, 'vermelho', 'doce', 'pure'],
  ['sorvete|picole', X, 'claro', 'doce', 'derrete'],
  ['gelatina', X, 'vermelho', 'doce', 'derrete'],
  ['bala|pirulito|chiclete|jujuba|marshmallow', X, 'vermelho', 'doce', 'pegajoso'],
  ['bolo|cupcake|muffin|brownie', X, 'claro', 'doce', 'macio'],
  ['chocolate|bombom', X, 'marrom', 'doce', 'derrete'],
  ['refrigerante|refri|coca|guarana', X, 'marrom', 'doce', 'liquido'],
  ['suco de caixinha|suco em po|tang|clight|del valle|ades', X, 'claro', 'doce', 'liquido'],
  ['ketchup|catchup', X, 'vermelho', 'doce', 'pure'],
  ['maionese|manteiga|margarina|nata', X, 'claro', 'salgado', 'pure'],
  ['geleia', X, 'vermelho', 'doce', 'pegajoso'],
  ['mel|melado', X, 'claro', 'doce', 'pegajoso'],
  ['pizza', X, 'vermelho', 'umami', 'misto'],
  ['hamburguer|hamburger', C, 'marrom', 'umami', 'macio'],
  ['salsicha|cachorro quente|hot dog', C, 'vermelho', 'salgado', 'macio'],
  ['linguica|calabresa', C, 'marrom', 'salgado', 'fibroso'],
  ['presunto|mortadela|peito de peru|apresuntado|salame', C, 'vermelho', 'salgado', 'macio'],
  ['miojo|lamen|macarrao instantaneo', X, 'claro', 'salgado', 'macio'],
  ['panqueca de banana|panqueca doce|crepe doce', E, 'claro', 'doce', 'macio'],
  ['coxinha|pastel|esfiha|empada|kibe|quibe|enroladinho|salgado frito|salgadinho de festa', X, 'claro', 'salgado', 'crocante'],
  ['lasanha|nhoque|panqueca|crepe', E, 'claro', 'salgado', 'macio'],
  ['macarrao|espaguete|massa|talharim|penne|parafuso|ravioli', E, 'claro', 'salgado', 'macio', 'macarrao'],
  ['arroz doce', X, 'claro', 'doce', 'pure'],
  ['arroz integral', E, 'marrom', 'salgado', 'macio', 'arroz-integral'],
  ['arroz', E, 'claro', 'salgado', 'macio', 'arroz'],
  ['granola|cereal|sucrilhos|flocos de milho|corn flakes', X, 'claro', 'doce', 'crocante'],
  ['aveia', E, 'claro', 'doce', 'pure', 'aveia'],
  ['quinoa|quinua', E, 'claro', 'salgado', 'macio', 'quinoa'],
  ['pao integral', E, 'marrom', 'salgado', 'macio', 'pao-integral'],
  ['pao frances|pao de sal|cacetinho|carioquinha', E, 'claro', 'salgado', 'crocante', 'pao-frances'],
  ['torrada|sanduiche|misto quente', E, 'claro', 'salgado', 'crocante'],
  ['pao|bisnaguinha', E, 'claro', 'salgado', 'macio'],
  ['cuscuz', E, 'claro', 'salgado', 'macio', 'cuscuz-de-milho'],
  ['tapioca|beiju', E, 'claro', 'salgado', 'macio', 'tapioca'],
  ['polenta|angu|fuba', E, 'claro', 'salgado', 'pure'],
  ['farofa|farinha', E, 'claro', 'salgado', 'crocante'],
  ['batata doce', E, 'claro', 'doce', 'macio', 'batata-doce'],
  ['batata', E, 'claro', 'salgado', 'macio', 'batata'],
  ['mandioca|aipim|macaxeira', E, 'claro', 'salgado', 'macio', 'mandioca'],
  ['inhame', E, 'claro', 'salgado', 'macio', 'inhame'],
  ['cara', E, 'claro', 'salgado', 'macio', 'cara'],
  ['chia', X, 'marrom', 'salgado', 'crocante', 'chia'],
  ['linhaca', X, 'marrom', 'salgado', 'crocante', 'linhaca'],
  ['gergelim', X, 'claro', 'salgado', 'crocante', 'gergelim'],
  ['amendoim|castanha|nozes|amendoa', X, 'marrom', 'salgado', 'crocante'],
  ['agua de coco', R, 'claro', 'doce', 'liquido'],
  // Frutas
  ['banana', R, 'claro', 'doce', 'macio', 'banana'],
  ['maca', R, 'vermelho', 'doce', 'crocante', 'maca'],
  ['pera', R, 'verde', 'doce', 'macio', 'pera'],
  ['mamao|papaia', R, 'claro', 'doce', 'macio', 'mamao'],
  ['manga', R, 'claro', 'doce', 'macio', 'manga'],
  ['melancia', R, 'vermelho', 'doce', 'macio', 'melancia'],
  ['melao', R, 'claro', 'doce', 'macio', 'melao'],
  ['morango', R, 'vermelho', 'doce', 'macio', 'morango'],
  ['uva|uvas|passas', R, 'vermelho', 'doce', 'macio', 'uva'],
  ['laranja', R, 'claro', 'azedo', 'misto', 'laranja'],
  ['tangerina|mexerica|bergamota|ponkan|mimosa', R, 'claro', 'doce', 'misto', 'tangerina'],
  ['abacaxi', R, 'claro', 'azedo', 'fibroso', 'abacaxi'],
  ['abacate', R, 'verde', 'doce', 'pure', 'abacate'],
  ['kiwi', R, 'verde', 'azedo', 'macio', 'kiwi'],
  ['goiaba', R, 'vermelho', 'doce', 'misto', 'goiaba'],
  ['pessego', R, 'claro', 'doce', 'macio', 'pessego'],
  ['ameixa', R, 'vermelho', 'azedo', 'macio', 'ameixa'],
  ['maracuja', R, 'claro', 'azedo', 'misto', 'maracuja'],
  ['acerola', R, 'vermelho', 'azedo', 'macio', 'acerola'],
  ['jabuticaba', R, 'vermelho', 'doce', 'misto', 'jabuticaba'],
  ['pitanga', R, 'vermelho', 'azedo', 'macio', 'pitanga'],
  ['caju', R, 'claro', 'azedo', 'fibroso', 'caju'],
  ['caqui', R, 'claro', 'doce', 'macio', 'caqui'],
  ['figo', R, 'vermelho', 'doce', 'macio', 'figo'],
  ['limao', R, 'verde', 'azedo', 'liquido'],
  ['coco', R, 'claro', 'doce', 'fibroso'],
  ['amora|mirtilo|blueberry|framboesa|cereja', R, 'vermelho', 'azedo', 'macio'],
  ['fruta|frutas', R, 'vermelho', 'doce', 'macio'],
  // Legumes e verduras
  ['cenoura', R, 'claro', 'doce', 'crocante', 'cenoura'],
  ['abobrinha', R, 'verde', 'salgado', 'macio', 'abobrinha'],
  ['abobora|moranga|jerimum', R, 'claro', 'doce', 'macio', 'abobora'],
  ['chuchu', R, 'verde', 'salgado', 'macio', 'chuchu'],
  ['beterraba', R, 'vermelho', 'doce', 'macio', 'beterraba'],
  ['brocolis', R, 'verde', 'amargo', 'macio', 'brocolis'],
  ['couve flor', R, 'claro', 'amargo', 'macio', 'couve-flor'],
  ['alface', R, 'verde', 'amargo', 'fibroso', 'alface'],
  ['couve', R, 'verde', 'amargo', 'fibroso', 'couve'],
  ['espinafre', R, 'verde', 'amargo', 'macio', 'espinafre'],
  ['pepino', R, 'verde', 'salgado', 'crocante', 'pepino'],
  ['tomate', R, 'vermelho', 'azedo', 'misto', 'tomate'],
  ['berinjela', R, 'vermelho', 'amargo', 'macio', 'berinjela'],
  ['quiabo', R, 'verde', 'salgado', 'pegajoso', 'quiabo'],
  ['vagem', R, 'verde', 'salgado', 'fibroso', 'vagem'],
  ['repolho', R, 'verde', 'amargo', 'fibroso', 'repolho'],
  ['rucula', R, 'verde', 'amargo', 'fibroso', 'rucula'],
  ['agriao', R, 'verde', 'amargo', 'fibroso', 'agriao'],
  ['ervilha', R, 'verde', 'doce', 'macio', 'ervilha'],
  ['milho|pamonha|curau|espiga', R, 'claro', 'doce', 'misto', 'milho'],
  ['pimentao', R, 'verde', 'amargo', 'crocante'],
  ['palmito', R, 'claro', 'salgado', 'macio'],
  ['salada|folhas|verdura|verduras', R, 'verde', 'amargo', 'fibroso'],
  ['legume|legumes', R, 'claro', 'salgado', 'macio'],
  ['sopa|caldo|canja', R, 'claro', 'salgado', 'misto'],
  // Construtores
  ['ovo|ovos|omelete|omelete', C, 'claro', 'umami', 'macio', 'ovo'],
  ['frango|galinha|coxa|sobrecoxa', C, 'claro', 'umami', 'fibroso', 'frango'],
  ['carne moida|almondega|kafta', C, 'marrom', 'umami', 'macio', 'carne-bovina'],
  ['carne de porco|porco|suino|suina|lombo|bisteca|pernil', C, 'marrom', 'umami', 'fibroso', 'carne-suina'],
  ['carne|bife|picanha|patinho|acem|costela|churrasco|file mignon', C, 'marrom', 'umami', 'fibroso', 'carne-bovina'],
  ['tilapia', C, 'claro', 'umami', 'macio', 'tilapia'],
  ['sardinha', C, 'marrom', 'umami', 'macio', 'sardinha'],
  ['salmao', C, 'vermelho', 'umami', 'macio', 'salmao'],
  ['atum', C, 'marrom', 'umami', 'macio'],
  ['peixe|merluza|pescada|bacalhau|cacao', C, 'claro', 'umami', 'macio'],
  ['camarao', C, 'vermelho', 'umami', 'fibroso'],
  ['tofu', C, 'claro', 'salgado', 'macio', 'tofu'],
  ['feijao preto', C, 'marrom', 'salgado', 'misto', 'feijao-preto'],
  ['feijao branco', C, 'claro', 'salgado', 'misto', 'feijao-branco'],
  ['feijao|feijoada|tutu', C, 'marrom', 'salgado', 'misto', 'feijao-carioca'],
  ['lentilha', C, 'marrom', 'salgado', 'misto', 'lentilha'],
  ['grao de bico|homus|hummus', C, 'claro', 'salgado', 'macio', 'grao-de-bico'],
  ['soja', C, 'claro', 'salgado', 'macio', 'soja']
].map(([p, grupo, cor, sabor, textura, catalogo]) => ({ re: new RegExp(`\\b(${p})\\b`), grupo, cor, sabor, textura, catalogo: catalogo || '' }));

// Classifica um nome escrito livremente. Devolve null quando não reconhece (a nutricionista classifica).
export function classificar(nome) {
  const n = normalizar(nome);
  if (!n) return null;
  const r = REGRAS.find(x => x.re.test(n));
  const base = r ? { grupo: r.grupo, cor: r.cor, sabor: r.sabor, textura: r.textura, catalogo: r.catalogo } : null;
  const suco = /\bsuco\b/.test(n);
  if (!base) return suco ? { grupo: X, cor: 'claro', sabor: 'doce', textura: 'liquido', catalogo: '' } : null;
  // Modo de preparo muda a textura (e às vezes o grupo)
  if (suco) { base.textura = 'liquido'; base.catalogo = ''; }
  else if (/\b(sopa|caldo|canja)\b/.test(n)) base.textura = 'misto';
  else if (/\bpure\b/.test(n)) base.textura = 'pure';
  else if (/\bamassad[oa]s?\b/.test(n)) base.textura = 'amassado';
  else if (/\b(empanad[oa]s?|milanesa)\b/.test(n)) { base.textura = 'crocante'; base.cor = 'marrom'; }
  else if (/\bfrit[oa]s?\b/.test(n) && base.catalogo !== 'ovo') { base.textura = 'crocante'; if (base.grupo !== C) base.grupo = X; }
  else if (/\b(cozid[oa]s?|ensopad[oa]s?|refogad[oa]s?|assad[oa]s?|mexid[oa]s?)\b/.test(n) && ['crocante', 'fibroso'].includes(base.textura) && base.grupo === R) base.textura = 'macio';
  else if (/\bcru[ae]?s?\b/.test(n) && base.grupo === R) base.textura = 'crocante';
  if (/\b(com molho|ao molho|molho)\b/.test(n) && !suco) base.textura = 'molhado';
  if (/\bde chocolate\b/.test(n)) { base.cor = 'marrom'; base.sabor = 'doce'; if (base.grupo !== C) base.grupo = X; }
  return base;
}

// Quanto dois alimentos se parecem (food chaining: mudar uma característica por vez)
export const PESOS = { sabor: 2, textura: 2, cor: 1.5, grupo: 1 };
export const ROTULO_DIM = { sabor: 'o sabor', textura: 'a textura', cor: 'a cor', grupo: 'o grupo' };
export function parecenca(a, b) {
  if (!a || !b) return 0;
  return Object.entries(PESOS).reduce((s, [k, p]) => s + (a[k] === b[k] ? p : 0), 0);
}
export const diferencas = (a, b) => Object.keys(PESOS).filter(k => a[k] !== b[k]);
