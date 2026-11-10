import { iconeAlimento } from './alimentos-icones.js';
export const stages = [
  { id: 'recusou', label: 'Recusou', hint: 'Hoje preferiu não explorar', color: '#b86c72', bg: '#fbedef', icon: 'hand' },
  { id: 'cheirou', label: 'Cheirou', hint: 'Conheceu um novo aroma', color: '#9b7b29', bg: '#fcf4da', icon: 'wind' },
  { id: 'lambeu', label: 'Lambeu', hint: 'Deu uma pequena provada', color: '#7b6aaa', bg: '#f0ecf9', icon: 'smile' },
  { id: 'comeu', label: 'Comeu', hint: 'Experimentou do seu jeito', color: '#167c68', bg: '#e7f5ee', icon: 'check' }
];
const groups = [
 ['Frutas','🍎', 'Banana|Maçã|Pera|Mamão|Manga|Melancia|Melão|Morango|Uva|Laranja|Tangerina|Abacaxi|Abacate|Kiwi|Goiaba|Pêssego|Ameixa|Maracujá|Acerola|Jabuticaba|Pitanga|Caju|Caqui|Figo'],
 ['Legumes e verduras','🥕','Cenoura|Abóbora|Abobrinha|Chuchu|Beterraba|Brócolis|Couve-flor|Alface|Couve|Espinafre|Pepino|Tomate|Berinjela|Quiabo|Vagem|Repolho|Rúcula|Agrião|Ervilha|Milho'],
 ['Cereais e tubérculos','🌽','Arroz|Arroz integral|Aveia|Quinoa|Macarrão|Pão integral|Pão francês|Cuscuz de milho|Tapioca|Batata|Batata-doce|Mandioca|Inhame|Cará'],
 ['Leguminosas','🫘','Feijão carioca|Feijão preto|Feijão branco|Lentilha|Grão-de-bico|Soja'],
 ['Proteínas','🥚','Ovo|Frango|Carne bovina|Carne suína|Tilápia|Sardinha|Salmão|Tofu'],
 ['Leites e derivados','🥛','Leite|Iogurte natural|Queijo minas|Ricota|Queijo muçarela|Coalhada'],
 ['Sementes','🌱','Chia|Linhaça|Semente de abóbora|Gergelim']
];
const emoji = { Banana:'🍌', Maçã:'🍎', Pera:'🍐', Manga:'🥭', Melancia:'🍉', Melão:'🍈', Morango:'🍓', Uva:'🍇', Laranja:'🍊', Abacaxi:'🍍', Abacate:'🥑', Kiwi:'🥝', Pêssego:'🍑', Cenoura:'🥕', Brócolis:'🥦', Pepino:'🥒', Tomate:'🍅', Berinjela:'🍆', Milho:'🌽', Batata:'🥔', Ovo:'🥚', Frango:'🍗', Pão:'🍞', Queijo:'🧀', Arroz:'🍚' };
export const foods = groups.flatMap(([group, icon, list]) => list.split('|').map(name=>({ id: name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-'), name, group, emoji: emoji[name] || icon })));
export const foodGroups = groups.map(g=>g[0]);
// Ilustração do alimento (SVG próprio; não depende de emoji, que varia entre Windows, iPhone e Android)
export const icoAlimento = f => iconeAlimento(f?.id);
export const today = () => new Date().toLocaleDateString('sv-SE');
export function initialState() {
 const day = today();
 const past = n => { const d=new Date(); d.setDate(d.getDate()-n); return d.toLocaleDateString('sv-SE'); };
 return {
  version: 1,
  patients: [
   {id:'p1',name:'Theo Martins',age:'4 anos',guardian:'Marina',color:'mint',initials:'TM',focus:'Explorar novas texturas'},
   {id:'p2',name:'Laura Costa',age:'6 anos',guardian:'Rafael',color:'peach',initials:'LC',focus:'Conhecer frutas diferentes'},
   {id:'p3',name:'Miguel Santos',age:'5 anos',guardian:'Camila',color:'lilac',initials:'MS',focus:'Participar das refeições'},
   {id:'p4',name:'Sofia Almeida',age:'3 anos',guardian:'Juliana',color:'yellow',initials:'SA',focus:'Ampliar as descobertas'}
  ],
  entries: [
   {id:'e1',patient:'p1',food:'brocolis',stage:'cheirou',meal:'Almoço',date:day,time:'12:30',preparation:'Cozido',note:'Pegou com a mão e aproximou do nariz.'},
   {id:'e2',patient:'p2',food:'morango',stage:'comeu',meal:'Lanche da manhã',date:day,time:'10:15',preparation:'In natura',note:'Experimentou um pedaço durante o lanche.'},
   {id:'e3',patient:'p3',food:'cenoura',stage:'lambeu',meal:'Almoço',date:day,time:'12:00',preparation:'Cozida',note:'Explorou com calma, sem cobrança.'},
   {id:'e4',patient:'p4',food:'banana',stage:'comeu',meal:'Café da manhã',date:day,time:'08:30',preparation:'Amassada',note:''},
   ...Array.from({length:24},(_,i)=>({id:`h${i}`,patient:['p1','p2','p3','p4'][i%4],food:['banana','maca','arroz','feijao-preto','cenoura','brocolis','batata','ovo'][i%8],stage:['recusou','cheirou','lambeu','comeu','comeu'][i%5],meal:'Almoço',date:past(1+Math.floor(i/4)),time:'12:00',preparation:'Preparo habitual',note:''}))
  ],
  appointments:[{id:'a1',patient:'p1',date:day,time:'14:00',type:'Sessão de acompanhamento'},{id:'a2',patient:'p2',date:day,time:'15:30',type:'Retorno com a família'},{id:'a3',patient:'p3',date:past(-2),time:'09:00',type:'Sessão de acompanhamento'}],
  clinic:'Clínica Florescer',professional:'Ana',specialty:'Terapeuta alimentar'
 };
}
export const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function summarize(entries) {
 return { total:entries.length, foods:new Set(entries.map(e=>e.food)).size, accepted:new Set(entries.filter(e=>e.stage==='comeu').map(e=>e.food)).size, counts:Object.fromEntries(stages.map(s=>[s.id, entries.filter(e=>e.stage===s.id).length])) };
}
