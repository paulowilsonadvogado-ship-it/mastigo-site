// Utilidades compartilhadas pelos módulos de consultório (Financeiro, Anamnese, Plano, Prescrição).

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2));

export const moeda = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const num = (v, casas = 1) => {
  if (v == null || Number.isNaN(Number(v))) return '–';
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });
};

export const dataBR = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '–';

export const mesAtual = () => new Date().toLocaleDateString('sv-SE').slice(0, 7);

export function somaMeses(data, n) {
  const d = new Date(data + 'T12:00:00');
  const dia = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + n);
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(dia, ultimo));
  return d.toLocaleDateString('sv-SE');
}

export function nomeMes(ym) {
  const [a, m] = ym.split('-').map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

// Valor por extenso em reais (até 999.999.999,99)
export function extenso(valor) {
  const u = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const d = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const c = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  const ate999 = n => {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    const partes = [];
    const ce = Math.floor(n / 100), r = n % 100;
    if (ce) partes.push(c[ce]);
    if (r) partes.push(r < 20 ? u[r] : d[Math.floor(r / 10)] + (r % 10 ? ' e ' + u[r % 10] : ''));
    return partes.join(' e ');
  };
  const inteiro = Math.floor(Math.round(valor * 100) / 100);
  const centavos = Math.round((valor - inteiro) * 100);
  const milhoes = Math.floor(inteiro / 1e6), milhares = Math.floor((inteiro % 1e6) / 1000), resto = inteiro % 1000;
  const grupos = [];
  if (milhoes) grupos.push(ate999(milhoes) + (milhoes === 1 ? ' milhão' : ' milhões'));
  if (milhares) grupos.push(milhares === 1 ? 'mil' : ate999(milhares) + ' mil');
  if (resto) grupos.push(ate999(resto));
  let texto = '';
  grupos.forEach((g, i) => {
    if (i === 0) texto = g;
    else {
      const ultimo = i === grupos.length - 1;
      texto += (ultimo && (resto < 100 || resto % 100 === 0) ? ' e ' : (ultimo ? ' ' : ', ')) + g;
    }
  });
  if (inteiro) texto += (milhoes && !milhares && !resto ? ' de' : '') + (inteiro === 1 ? ' real' : ' reais');
  if (centavos) texto += (inteiro ? ' e ' : '') + ate999(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
  return texto || 'zero real';
}

// Impressão: monta o conteúdo em #print-root e chama a janela de impressão (Salvar como PDF).
export function imprimir(html, { pagina = 'margin:12mm', titulo = 'Mastigô' } = {}) {
  let root = document.getElementById('print-root');
  if (!root) { root = document.createElement('div'); root.id = 'print-root'; document.body.appendChild(root); }
  let estilo = document.getElementById('print-page-style');
  if (!estilo) { estilo = document.createElement('style'); estilo.id = 'print-page-style'; document.head.appendChild(estilo); }
  estilo.textContent = `@page{size:A4;${pagina}}`;
  root.innerHTML = html;
  const tituloAntes = document.title;
  document.title = titulo;
  document.body.classList.add('printing');
  const fim = () => { document.body.classList.remove('printing'); document.title = tituloAntes; window.removeEventListener('afterprint', fim); };
  window.addEventListener('afterprint', fim);
  // Espera imagens (logo/timbrado) carregarem antes de imprimir
  const imgs = [...root.querySelectorAll('img')].filter(i => !i.complete);
  Promise.all(imgs.map(i => new Promise(r => { i.onload = i.onerror = r; }))).then(() => setTimeout(() => { window.print(); setTimeout(fim, 1500); }, 60));
}

// Reduz imagens enviadas (logo, timbrado) para caberem no armazenamento do navegador.
export function lerImagem(arquivo, larguraMax = 1240, qualidade = 0.82) {
  return new Promise((resolve, reject) => {
    if (!arquivo || !/^image\/(png|jpe?g|webp)$/.test(arquivo.type)) { reject(new Error('Envie uma imagem PNG, JPG ou WEBP.')); return; }
    if (arquivo.size > 15 * 1024 * 1024) { reject(new Error('Imagem muito grande (máximo 15 MB).')); return; }
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Arquivo de imagem inválido.'));
      img.onload = () => {
        const escala = Math.min(1, larguraMax / img.width);
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * escala); cv.height = Math.round(img.height * escala);
        const g = cv.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
        g.drawImage(img, 0, 0, cv.width, cv.height);
        const png = arquivo.type === 'image/png' && cv.width * cv.height < 400000;
        resolve(cv.toDataURL(png ? 'image/png' : 'image/jpeg', qualidade));
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

export const csvCelula = v => `"${String(v ?? '').replace(/^[=+@\-\t\r]/, "'$&").replace(/"/g, '""')}"`;

export function baixarCSV(nome, linhas) {
  const url = URL.createObjectURL(new Blob(['﻿' + linhas.map(r => r.map(csvCelula).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Dados do profissional usados em recibos, prescrições e prontuário
export function perfilPadrao(state) {
  return {
    nome: state.professional || '', crn: '', regiaoCrn: '', documento: '', telefone: '', email: '', endereco: '', cidade: '', instagram: '',
    logo: '', corPrincipal: '#7b2ff7', corDestaque: '#ff4d8d',
    template: { imagem: '', margemTopo: 45, margemBase: 30, margemLateral: 20 }
  };
}
