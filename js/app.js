// app.js — navegação e arranque da aplicação
'use strict';

const NAV = [
  { id: 'dashboard',     rotulo: 'Dashboard',        icone: '📊' },
  { id: 'chamada',       rotulo: 'Chamada',          icone: '✅' },
  { id: 'producao',      rotulo: 'Produção',         icone: '🧺' },
  { id: 'stock',         rotulo: 'Stock & Entregas', icone: '📦' },
  { id: 'salarios',      rotulo: 'Salários',         icone: '💶' },
  { id: 'grupos',        rotulo: 'Grupos',           icone: '👥' },
  { id: 'trabalhadores', rotulo: 'Trabalhadores',    icone: '🧑‍🌾' },
  { id: 'pomares',       rotulo: 'Pomares',          icone: '🌳' },
  { id: 'exportar',      rotulo: 'Exportar',         icone: '📤' },
  { id: 'configuracao',  rotulo: 'Configuração',     icone: '⚙️' }
];

let vistaAtual = 'dashboard';

function navegar(id){
  vistaAtual = id;
  renderAplicacao();
  window.scrollTo(0, 0);
}

// Re-render mantendo a posição de scroll (para ações dentro da mesma vista)
function rerender(){
  const y = window.scrollY;
  renderAplicacao();
  window.scrollTo(0, y);
}

function renderAplicacao(){
  const t = temporada();
  document.getElementById('badge-temporada').textContent =
    'Temporada ' + t.ano + (t.fechada ? ' · fechada' : '');

  const nav = document.getElementById('nav');
  nav.innerHTML = NAV.map(function(n){
    return '<button type="button" class="nav-btn' + (n.id === vistaAtual ? ' ativo' : '') +
      '" data-vista="' + n.id + '">' + n.icone + ' ' + n.rotulo + '</button>';
  }).join('');
  nav.querySelectorAll('.nav-btn').forEach(function(b){
    b.addEventListener('click', function(){ navegar(b.dataset.vista); });
  });

  const conteudo = document.getElementById('conteudo');
  conteudo.innerHTML = '';
  Vistas[vistaAtual].render(conteudo);
}

document.addEventListener('DOMContentLoaded', function(){
  carregarDB();
  renderAplicacao();
});
