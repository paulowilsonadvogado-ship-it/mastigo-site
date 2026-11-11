// Cálculo dos escores-z da OMS (método LMS) e gráfico de crescimento.
// Fórmula: z = ((y/M)^L − 1) / (L·S). Para indicadores baseados em peso (peso/idade, IMC/idade),
// valores além de ±3 usam o ajuste recomendado pela OMS (distância entre −3/−2 ou +2/+3 DP).
// 0–5 anos (até 1.826 dias): WHO Child Growth Standards 2006. 5–19 anos: WHO Reference 2007
// (peso/idade só até 10 anos). Comprimento deitado até 2 anos; estatura em pé a partir de 2 anos.
import { whoLMS } from './who-lms.js?v=6c90e3e';

const DIA_MES = 30.4375;

function interpolar(tabela, x) {
  if (!tabela?.length || x < tabela[0][0] || x > tabela.at(-1)[0]) return null;
  let i = 0; while (i < tabela.length - 1 && tabela[i + 1][0] < x) i++;
  const a = tabela[i], b = tabela[Math.min(i + 1, tabela.length - 1)];
  if (b[0] === a[0]) return { L: a[1], M: a[2], S: a[3] };
  const t = (x - a[0]) / (b[0] - a[0]);
  return { L: a[1] + (b[1] - a[1]) * t, M: a[2] + (b[2] - a[2]) * t, S: a[3] + (b[3] - a[3]) * t };
}

const valorNoZ = ({ L, M, S }, z) => L === 0 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L);

export function zLMS(y, lms, ajustar) {
  const { L, M, S } = lms;
  let z = L === 0 ? Math.log(y / M) / S : (Math.pow(y / M, L) - 1) / (L * S);
  if (ajustar && z > 3) { const sd3 = valorNoZ(lms, 3), sd2 = valorNoZ(lms, 2); z = 3 + (y - sd3) / (sd3 - sd2); }
  if (ajustar && z < -3) { const sd3 = valorNoZ(lms, -3), sd2 = valorNoZ(lms, -2); z = -3 + (y - sd3) / (sd2 - sd3); }
  return z;
}

// indicador: 'imc' | 'est' | 'peso' | 'pc'; sexo 'M'/'F'; idadeDias inteiro
export function parametros(indicador, sexo, idadeDias) {
  const s = sexo === 'F' ? '2' : '1';
  if (idadeDias <= 1826) return interpolar(whoLMS[indicador]?.[s], idadeDias);
  if (indicador === 'pc') return null;
  return interpolar(whoLMS[indicador + '5']?.[s], idadeDias / DIA_MES);
}

export function escoreZ(indicador, sexo, idadeDias, valor) {
  if (!(valor > 0) || !(idadeDias >= 0) || !sexo) return null;
  const lms = parametros(indicador, sexo, idadeDias);
  if (!lms) return null;
  return Math.round(zLMS(valor, lms, indicador !== 'est') * 100) / 100;
}

export function idadeEmDias(nascimento, data = new Date().toLocaleDateString('sv-SE')) {
  if (!nascimento) return null;
  const d = (new Date(data + 'T12:00:00') - new Date(nascimento + 'T12:00:00')) / 86400000;
  return d >= 0 ? Math.round(d) : null;
}

// Todos os escores de uma avaliação
export function avaliar({ sexo, nascimento, data, peso, estatura, pc }) {
  const dias = idadeEmDias(nascimento, data);
  if (dias == null || !sexo) return null;
  const p = Number(peso), e = Number(estatura), imc = p > 0 && e > 0 ? p / ((e / 100) ** 2) : null;
  return {
    dias,
    zImc: imc ? escoreZ('imc', sexo, dias, imc) : null,
    zEst: e > 0 ? escoreZ('est', sexo, dias, e) : null,
    zPeso: p > 0 ? escoreZ('peso', sexo, dias, p) : null,
    zPc: Number(pc) > 0 ? escoreZ('pc', sexo, dias, Number(pc)) : null
  };
}

