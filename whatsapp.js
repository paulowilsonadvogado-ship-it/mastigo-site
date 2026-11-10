// Aviso aos pais pelo WhatsApp.
// Modo manual (funciona sem servidor): abre o WhatsApp da nutricionista com a mensagem pronta (link wa.me).
// Modo automático: o servidor envia pela API oficial (WhatsApp Business Cloud API) — ver server/whatsapp.mjs.
// Privacidade (LGPD e sigilo profissional): a mensagem só avisa que há novidades e traz o link do portal.
// Nenhum dado de saúde, conteúdo de prescrição ou PIN vai pelo WhatsApp.

// Tipos de novidade publicados no portal e como aparecem no aviso
export const tiposNovidade = {
  documento: { icone: '📄', aviso: 'nova prescrição / plano alimentar' },
  plano: { icone: '🍽️', aviso: 'plano alimentar atualizado' },
  metas: { icone: '🎯', aviso: 'metas da semana' },
  recado: { icone: '💬', aviso: 'recado da nutricionista' },
  retorno: { icone: '📸', aviso: 'resposta ao registro do diário' },
  escada: { icone: '🪜', aviso: 'escada do comer atualizada' },
  consulta: { icone: '📅', aviso: 'consulta agendada' }
};

// Aceita "(48) 99999-0000", "48999990000", "+55 48 99999-0000". Devolve só dígitos com 55, ou '' se inválido.
export function normalizarTelefone(valor) {
  let d = String(valor || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10 || d.length === 11) d = '55' + d;
  if (!/^55[1-9][0-9]\d{8,9}$/.test(d)) return '';
  // Celular brasileiro: 9 dígitos começando com 9 (fixo com 8 dígitos também é aceito pelo WhatsApp Business)
  const numero = d.slice(4);
  if (numero.length === 9 && numero[0] !== '9') return '';
  return d;
}

export function formatarTelefone(d) {
  if (!d) return '';
  const ddd = d.slice(2, 4), n = d.slice(4);
  return `+55 (${ddd}) ${n.length === 9 ? n.slice(0, 5) + '-' + n.slice(5) : n.slice(0, 4) + '-' + n.slice(4)}`;
}

// Resume as novidades por tipo, sem conteúdo clínico: "recado da nutricionista (2)"
export function resumoNovidades(novidades) {
  const cont = new Map();
  for (const n of novidades) cont.set(n.tipo, (cont.get(n.tipo) || 0) + 1);
  return [...cont].map(([tipo, q]) => {
    const t = tiposNovidade[tipo] || tiposNovidade.recado;
    return `${t.icone} ${t.aviso}${q > 1 ? ` (${q})` : ''}`;
  });
}

export function mensagemAviso({ responsavel, crianca, profissional, registro, novidades = [], link }) {
  const primeiro = s => String(s || '').trim().split(/\s+/)[0] || '';
  const itens = resumoNovidades(novidades);
  return [
    `Olá, ${primeiro(responsavel) || 'tudo bem'}! 👋`,
    itens.length ? `Há novidades sobre ${primeiro(crianca)} na Área da Família do Mastigô:` : `Passando para lembrar da Área da Família de ${primeiro(crianca)} no Mastigô.`,
    ...itens.map(i => `• ${i}`),
    '',
    link ? `Acesse: ${link}` : '',
    'Entre com seu e-mail e o seu PIN de acesso.',
    '',
    `${profissional || ''}${registro ? ' · ' + registro : ''}`.trim()
  ].filter((l, i, a) => l !== '' || (a[i - 1] !== '' && i > 0)).join('\n').trim();
}

export function linkWhatsApp(telefone, texto) {
  const d = normalizarTelefone(telefone);
  if (!d) return '';
  return `https://wa.me/${d}?text=${encodeURIComponent(texto)}`;
}
