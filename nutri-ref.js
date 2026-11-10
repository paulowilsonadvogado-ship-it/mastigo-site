// Referências nutricionais pediátricas usadas no Mastigô.
// Fontes:
// - EER: Institute of Medicine (IOM). Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat,
//   Fatty Acids, Cholesterol, Protein, and Amino Acids. Washington: National Academies Press, 2002/2005.
// - TMB: Schofield WN. Hum Nutr Clin Nutr 1985;39 Suppl 1:5-41 (equações por peso, adotadas pela FAO/OMS/UNU).
// - RDA/AI de micronutrientes: IOM DRIs (tabelas consolidadas do Food and Nutrition Board).
// - AMDR (faixas de distribuição de macronutrientes): IOM 2002/2005.
// - Classificação do IMC/idade por escore-z: OMS 2006/2007, adotada pelo Ministério da Saúde (SISVAN).
// Os valores servem de apoio à decisão; a prescrição é responsabilidade da nutricionista (Res. CFN 304/2003 e 600/2018).

export const niveisAtividade = [
  { id: 'sedentario', label: 'Sedentário (NAF 1,0–1,39)', m: 1.0, f: 1.0 },
  { id: 'pouco', label: 'Pouco ativo (NAF 1,4–1,59)', m: 1.13, f: 1.16 },
  { id: 'ativo', label: 'Ativo (NAF 1,6–1,89)', m: 1.26, f: 1.31 },
  { id: 'muito', label: 'Muito ativo (NAF 1,9–2,5)', m: 1.42, f: 1.56 }
];

// Idade em anos decimais a partir da data de nascimento (AAAA-MM-DD)
export function idadeEmAnos(nascimento, referencia = new Date()) {
  if (!nascimento) return null;
  const n = new Date(nascimento + 'T12:00:00');
  if (Number.isNaN(n.getTime())) return null;
  const ms = referencia.getTime() - n.getTime();
  return ms > 0 ? ms / (365.25 * 24 * 3600 * 1000) : null;
}

export function idadeTexto(anos) {
  if (anos == null) return '';
  const meses = Math.floor(anos * 12 + 1e-6);
  if (meses < 24) return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  const a = Math.floor(meses / 12), m = meses % 12;
  return `${a} anos${m ? ` e ${m} ${m === 1 ? 'mês' : 'meses'}` : ''}`;
}

// Necessidade energética estimada (IOM). peso em kg, estatura em cm.
export function eerIOM({ sexo, anos, peso, estatura, atividade = 'pouco' }) {
  if (!(anos >= 0) || !(peso > 0)) return null;
  const meses = anos * 12;
  if (anos < 3) {
    const base = 89 * peso - 100;
    const deposito = meses < 3 ? 175 : meses < 7 ? 56 : meses < 13 ? 22 : 20;
    return Math.round(base + deposito);
  }
  if (!(estatura > 0)) return null;
  const pa = (niveisAtividade.find(n => n.id === atividade) || niveisAtividade[1])[sexo === 'F' ? 'f' : 'm'];
  const h = estatura / 100, idade = Math.floor(anos);
  const deposito = anos < 9 ? 20 : 25;
  if (anos >= 19) return null; // fora do escopo infantil
  return Math.round(sexo === 'F'
    ? 135.3 - 30.8 * idade + pa * (10.0 * peso + 934 * h) + deposito
    : 88.5 - 61.9 * idade + pa * (26.7 * peso + 903 * h) + deposito);
}

// Taxa metabólica basal por Schofield (peso). Retorna kcal/dia.
export function tmbSchofield({ sexo, anos, peso }) {
  if (!(anos >= 0) || !(peso > 0)) return null;
  const F = sexo === 'F';
  if (anos < 3) return Math.round(F ? 58.317 * peso - 31.1 : 59.512 * peso - 30.4);
  if (anos < 10) return Math.round(F ? 20.315 * peso + 485.9 : 22.706 * peso + 504.3);
  if (anos < 18) return Math.round(F ? 13.384 * peso + 692.6 : 17.686 * peso + 658.2);
  return null;
}

// Faixa etária DRI
function faixa(anos, sexo) {
  if (anos < 0.5) return '0-6m';
  if (anos < 1) return '7-12m';
  if (anos < 4) return '1-3';
  if (anos < 9) return '4-8';
  if (anos < 14) return sexo === 'F' ? '9-13F' : '9-13M';
  return sexo === 'F' ? '14-18F' : '14-18M';
}

// Metas diárias de micronutrientes e fibra (RDA, ou AI quando não há RDA).
// naMax: ingestão de sódio para redução de risco de doença crônica (CDRR, NASEM 2019).
const dri = {
  '0-6m':   { ca: 200,  fe: 0.27, zn: 2, vitA: 400, vitC: 40, fibra: null, mg: 30,  na: 110,  ptnKg: 1.52 },
  '7-12m':  { ca: 260,  fe: 11,   zn: 3, vitA: 500, vitC: 50, fibra: null, mg: 75,  na: 370,  ptnKg: 1.2 },
  '1-3':    { ca: 700,  fe: 7,    zn: 3, vitA: 300, vitC: 15, fibra: 19,   mg: 80,  na: 800,  ptnKg: 1.05 , naMax: 1200 },
  '4-8':    { ca: 1000, fe: 10,   zn: 5, vitA: 400, vitC: 25, fibra: 25,   mg: 130, na: 1000, ptnKg: 0.95 , naMax: 1500 },
  '9-13M':  { ca: 1300, fe: 8,    zn: 8, vitA: 600, vitC: 45, fibra: 31,   mg: 240, na: 1200, ptnKg: 0.95 , naMax: 1800 },
  '9-13F':  { ca: 1300, fe: 8,    zn: 8, vitA: 600, vitC: 45, fibra: 26,   mg: 240, na: 1200, ptnKg: 0.95 , naMax: 1800 },
  '14-18M': { ca: 1300, fe: 11,   zn: 11, vitA: 900, vitC: 75, fibra: 38,  mg: 410, na: 1500, ptnKg: 0.85 , naMax: 2300 },
  '14-18F': { ca: 1300, fe: 15,   zn: 9, vitA: 700, vitC: 65, fibra: 26,   mg: 360, na: 1500, ptnKg: 0.85 , naMax: 2300 }
};

