// Quem pode abrir o sistema (sistema.html). A página de entrada (index.html) é pública.
// - A equipe (Tainara), pelo "Entrar" do rodapé: acesso master em acesso.html. A senha é pedida a cada
//   entrada; o acesso vale só para a aba (sessionStorage) e cai depois de 30 minutos sem uso.
// - Quem fez o cadastro na página de entrada E cadastrou o cartão no Mercado Pago (conta "mastigo-conta"
//   neste navegador, já de volta do Mercado Pago). Sem isso, o "Entrar" do topo leva ao cadastro.
// - Os pais, pela Área da Família (sistema.html#entrar).
// Para trocar usuário/senha master, rode node scripts/chave-acesso.mjs e cole a chave abaixo; usuário e
// senha não ficam escritos em lugar nenhum. modo 'tudo' fecha o site inteiro (pré-lançamento).
// Atenção: é uma cortina, não uma proteção de dados. Num site estático o código é público; conferir a
// assinatura de verdade (webhook do Mercado Pago) e o login de cada nutricionista dependem do servidor.
(function () {
  var A = window.MASTIGO_ACESSO = {
    ativo: true,
    modo: 'sistema',
    chave: 'd7e7ab110fcd120db44f443c024b19bdad6d539b65a4f182f262e8f5387bb333',
    armazenamento: 'mastigo-acesso',
    minutosSemUso: 30
  };
  function ler() { try { return sessionStorage.getItem(A.armazenamento); } catch (e) { return null; } }
  A.valido = function () {
    var t = ler(); if (!t) return false;
    var p = t.split('|');
    return p[0] === A.chave && Number(p[1]) > Date.now();
  };
  A.entrar = function () { try { sessionStorage.setItem(A.armazenamento, A.chave + '|' + (Date.now() + A.minutosSemUso * 60000)); } catch (e) { /* sem armazenamento */ } };
  A.sair = function () { try { sessionStorage.removeItem(A.armazenamento); localStorage.removeItem(A.armazenamento); } catch (e) { /* sem armazenamento */ } };
  // Assinante neste aparelho: fez o cadastro e voltou do Mercado Pago (ou está voltando agora)
  A.assinante = function () {
    try {
      var c = JSON.parse(localStorage.getItem('mastigo-conta') || 'null');
      return !!c && (c.status !== 'aguardando-cartao' || /[?&]assinatura=ok\b/.test(location.search));
    } catch (e) { return false; }
  };
  function familia() {
    if (/^#entrar/.test(location.hash)) return true;
    try { return !!sessionStorage.getItem('pipoca-familia'); } catch (e) { return false; }
  }
  var pagina = location.pathname.split('/').pop() || 'index.html';
  if (!A.ativo || pagina === 'acesso.html') return;
  if (A.modo !== 'tudo' && pagina !== 'sistema.html') return;
  function conferir() {
    if (A.valido()) { A.entrar(); return true; }
    if (A.modo !== 'tudo' && (A.assinante() || familia())) return true;
    var volta = encodeURIComponent((location.pathname.split('/').pop() || 'index.html') + location.search + location.hash);
    // Sistema fechado: assinantes vão para o cadastro; a equipe entra pelo rodapé (acesso.html)
    location.replace(A.modo === 'tudo' ? './acesso.html?volta=' + volta : './index.html?entrar=1#comecar');
    return false;
  }
  try { localStorage.removeItem(A.armazenamento); } catch (e) { /* acessos lembrados de versões antigas não valem */ }
  conferir();
  addEventListener('pageshow', function (e) { if (e.persisted) conferir(); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') conferir(); });
  var ultimo = 0;
  addEventListener('pointerdown', function () { var agora = Date.now(); if (agora - ultimo > 20000) { ultimo = agora; conferir(); } }, true);
})();
