// Módulo Financeiro do consultório (inspirado no controle financeiro de WebDiet, Dietbox, Nutrium e Practice Better).
import { uid, moeda, dataBR, mesAtual, somaMeses, nomeMes, extenso, imprimir, baixarCSV } from './util-nutri.js';

export const categoriasReceita = ['Consulta', 'Retorno', 'Pacote de acompanhamento', 'Avaliação de seletividade', 'Terapia alimentar (sessão)', 'Plano alimentar avulso', 'Teleconsulta', 'Convênio', 'Palestra / curso', 'Outras receitas'];
export const categoriasDespesa = ['Aluguel / sala', 'Software e assinaturas', 'Marketing e anúncios', 'Impostos e taxas', 'Contador', 'Anuidade CRN', 'Materiais e brinquedos terapêuticos', 'Alimentos para sessões', 'Cursos e congressos', 'Internet e telefone', 'Transporte', 'Taxas de cartão / maquininha', 'Outras despesas'];
export const formasPagamento = ['PIX', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Boleto', 'Transferência', 'Convênio'];

export function financeiroInicial() {
  return {
    servicos: [
      { id: 's1', nome: 'Primeira consulta (avaliação de seletividade)', valor: 350, duracao: 90 },
      { id: 's2', nome: 'Retorno', valor: 220, duracao: 50 },
      { id: 's3', nome: 'Sessão de terapia alimentar', valor: 180, duracao: 50 },
      { id: 's4', nome: 'Pacote mensal (4 sessões)', valor: 640, duracao: 50 },
      { id: 's5', nome: 'Consulta de suplementação', valor: 250, duracao: 60 }
    ],
    config: { reservaImpostos: 6, metaMensal: 8000 },
    lancamentos: [],
    proximoRecibo: 1
  };
}

export function statusLanc(l, hoje = new Date().toLocaleDateString('sv-SE')) {
  if (l.pagoEm) return l.tipo === 'receita' ? 'recebido' : 'pago';
  return l.vencimento < hoje ? 'vencido' : 'pendente';
}

const statusInfo = {
  recebido: ['Recebido', '#0a8f5a', '#dcfbe9'], pago: ['Pago', '#0a8f5a', '#dcfbe9'],
  pendente: ['Pendente', '#b26a00', '#fff1cc'], vencido: ['Vencido', '#c2185b', '#ffe0ec']
};

// Indicadores do mês (puro, testável)
export function resumoMes(lancamentos, ym, reservaPct = 0) {
  const doMes = lancamentos.filter(l => (l.pagoEm || l.vencimento || '').startsWith(ym) || (!l.pagoEm && l.vencimento?.startsWith(ym)));
  const rec = doMes.filter(l => l.tipo === 'receita'), desp = doMes.filter(l => l.tipo === 'despesa');
  const soma = arr => Math.round(arr.reduce((t, l) => t + (Number(l.valor) || 0), 0) * 100) / 100;
  const recebido = soma(rec.filter(l => l.pagoEm?.startsWith(ym)));
  const aReceber = soma(rec.filter(l => !l.pagoEm));
  const despesasPagas = soma(desp.filter(l => l.pagoEm?.startsWith(ym)));
  const aPagar = soma(desp.filter(l => !l.pagoEm));
  const pagos = rec.filter(l => l.pagoEm?.startsWith(ym));
  return {
    recebido, aReceber, despesasPagas, aPagar,
    saldo: Math.round((recebido - despesasPagas) * 100) / 100,
    previsto: Math.round((recebido + aReceber - despesasPagas - aPagar) * 100) / 100,
    ticket: pagos.length ? Math.round(recebido / pagos.length * 100) / 100 : 0,
    reserva: Math.round(recebido * reservaPct) / 100,
    atendimentos: pagos.length
  };
}

export function createFinanceiro(ctx) {
  const { esc, icon, heading, button, stat, toast, modal, close } = ctx;
  let mes = mesAtual(), filtro = 'todos';
  const fin = () => ctx.state.financeiro;
  const hoje = () => new Date().toLocaleDateString('sv-SE');
  const nomePaciente = id => ctx.state.patients.find(p => p.id === id)?.name || '';

  function listaDoMes() {
    return fin().lancamentos.filter(l => {
      const ref = l.pagoEm || l.vencimento;
      const noMes = ref?.startsWith(mes) || (!l.pagoEm && l.vencimento?.startsWith(mes));
      const st = statusLanc(l);
      if (filtro === 'receitas') return noMes && l.tipo === 'receita';
      if (filtro === 'despesas') return noMes && l.tipo === 'despesa';
      if (filtro === 'pendentes') return !l.pagoEm && (noMes || st === 'pendente');
      if (filtro === 'vencidos') return st === 'vencido';
      return noMes;
    }).sort((a, b) => (a.pagoEm || a.vencimento).localeCompare(b.pagoEm || b.vencimento));
  }

  function barras(lista, cor) {
    const porCat = {};
    lista.forEach(l => { porCat[l.categoria] = (porCat[l.categoria] || 0) + Number(l.valor); });
    const itens = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...itens.map(i => i[1]));
    return itens.length ? `<div class="progress-wrap">${itens.map(([c, v]) => `<div class="bar-label"><span>${esc(c)}</span><b>${moeda(v)}</b></div><div class="track"><span style="width:${v / max * 100}%;background:${cor}"></span></div>`).join('')}</div>` : '<div class="empty">Sem lançamentos neste mês.</div>';
  }

  function fluxo() {
    const meses = Array.from({ length: 6 }, (_, i) => somaMeses(mes + '-15', i - 5).slice(0, 7));
    const dados = meses.map(m => resumoMes(fin().lancamentos, m));
    const max = Math.max(1, ...dados.map(d => Math.max(d.recebido, d.despesasPagas)));
    return `<div class="fin-chart" role="img" aria-label="${meses.map((m, i) => `${nomeMes(m)}: recebido ${moeda(dados[i].recebido)}, despesas ${moeda(dados[i].despesasPagas)}`).join('; ')}">${meses.map((m, i) => `<div class="fin-col"><div class="fin-bars"><span class="r" style="height:${dados[i].recebido / max * 120}px" title="Recebido ${moeda(dados[i].recebido)}"></span><span class="d" style="height:${dados[i].despesasPagas / max * 120}px" title="Despesas ${moeda(dados[i].despesasPagas)}"></span></div><small>${new Date(m + '-15T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small></div>`).join('')}</div><div class="fin-legend"><span><i class="r"></i>Recebido</span><span><i class="d"></i>Despesas pagas</span></div>`;
  }

  function semCobranca() {
    const ids = new Set(fin().lancamentos.map(l => l.agendamento).filter(Boolean));
    return ctx.state.appointments.filter(a => a.date <= hoje() && !ids.has(a.id)).slice(-6);
  }

  function page() {
    const f = fin(), r = resumoMes(f.lancamentos, mes, f.config.reservaImpostos);
    const vencidos = f.lancamentos.filter(l => l.tipo === 'receita' && statusLanc(l) === 'vencido');
    const lista = listaDoMes();
    const pend = semCobranca();
    const meta = Number(f.config.metaMensal) || 0;
    const pctMeta = meta ? Math.min(100, Math.round(r.recebido / meta * 100)) : 0;
    return heading('Financeiro do consultório', 'Receitas, despesas, cobranças e recibos em um só lugar.',
      `${button('Serviços e preços', 'fin-servicos', 'settings')}${button('Nova despesa', 'fin-nova-despesa', 'plus')}${button('Nova receita', 'fin-nova-receita', 'plus', true)}`) +
      `<div class="toolbar fin-toolbar"><label class="field-inline">${icon('calendar')}<input type="month" id="fin-mes" value="${mes}" aria-label="Mês de referência"></label><div class="chips" role="group" aria-label="Filtro">${[['todos', 'Todos'], ['receitas', 'Receitas'], ['despesas', 'Despesas'], ['pendentes', 'A receber / a pagar'], ['vencidos', 'Vencidos']].map(([id, l]) => `<button class="chip ${filtro === id ? 'active' : ''}" data-fin-filtro="${id}" aria-pressed="${filtro === id}">${l}</button>`).join('')}</div>${button('Exportar planilha', 'fin-exportar', 'download')}</div>` +
      `<section class="stats">${stat('Recebido no mês', moeda(r.recebido), `${r.atendimentos} pagamento(s) · ${nomeMes(mes)}`, 'check', 'mint')}${stat('A receber', moeda(r.aReceber), 'Pendente neste mês', 'clock', 'yellow')}${stat('Despesas pagas', moeda(r.despesasPagas), `A pagar: ${moeda(r.aPagar)}`, 'download', 'peach')}${stat('Saldo do mês', moeda(r.saldo), `Previsto: ${moeda(r.previsto)}`, 'chart', r.saldo >= 0 ? 'lilac' : 'peach')}</section>` +
      `<section class="stats">${stat('Ticket médio', moeda(r.ticket), 'Por pagamento recebido', 'heart', 'pink')}${stat('Em atraso (total)', moeda(vencidos.reduce((t, l) => t + Number(l.valor), 0)), `${vencidos.length} cobrança(s) vencida(s)`, 'bell', 'orange')}${stat('Reserva para impostos', moeda(r.reserva), `${f.config.reservaImpostos}% do recebido`, 'lock', 'blue')}<div class="stat"><div style="flex:1"><div class="stat-label">Meta do mês</div><div class="number">${pctMeta}%</div><div class="track"><span style="width:${pctMeta}%;background:linear-gradient(90deg,#7b2ff7,#ff4d8d)"></span></div><small>${moeda(r.recebido)} de ${moeda(meta)}</small></div></div></section>` +
      `<section class="card" style="margin-bottom:23px"><div class="card-head"><div><h2>Lançamentos</h2><p>${nomeMes(mes)} · ${lista.length} registro(s)</p></div></div><div class="table-wrap"><table class="fin-table"><thead><tr><th>DATA</th><th>DESCRIÇÃO</th><th>CATEGORIA</th><th>FORMA</th><th>VALOR</th><th>SITUAÇÃO</th><th><span class="sr-only">Ações</span></th></tr></thead><tbody>${lista.map(linha).join('')}</tbody></table>${lista.length ? '' : '<div class="empty">Nenhum lançamento para este filtro.</div>'}</div></section>` +
      `<div class="fin-grid"><section class="card"><div class="card-head"><div><h2>Fluxo dos últimos 6 meses</h2><p>Recebido x despesas pagas</p></div></div>${fluxo()}</section>` +
      `${pend.length ? `<section class="card"><div class="card-head"><div><h2>Atendimentos sem cobrança</h2><p>Gere a cobrança a partir da agenda</p></div></div>${pend.map(a => `<div class="appointment"><time>${dataBR(a.date).slice(0, 5)}</time><div style="flex:1"><strong>${esc(nomePaciente(a.patient))}</strong><p>${esc(a.type)}</p></div><button class="button small" data-fin-cobrar="${esc(a.id)}">${icon('plus')}Cobrar</button></div>`).join('')}</section>` : ''}` +
      `<section class="card"><div class="card-head"><h2>Receitas por categoria</h2></div>${barras(fin().lancamentos.filter(l => l.tipo === 'receita' && l.pagoEm?.startsWith(mes)), 'linear-gradient(90deg,#00c2a8,#1e9bff)')}</section>` +
      `<section class="card"><div class="card-head"><h2>Despesas por categoria</h2></div>${barras(fin().lancamentos.filter(l => l.tipo === 'despesa' && (l.pagoEm || l.vencimento).startsWith(mes)), 'linear-gradient(90deg,#ff8a1f,#ff4d8d)')}</section></div>` +
      `<p class="helper">O controle financeiro apoia a gestão do consultório e não substitui a escrituração contábil nem a emissão de nota fiscal. Confirme o percentual de impostos com seu contador.</p>`;
  }

  function linha(l) {
    const st = statusLanc(l), [rot, cor, bg] = statusInfo[st];
    const pac = l.paciente ? `<small>${esc(nomePaciente(l.paciente))}</small>` : '';
    return `<tr><td>${dataBR(l.pagoEm || l.vencimento)}${!l.pagoEm ? '<br><small>vence</small>' : ''}</td><td><strong>${esc(l.descricao)}</strong>${l.parcela ? ` <small>(${esc(l.parcela)})</small>` : ''}<br>${pac}</td><td>${esc(l.categoria)}</td><td>${esc(l.forma)}</td><td class="${l.tipo === 'receita' ? 'valor-mais' : 'valor-menos'}">${l.tipo === 'receita' ? '+' : '−'} ${moeda(l.valor)}</td><td><span class="pill" style="color:${cor};background:${bg}">${rot}</span></td><td><div class="acoes">${!l.pagoEm ? `<button class="button small primary" data-fin-baixar="${esc(l.id)}">${icon('check')}${l.tipo === 'receita' ? 'Receber' : 'Pagar'}</button>` : ''}${l.tipo === 'receita' && l.pagoEm ? `<button class="button small" data-fin-recibo="${esc(l.id)}">${icon('book')}Recibo</button>` : ''}<button class="icon-button" data-fin-editar="${esc(l.id)}" aria-label="Editar ${esc(l.descricao)}">${icon('pen')}</button></div></td></tr>`;
  }

  function form(tipo, l = {}, extra = {}) {
    const cats = tipo === 'receita' ? categoriasReceita : categoriasDespesa;
    const v = { descricao: '', categoria: cats[0], valor: '', vencimento: hoje(), forma: 'PIX', paciente: '', obs: '', ...extra, ...l };
    const novo = !l.id;
    modal(novo ? (tipo === 'receita' ? 'Nova receita' : 'Nova despesa') : 'Editar lançamento', `<form id="fin-form" data-tipo="${tipo}" data-id="${esc(l.id || '')}">
${tipo === 'receita' && novo ? `<div class="field"><label for="fin-servico">Serviço da tabela (opcional)</label><select id="fin-servico"><option value="">Selecionar serviço…</option>${fin().servicos.map(s => `<option value="${esc(s.id)}">${esc(s.nome)} · ${moeda(s.valor)}</option>`).join('')}</select></div>` : ''}
<div class="field"><label for="fin-desc">Descrição</label><input id="fin-desc" name="descricao" maxlength="120" required value="${esc(v.descricao)}"></div>
<div class="field-grid"><div class="field"><label for="fin-cat">Categoria</label><select id="fin-cat" name="categoria">${cats.map(c => `<option ${c === v.categoria ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
<div class="field"><label for="fin-valor">Valor (R$)</label><input id="fin-valor" name="valor" type="number" step="0.01" min="0.01" required value="${esc(v.valor)}"></div>
<div class="field"><label for="fin-venc">Vencimento</label><input id="fin-venc" name="vencimento" type="date" required value="${esc(v.vencimento)}"></div>
<div class="field"><label for="fin-forma">Forma de pagamento</label><select id="fin-forma" name="forma">${formasPagamento.map(f => `<option ${f === v.forma ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
${tipo === 'receita' ? `<div class="field"><label for="fin-pac">Paciente</label><select id="fin-pac" name="paciente"><option value="">Sem paciente vinculado</option>${ctx.state.patients.map(p => `<option value="${esc(p.id)}" ${p.id === v.paciente ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>` : ''}
${novo ? `<div class="field"><label for="fin-parcelas">Parcelas / repetir por (meses)</label><input id="fin-parcelas" name="parcelas" type="number" min="1" max="36" value="1"></div>` : ''}</div>
${novo ? `<div class="field"><label for="fin-modo">Como usar as repetições</label><select id="fin-modo" name="modo"><option value="parcelar">Dividir o valor em parcelas mensais</option><option value="repetir">Repetir o mesmo valor todo mês (despesa fixa, pacote mensal)</option></select></div>` : ''}
<label class="check"><input type="checkbox" name="pago" ${v.pagoEm ? 'checked' : ''}> Já ${tipo === 'receita' ? 'recebido' : 'pago'} em <input type="date" name="pagoEm" value="${esc(v.pagoEm || hoje())}" aria-label="Data do pagamento"></label>
<div class="field"><label for="fin-obs">Observações</label><textarea id="fin-obs" name="obs" maxlength="500">${esc(v.obs)}</textarea></div>
${v.agendamento ? `<input type="hidden" name="agendamento" value="${esc(v.agendamento)}">` : ''}
<div class="form-footer">${novo ? '<button type="button" class="button" data-action="close">Cancelar</button>' : `<button type="button" class="button danger" data-fin-excluir="${esc(l.id)}">Excluir</button>`}<button class="button primary" type="submit">${icon('check')}Salvar</button></div></form>`);
  }

  function servicos() {
    const f = fin();
    modal('Serviços, preços e metas', `<p>Cadastre os serviços que você oferece. Eles preenchem automaticamente as novas receitas.</p>
<div class="table-wrap"><table><thead><tr><th>SERVIÇO</th><th>VALOR</th><th>DURAÇÃO</th><th></th></tr></thead><tbody>${f.servicos.map(s => `<tr><td>${esc(s.nome)}</td><td>${moeda(s.valor)}</td><td>${s.duracao} min</td><td><button class="icon-button" data-fin-del-servico="${esc(s.id)}" aria-label="Remover ${esc(s.nome)}">${icon('close')}</button></td></tr>`).join('')}</tbody></table></div>
<form id="fin-servico-form" class="field-grid" style="margin-top:14px"><div class="field"><label for="sv-nome">Novo serviço</label><input id="sv-nome" name="nome" maxlength="80" required></div><div class="field"><label for="sv-valor">Valor (R$)</label><input id="sv-valor" name="valor" type="number" step="0.01" min="0" required></div><div class="field"><label for="sv-dur">Duração (min)</label><input id="sv-dur" name="duracao" type="number" min="10" max="240" value="50"></div><div class="field" style="align-self:end"><button class="button primary" type="submit">${icon('plus')}Adicionar</button></div></form>
<form id="fin-config-form" class="field-grid" style="margin-top:18px"><div class="field"><label for="cf-imp">Reserva para impostos (%)</label><input id="cf-imp" name="reservaImpostos" type="number" step="0.1" min="0" max="40" value="${f.config.reservaImpostos}"></div><div class="field"><label for="cf-meta">Meta de faturamento mensal (R$)</label><input id="cf-meta" name="metaMensal" type="number" step="50" min="0" value="${f.config.metaMensal}"></div><div class="field" style="align-self:end"><button class="button" type="submit">Salvar metas</button></div></form>
<div class="form-footer"><button class="button primary" data-action="close">Concluir</button></div>`);
  }

  function recibo(l) {
    const f = fin(), perfil = ctx.state.perfil, p = ctx.state.patients.find(x => x.id === l.paciente);
    if (!l.recibo) { l.recibo = f.proximoRecibo++; ctx.save(); }
    const pagador = p ? `${p.guardian ? esc(p.guardian) + ', responsável por ' : ''}${esc(p.name)}` : '______________________________';
    const cidade = perfil.cidade || '__________';
    const html = `<div class="recibo"><div class="recibo-topo">${perfil.logo ? `<img src="${perfil.logo}" alt="">` : ''}<div><h1>RECIBO Nº ${String(l.recibo).padStart(4, '0')}</h1><p class="recibo-valor">${moeda(l.valor)}</p></div></div>
<p>Recebi de <strong>${pagador}</strong> a importância de <strong>${moeda(l.valor)}</strong> (${extenso(Number(l.valor))}), referente a <strong>${esc(l.descricao)}</strong>${l.categoria ? ` (${esc(l.categoria)})` : ''}, paga em ${dataBR(l.pagoEm)} por ${esc(l.forma)}.</p>
<p>Para clareza, firmo o presente.</p><p class="recibo-data">${esc(cidade)}, ${new Date(l.pagoEm + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
<div class="assinatura"><span></span><strong>${esc(perfil.nome || ctx.state.professional)}</strong><small>Nutricionista${perfil.crn ? ` · CRN-${esc(perfil.regiaoCrn || '')} ${esc(perfil.crn)}` : ''}${perfil.documento ? ` · CPF/CNPJ ${esc(perfil.documento)}` : ''}</small>${perfil.endereco ? `<small>${esc(perfil.endereco)}${perfil.telefone ? ' · ' + esc(perfil.telefone) : ''}</small>` : ''}</div></div>`;
    if (!perfil.crn) toast('Dica: preencha seu CRN e documento em "Minha clínica" para o recibo sair completo.');
    imprimir(html, { titulo: `Recibo ${String(l.recibo).padStart(4, '0')}` });
  }

  function exportar() {
    const lista = listaDoMes();
    if (!lista.length) { toast('Não há lançamentos para exportar.'); return; }
    baixarCSV(`financeiro-${mes}.csv`, [['Tipo', 'Data de vencimento', 'Data de pagamento', 'Descrição', 'Paciente', 'Categoria', 'Forma', 'Valor', 'Situação', 'Observações'],
      ...lista.map(l => [l.tipo, l.vencimento, l.pagoEm, l.descricao, nomePaciente(l.paciente), l.categoria, l.forma, String(l.valor).replace('.', ','), statusInfo[statusLanc(l)][0], l.obs])]);
    toast('Planilha exportada.');
  }

  function onClick(el) {
    const d = el.dataset;
    if (d.finFiltro) { filtro = d.finFiltro; ctx.render(); return true; }
    if (d.finBaixar) { const l = fin().lancamentos.find(x => x.id === d.finBaixar); if (l) { l.pagoEm = hoje(); ctx.save(); ctx.render(); toast(l.tipo === 'receita' ? 'Pagamento recebido.' : 'Despesa paga.'); } return true; }
    if (d.finRecibo) { const l = fin().lancamentos.find(x => x.id === d.finRecibo); if (l) recibo(l); return true; }
    if (d.finEditar) { const l = fin().lancamentos.find(x => x.id === d.finEditar); if (l) form(l.tipo, l); return true; }
    if (d.finExcluir) { fin().lancamentos = fin().lancamentos.filter(x => x.id !== d.finExcluir); ctx.save(); close(); ctx.render(); toast('Lançamento excluído.'); return true; }
    if (d.finCobrar) {
      const a = ctx.state.appointments.find(x => x.id === d.finCobrar); if (!a) return true;
      const s = fin().servicos.find(x => /retorno/i.test(a.type) ? /retorno/i.test(x.nome) : /primeira/i.test(a.type) ? /primeira/i.test(x.nome) : /sess/i.test(x.nome)) || fin().servicos[0];
      form('receita', {}, { descricao: a.type, valor: s?.valor || '', vencimento: a.date, paciente: a.patient, categoria: /retorno/i.test(a.type) ? 'Retorno' : /primeira/i.test(a.type) ? 'Avaliação de seletividade' : 'Terapia alimentar (sessão)', agendamento: a.id });
      return true;
    }
    if (d.finDelServico) { fin().servicos = fin().servicos.filter(s => s.id !== d.finDelServico); ctx.save(); servicos(); return true; }
    switch (d.action) {
      case 'fin-nova-receita': form('receita'); return true;
      case 'fin-nova-despesa': form('despesa'); return true;
      case 'fin-servicos': servicos(); return true;
      case 'fin-exportar': exportar(); return true;
    }
    return false;
  }

  function onChange(e) {
    if (e.id === 'fin-mes' && e.value) { mes = e.value; ctx.render(); return true; }
    if (e.id === 'fin-servico') {
      const s = fin().servicos.find(x => x.id === e.value); if (!s) return true;
      document.getElementById('fin-desc').value = s.nome; document.getElementById('fin-valor').value = s.valor;
      const cat = /retorno/i.test(s.nome) ? 'Retorno' : /pacote/i.test(s.nome) ? 'Pacote de acompanhamento' : /primeira|avalia/i.test(s.nome) ? 'Avaliação de seletividade' : /suplement/i.test(s.nome) ? 'Consulta' : /sess/i.test(s.nome) ? 'Terapia alimentar (sessão)' : 'Consulta';
      document.getElementById('fin-cat').value = cat; return true;
    }
    return false;
  }

  function onSubmit(form, v) {
    if (form.id === 'fin-form') {
      const tipo = form.dataset.tipo, id = form.dataset.id, valor = Math.round(Number(v.valor) * 100) / 100;
      if (!v.descricao.trim() || !(valor > 0) || !v.vencimento) { toast('Preencha descrição, valor e vencimento.'); return true; }
      const base = { tipo, descricao: v.descricao.trim(), categoria: v.categoria, forma: v.forma, paciente: v.paciente || '', obs: (v.obs || '').trim(), agendamento: v.agendamento || '' };
      if (id) {
        const l = fin().lancamentos.find(x => x.id === id);
        Object.assign(l, base, { valor, vencimento: v.vencimento, pagoEm: v.pago ? v.pagoEm || hoje() : '' });
      } else {
        const n = Math.max(1, Math.min(36, Number(v.parcelas) || 1)), repetir = v.modo === 'repetir';
        const parcela = repetir ? valor : Math.floor(valor / n * 100) / 100;
        const grupo = n > 1 ? uid() : '';
        for (let i = 0; i < n; i++) {
          const val = repetir ? valor : (i === n - 1 ? Math.round((valor - parcela * (n - 1)) * 100) / 100 : parcela);
          fin().lancamentos.push({ id: uid(), ...base, valor: val, vencimento: somaMeses(v.vencimento, i), pagoEm: v.pago && i === 0 ? v.pagoEm || hoje() : '', parcela: n > 1 ? `${i + 1}/${n}` : '', grupo });
        }
      }
      ctx.save(); close(); ctx.render(); toast('Lançamento salvo.'); return true;
    }
    if (form.id === 'fin-servico-form') {
      if (!v.nome.trim()) return true;
      fin().servicos.push({ id: uid(), nome: v.nome.trim(), valor: Number(v.valor) || 0, duracao: Number(v.duracao) || 50 });
      ctx.save(); servicos(); toast('Serviço adicionado.'); return true;
    }
    if (form.id === 'fin-config-form') {
      fin().config.reservaImpostos = Math.max(0, Math.min(40, Number(v.reservaImpostos) || 0));
      fin().config.metaMensal = Math.max(0, Number(v.metaMensal) || 0);
      ctx.save(); close(); ctx.render(); toast('Metas salvas.'); return true;
    }
    return false;
  }

  return { page, onClick, onChange, onSubmit };
}