// Gráfico SVG de crescimento (curvas −3 a +3 escores-z da OMS com os pontos da criança)
export function graficoCrescimento({ indicador, sexo, pontos, titulo, unidade }) {
  if (!sexo || !pontos.length) return '';
  const idades = pontos.map(p => p.dias);
  const maxDias = Math.min(6940, Math.max(...idades) + 365), minDias = Math.max(0, Math.min(...idades) - 365);
  const passos = 60, xs = Array.from({ length: passos + 1 }, (_, i) => minDias + (maxDias - minDias) * i / passos);
  const curvas = [-3, -2, 0, 2, 3].map(z => ({ z, pts: xs.map(x => { const l = parametros(indicador, sexo, Math.round(x)); return l ? [x, valorNoZ(l, z)] : null; }).filter(Boolean) }));
  const ys = [...curvas.flatMap(c => c.pts.map(p => p[1])), ...pontos.map(p => p.valor)];
  if (!ys.length) return '';
  const yMin = Math.floor(Math.min(...ys) * 0.95), yMax = Math.ceil(Math.max(...ys) * 1.03);
  const W = 560, H = 300, m = { l: 44, r: 54, t: 16, b: 34 };
  const X = x => m.l + (x - minDias) / (maxDias - minDias || 1) * (W - m.l - m.r), Y = y => H - m.b - (y - yMin) / (yMax - yMin || 1) * (H - m.t - m.b);
  const cor = { '-3': '#e5195e', '-2': '#ff9800', '0': '#0aa86b', '2': '#ff9800', '3': '#e5195e' };
  const anosTick = []; for (let a = Math.ceil(minDias / 365.25); a * 365.25 <= maxDias; a++) anosTick.push(a);
  const yTicks = 5, passoY = (yMax - yMin) / yTicks;
  return `<svg class="grafico-cresc" viewBox="0 0 ${W} ${H}" role="img" aria-label="${titulo}: ${pontos.map(p => `${(p.dias / 365.25).toFixed(1)} anos, ${p.valor.toFixed(1)} ${unidade}`).join('; ')}">
<rect x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="#fbf9ff" rx="6"/>
${Array.from({ length: yTicks + 1 }, (_, i) => { const v = yMin + passoY * i; return `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="#ece6f7"/><text x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="10" fill="#8a7fa3">${v.toFixed(v < 30 ? 1 : 0)}</text>`; }).join('')}
${anosTick.map(a => `<line x1="${X(a * 365.25)}" x2="${X(a * 365.25)}" y1="${m.t}" y2="${H - m.b}" stroke="#ece6f7"/><text x="${X(a * 365.25)}" y="${H - m.b + 16}" text-anchor="middle" font-size="10" fill="#8a7fa3">${a}a</text>`).join('')}
${curvas.map(c => `<polyline fill="none" stroke="${cor[c.z]}" stroke-width="${c.z === 0 ? 2.2 : 1.4}" ${Math.abs(c.z) === 3 ? 'stroke-dasharray="4 3"' : ''} points="${c.pts.map(p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ')}"/><text x="${W - m.r + 4}" y="${Y(c.pts.at(-1)[1]) + 3}" font-size="10" fill="${cor[c.z]}">${c.z > 0 ? '+' : ''}${c.z}</text>`).join('')}
<polyline fill="none" stroke="#7b2ff7" stroke-width="2" points="${pontos.map(p => `${X(p.dias).toFixed(1)},${Y(p.valor).toFixed(1)}`).join(' ')}"/>
${pontos.map(p => `<circle cx="${X(p.dias).toFixed(1)}" cy="${Y(p.valor).toFixed(1)}" r="4.5" fill="#ff2e7e" stroke="#fff" stroke-width="1.5"><title>${(p.dias / 365.25).toFixed(1)} anos · ${p.valor.toFixed(1)} ${unidade}</title></circle>`).join('')}
<text x="${m.l}" y="${H - 4}" font-size="10" fill="#8a7fa3">Idade (anos) · curvas da OMS em escore-z</text></svg>`;
}
