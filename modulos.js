// Agrega os módulos de consultório de nutrição ao app principal.
import { createFinanceiro, financeiroInicial } from './financeiro.js';
import { createAnamnese } from './anamnese.js';
import { createPlano } from './plano.js';
import { createPrescricao } from './prescricao.js';
import { createPortal } from './portal.js';
import { createBiblioteca } from './biblioteca.js';
import { perfilPadrao, lerImagem, uid } from './util-nutri.js';

export const paginasOcultas = { entrar: 'Área da família' };

export const paginasConsultorio = {
  anamnese: ['Anamnese', 'clipboard'],
  plano: ['Plano alimentar', 'plate'],
  prescricao: ['Prescrição', 'pen'],
  familias: ['Portal da família', 'heart'],
  financeiro: ['Financeiro', 'money']
};

// Exemplo fictício para a demonstração (criança p1)
function anamneseDemo() {
  const d = new Date(); d.setMonth(d.getMonth() - 53);
  return { sexo: 'M', nascimento: d.toLocaleDateString('sv-SE'), peso: '17', estatura: '104', zImc: '0.4', zEst: '-0.2', dataAvaliacao: new Date().toLocaleDateString('sv-SE'),
    queixa: 'Aceita poucos alimentos; recusa verduras e alimentos misturados. Come melhor com a família à mesa.', diagnosticos: ['TEA (autismo)', 'Constipação intestinal'], terapias: ['Fonoaudiologia', 'Terapia ocupacional / integração sensorial'],
    comportamento: ['telas', 'mistura', 'marca'], texturasAceitas: ['Crocantes secos (biscoito, chips)', 'Macios em pedaços'], texturasRecusadas: ['Mistos (sopa com pedaços, iogurte com fruta)', 'Fibrosos (carne, folhas)'],
    repertorio: ['banana', 'maca', 'arroz', 'feijao-carioca', 'batata', 'pao-frances', 'ovo', 'frango', 'iogurte-natural', 'queijo-minas', 'cenoura', 'mamao'], outrosAceitos: 'biscoito de polvilho, pão de queijo',
    triagem: { categorias: true, separado: false }, bristol: '2', evacuacoes: '3', sono: '10', evolucoes: [] };
}
function planoDemo() {
  const i = (food, g, medida = '') => ({ id: uid(), food, g, medida, subs: [] });
  return { atividade: 'pouco', vetMeta: '', dist: { cho: 55, ptn: 15, lip: 30 }, orientacoes: 'Refeições à mesa, com a família e sem telas\nOferecer água entre as refeições\nApresentar o alimento novo em um pratinho separado, sem insistir\nNão usar comida como prêmio ou castigo',
    alvos: [{ food: 'brocolis', etapa: 2 }, { food: 'morango', etapa: 0 }],
    refeicoes: [
      { id: uid(), nome: 'Café da manhã', horario: '07:30', texto: '', itens: [i('t53', 50, '1 unidade'), i('t461', 20, '1 fatia fina'), i('t182', 60, '1 unidade pequena')] },
      { id: uid(), nome: 'Lanche da manhã', horario: '09:30', texto: 'Pode ser servido na escola.', itens: [i('t226', 100, '1 fatia média'), i('t7', 10, '1 col. sopa')] },
      { id: uid(), nome: 'Almoço', horario: '12:00', texto: 'Servir os alimentos separados no prato, sem encostar.', itens: [i('t3', 100, '4 col. sopa'), i('t561', 80, '1 concha pequena'), i('t410', 50, '1 filé pequeno'), i('t109', 30, '3 rodelas'), i('t91', 60, '1 unidade pequena')] },
      { id: uid(), nome: 'Lanche da tarde', horario: '15:30', texto: '', itens: [i('t222', 100, '1 unidade pequena'), i('t448', 120, '1 pote')] },
      { id: uid(), nome: 'Jantar', horario: '19:00', texto: 'Brócolis em pratinho separado, só para conhecer.', itens: [i('t3', 100, '4 col. sopa'), i('t561', 80, '1 concha pequena'), i('t488', 50, '1 unidade'), i('t100', 20, '2 floretes')] }
    ] };
}

