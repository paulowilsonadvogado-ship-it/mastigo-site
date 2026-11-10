// Pré-lançamento: enquanto "ativo" for true, todas as páginas pedem o acesso master (acesso.html).
// Para abrir o site ao público, troque ativo para false e publique. Para trocar usuário/senha, rode
// node scripts/chave-acesso.mjs e cole a chave abaixo. Usuário e senha não ficam escritos em lugar nenhum.
// Atenção: é uma cortina para o site não ficar aberto antes da hora, não uma proteção de dados. Num site
// estático o código é público; segurança de verdade (login de cada nutricionista) vem com o servidor.
(function () {
  var A = window.MASTIGO_ACESSO = {
    ativo: true,
    chave: 'd7e7ab110fcd120db44f443c024b19bdad6d539b65a4f182f262e8f5387bb333',
    armazenamento: 'mastigo-acesso'
  };
  if (!A.ativo || /acesso\.html$/.test(location.pathname)) return;
  var t = null;
  try { t = localStorage.getItem(A.armazenamento) || sessionStorage.getItem(A.armazenamento); } catch (e) { /* sem armazenamento */ }
  if (t === A.chave) return;
  var pagina = location.pathname.split('/').pop() || 'index.html';
  location.replace('./acesso.html?volta=' + encodeURIComponent(pagina + location.search + location.hash));
})();