// Faixas aceitáveis de distribuição de macronutrientes (% do VET)
export function amdr(anos) {
  if (anos < 1) return null;
  if (anos < 4) return { cho: [45, 65], ptn: [5, 20], lip: [30, 40] };
  return { cho: [45, 65], ptn: [10, 30], lip: [25, 35] };
}

export function metas({ anos, sexo, peso }) {
  if (anos == null) return null;
  const f = faixa(anos, sexo), d = dri[f];
  return { faixa: f, ...d, ptn: peso > 0 ? Math.round(d.ptnKg * peso * 10) / 10 : null };
}

export const rotulosNutrientes = {
  kcal: ['Energia', 'kcal'], ptn: ['Proteínas', 'g'], cho: ['Carboidratos', 'g'], lip: ['Lipídios', 'g'],
  fibra: ['Fibra alimentar', 'g'], ca: ['Cálcio', 'mg'], fe: ['Ferro', 'mg'], zn: ['Zinco', 'mg'],
  vitA: ['Vitamina A (RAE)', 'µg'], vitC: ['Vitamina C', 'mg'], na: ['Sódio', 'mg'], mg: ['Magnésio', 'mg'], k: ['Potássio', 'mg']
};

// IMC e classificação IMC/idade pelo escore-z informado (OMS)
export function imc(peso, estaturaCm) {
  if (!(peso > 0) || !(estaturaCm > 0)) return null;
  return Math.round(peso / ((estaturaCm / 100) ** 2) * 10) / 10;
}

export function classificaImcIdade(z, anos) {
  if (z === '' || z == null || Number.isNaN(Number(z))) return '';
  z = Number(z);
  const menor5 = anos < 5;
  if (z < -3) return 'Magreza acentuada';
  if (z < -2) return 'Magreza';
  if (z <= 1) return 'Eutrofia';
  if (z <= 2) return menor5 ? 'Risco de sobrepeso' : 'Sobrepeso';
  if (z <= 3) return menor5 ? 'Sobrepeso' : 'Obesidade';
  return menor5 ? 'Obesidade' : 'Obesidade grave';
}

export function classificaEstaturaIdade(z) {
  if (z === '' || z == null || Number.isNaN(Number(z))) return '';
  z = Number(z);
  if (z < -3) return 'Muito baixa estatura para a idade';
  if (z < -2) return 'Baixa estatura para a idade';
  return 'Estatura adequada para a idade';
}

// Triagem: seletividade x dificuldade alimentar (Toomey & Ross, Abordagem SOS).
// Não é diagnóstico; orienta a investigação e o encaminhamento multiprofissional.
export const sinaisProblemFeeder = [
  ['menos20', 'Aceita menos de 20 alimentos de forma consistente'],
  ['naoRecupera', 'Alimentos abandonados por "enjoo" não voltam a ser aceitos, mesmo após pausa'],
  ['crise', 'Chora, grita ou entra em crise quando um alimento novo é apresentado'],
  ['categorias', 'Recusa categorias inteiras (ex.: todas as carnes, frutas ou verduras)'],
  ['separado', 'Quase sempre come alimentos diferentes da família ou em outro horário/lugar'],
  ['persistente', 'Relato persistente de "come mal" em várias consultas de puericultura'],
  ['mais25', 'Precisa de mais de 25 passos/exposições para aceitar um alimento novo']
];

export function triagemSeletividade(respostas, repertorio) {
  const marcados = sinaisProblemFeeder.filter(([id]) => respostas?.[id]).length;
  const n = Number(repertorio) || 0;
  if (!marcados && !n) return { nivel: 'vazio', texto: 'Marque o repertório e os sinais da triagem para ver a interpretação.' };
  if (marcados >= 3 || (n > 0 && n < 20)) return { nivel: 'alto', texto: 'Perfil compatível com dificuldade alimentar importante ("problem feeder"). Considerar avaliação multiprofissional (fonoaudiologia, terapia ocupacional, pediatria/gastro) e investigar TARE/ARFID.' };
  if (marcados >= 1 || (n >= 20 && n < 30)) return { nivel: 'medio', texto: 'Seletividade alimentar com sinais de atenção. Acompanhar repertório e evolução das exposições.' };
  return { nivel: 'baixo', texto: 'Perfil compatível com seletividade típica da infância ("picky eater"). Manter exposições positivas e repetidas.' };
}

// Escada do comer (hierarquia sensorial usada na terapia alimentar)
export const escadaDoComer = ['Tolerar', 'Interagir', 'Cheirar', 'Tocar', 'Provar', 'Comer'];