export function createModulos(ctx) {
  // Criança selecionada: uma só para o sistema todo (o app.js liga ao seletor das telas antigas)
  if (!ctx.sel) ctx.sel = { id: null };
  const financeiro = createFinanceiro(ctx), anamnese = createAnamnese(ctx), plano = createPlano(ctx), prescricao = createPrescricao(ctx, plano);
  const portal = createPortal(ctx, plano), biblioteca = createBiblioteca(ctx);
  ctx.publicarFamilia = portal.publicar;
  ctx.abrirBiblioteca = aba => biblioteca.abrir(aba);
  const modulos = [portal, biblioteca, financeiro, anamnese, plano, prescricao];
  const renderizadores = { financeiro: financeiro.page, anamnese: anamnese.page, plano: plano.page, prescricao: prescricao.page, familias: portal.page };

  function garantirEstado() {
    const s = ctx.state;
    if (!s.financeiro) s.financeiro = financeiroInicial();
    if (!s.perfil) s.perfil = perfilPadrao(s);
    if (!s.perfil.template) s.perfil.template = perfilPadrao(s).template;
    if (!s.anamneses) { s.anamneses = {}; if (s.patients.some(p => p.id === 'p1')) s.anamneses.p1 = anamneseDemo(); }
    if (!s.planos) { s.planos = {}; if (s.anamneses.p1) s.planos.p1 = planoDemo(); }
    if (!s.prescricoes) s.prescricoes = [];
    if (!s.alimentosProprios) s.alimentosProprios = [];
    if (!s.acessos) s.acessos = {};
    if (!s.acessos.p1 && !s.acessoDemoCriado) {
      s.acessoDemoCriado = true;
      // Acesso de demonstração (fictício) para testar a área dos pais: familia@demo.com / PIN 123456
      if (s.patients.some(p => p.id === 'p1')) s.acessos.p1 = { nome: 'Marina', email: 'familia@demo.com', sal: 'demo-pipoca', pinHash: '5959ade8fbacf4ce043a6bad44edb2323bea4e9ea4faad9027d83ed383c8bf40', ativo: true, demo: true, criadoEm: new Date().toISOString(), compartilhar: { plano: true, escada: true, diario: true, questionario: true, consultas: true } };
      if (s.acessos.p1) {
        s.atualizacoes = s.atualizacoes || [];
        s.atualizacoes.push({ id: uid(), paciente: 'p1', tipo: 'recado', titulo: 'Boas-vindas à Área da Família!', texto: 'Aqui vocês acompanham as orientações, as metas da semana e as conquistas do Theo. Respondam o questionário pré-consulta e registrem as descobertas no diário — pode mandar foto do prato!', criadoEm: new Date().toISOString(), lidoEm: '' });
        s.metas = s.metas || {};
        if (!s.metas.p1) s.metas.p1 = { itens: [{ id: uid(), texto: 'Refeição à mesa, sem telas' }, { id: uid(), texto: 'Brócolis no pratinho separado, sem insistir' }, { id: uid(), texto: 'Água entre as refeições' }], marcacoes: {} };
      }
    }
    if (!s.atualizacoes) s.atualizacoes = [];
    if (!s.modelosPlano) s.modelosPlano = [];
    if (!s.whatsapp) s.whatsapp = { perguntar: true, modo: 'manual' };
    if (s.perfil.clinica == null) s.perfil.clinica = s.clinic || '';
    if (!s.perfil.nome && s.professional) s.perfil.nome = s.professional;
  }

  // Cartões extras em "Minha clínica": dados profissionais (recibos, prescrições, prontuário)
  function cartoesConfiguracao() {
    const p = ctx.state.perfil, e = ctx.esc;
    const w = ctx.state.whatsapp;
    return `<form id="perfil-form" class="card"><h2>Clínica e dados profissionais</h2><p>Aparecem no menu, nos recibos, nas prescrições, no prontuário (Res. CFN 594/2017 e 304/2003) e nos avisos às famílias.</p>
<div class="field-grid"><div class="field"><label for="pf-clinica">Nome da clínica / consultório</label><input id="pf-clinica" name="clinica" maxlength="60" value="${e(p.clinica)}" required></div><div class="field"><label for="pf-nome">Nome completo da nutricionista</label><input id="pf-nome" name="nome" maxlength="90" value="${e(p.nome)}" required></div>
<div class="field"><label for="pf-crn">Nº do CRN</label><input id="pf-crn" name="crn" maxlength="20" value="${e(p.crn)}" placeholder="Ex.: 12041"></div>
<div class="field"><label for="pf-reg">Região do CRN</label><input id="pf-reg" name="regiaoCrn" maxlength="3" value="${e(p.regiaoCrn)}" placeholder="Ex.: 10"></div>
<div class="field"><label for="pf-doc">CPF ou CNPJ</label><input id="pf-doc" name="documento" maxlength="20" value="${e(p.documento)}"></div>
<div class="field"><label for="pf-tel">Telefone / WhatsApp</label><input id="pf-tel" name="telefone" maxlength="30" value="${e(p.telefone)}"></div>
<div class="field"><label for="pf-mail">E-mail</label><input id="pf-mail" name="email" type="email" maxlength="80" value="${e(p.email)}"></div>
<div class="field"><label for="pf-insta">Instagram</label><input id="pf-insta" name="instagram" maxlength="40" value="${e(p.instagram)}" placeholder="@seuperfil"></div>
<div class="field"><label for="pf-cid">Cidade/UF</label><input id="pf-cid" name="cidade" maxlength="60" value="${e(p.cidade)}" placeholder="Ex.: Tubarão/SC"></div></div>
<div class="field"><label for="pf-end">Endereço do consultório</label><input id="pf-end" name="endereco" maxlength="140" value="${e(p.endereco)}"></div>
<div class="field-grid"><div class="field"><label for="pf-logo">Logotipo (PNG ou JPG)</label><input id="pf-logo" type="file" accept="image/png,image/jpeg,image/webp"></div><div class="field">${p.logo ? `<img class="logo-preview" src="${p.logo}" alt="Logotipo atual"><button type="button" class="text-button" data-action="perfil-remover-logo">Remover logotipo</button>` : '<small>Sem logotipo cadastrado.</small>'}</div></div>
<div class="form-footer"><span>Salvo neste navegador</span><button class="button primary" type="submit">Salvar dados profissionais</button></div></form>
<form id="wa-config-form" class="card"><h2>📲 Aviso aos pais por WhatsApp</h2><p>Quando você envia algo para a Área da Família (prescrição, metas, recado, retorno do diário, consulta), o sistema oferece avisar o responsável pelo WhatsApp.</p>
<div class="wa-modos"><label class="wa-modo on"><input type="radio" name="modo" value="manual" checked><span><b>Manual — já funciona</b>O WhatsApp abre com a mensagem pronta e você só toca em enviar. Usa o seu próprio WhatsApp.</span></label>
<label class="wa-modo off"><input type="radio" name="modo" value="automatico" disabled><span><b>Automático — requer o servidor</b>O sistema envia sozinho pela API oficial do WhatsApp (WhatsApp Business da Meta, com modelo de mensagem aprovado). O código já está pronto em <code>server/whatsapp.mjs</code>; falta ativar o servidor e a conta.</span></label></div>
<label class="check"><input type="checkbox" name="perguntar" ${w.perguntar !== false ? 'checked' : ''}> Perguntar se quero avisar sempre que eu enviar algo para a família</label>
<div class="field"><label for="wa-linkp">Link da Área da Família enviado aos pais</label><input id="wa-linkp" name="linkPortal" maxlength="200" value="${e(p.linkPortal || '')}" placeholder="Deixe em branco para usar o endereço deste sistema"></div>
<p class="helper">Só envie para quem autorizou (a autorização fica registrada no acesso de cada família). A mensagem não leva dados de saúde nem o PIN.</p>
<div class="form-footer"><span>Salvo neste navegador</span><button class="button primary" type="submit">Salvar</button></div></form>`;
  }

  return {
    paginas: paginasConsultorio,
    renderizadores,
    garantirEstado,
    tela: pagina => portal.tela(pagina),
    cartoesConfiguracao,
    evolucaoCard: pid => anamnese.evolucaoCard(pid),
    diarioFamilias: pid => portal.diarioFeed(pid),
    pendentesAviso: () => portal.pendentesAviso(),
    biblioteca,
    onWhatsApp: a => portal.onWhatsApp(a),
    // Consulta marcada na Agenda aparece no portal da família
    aoAgendar(a) {
      if (!ctx.state.acessos?.[a.patient]?.ativo) return;
      const d = new Date(a.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
      portal.publicar(a.patient, { tipo: 'consulta', titulo: 'Consulta agendada', texto: `${a.type} · ${d} às ${a.time}` });
    },
    onClick(el) {
      if (el.dataset.action === 'perfil-remover-logo') { ctx.state.perfil.logo = ''; ctx.save(); ctx.render(); return true; }
      return modulos.some(m => m.onClick?.(el));
    },
    onInput(e) { return modulos.some(m => m.onInput?.(e)); },
    onChange(e) {
      if (e.id === 'pf-logo' && e.files?.[0]) {
        lerImagem(e.files[0], 600).then(img => { ctx.state.perfil.logo = img; ctx.save(); ctx.render(); ctx.toast('Logotipo salvo.'); }).catch(err => ctx.toast(err.message));
        return true;
      }
      return modulos.some(m => m.onChange?.(e));
    },
    onSubmit(form, values) {
      if (form.id === 'perfil-form') {
        const p = ctx.state.perfil;
        for (const k of ['clinica', 'nome', 'crn', 'regiaoCrn', 'documento', 'telefone', 'email', 'instagram', 'cidade', 'endereco']) p[k] = (values[k] || '').trim();
        if (p.clinica) ctx.state.clinic = p.clinica;
        if (p.nome) ctx.state.professional = p.nome;
        ctx.save(); ctx.render(); ctx.toast('Dados salvos.'); return true;
      }
      if (form.id === 'wa-config-form') {
        ctx.state.whatsapp = { modo: 'manual', perguntar: !!values.perguntar };
        ctx.state.perfil.linkPortal = (values.linkPortal || '').trim();
        ctx.save(); ctx.render(); ctx.toast('Preferências do WhatsApp salvas.'); return true;
      }
      return modulos.some(m => m.onSubmit?.(form, values));
    }
  };
}
