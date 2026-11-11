// Pré-lançamento: enquanto "ativo" for true, todas as páginas pedem o acesso master (acesso.html).
// A senha é pedida a cada entrada: o acesso vale só para a aba em que foi digitada (sessionStorage) e cai
// depois de 30 minutos sem uso. No celular a aba fica aberta por dias, por isso a validade é conferida de
// novo quando a aba volta a aparecer e a cada toque.
// Para abrir o site ao público, troque ativo para false e publique. Para trocar usuário/senha, rode
// node scripts/chave-acesso.mjs e cole a chave abaixo. Usuário e senha não ficam escritos em lugar nenhum.
// Atenção: é uma cortina para o site não ficar aberto antes da hora, não uma proteção de dados. Num site
// estático o código é público; segurança de verdade (login de cada nutricionista) vem com o servidor.
(function () {
  var A = window.MASTIGO_ACESSO = {
    ativo: false,
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
  if (!A.ativo || /acesso\.html$/.test(location.pathname)) return;
  function conferir() {
    if (A.valido()) { A.entrar(); return true; }
    A.sair();
    var pagina = location.pathname.split('/').pop() || 'index.html';
    location.replace('./acesso.html?volta=' + encodeURIComponent(pagina + location.search + location.hash));
    return false;
  }
  try { localStorage.removeItem(A.armazenamento); } catch (e) { /* acessos lembrados de versões antigas deixam de valer */ }
  conferir();
  addEventListener('pageshow', function (e) { if (e.persisted) conferir(); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') conferir(); });
  var ultimo = 0;
  function uso() { var agora = Date.now(); if (agora - ultimo > 20000) { ultimo = agora; conferir(); } }
  addEventListener('pointerdown', uso, true);
  addEventListener('keydown', uso, true);
})();
