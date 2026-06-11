// app.js — navegação, arranque e integração com a nuvem
'use strict';

const NAV = [
  { id: 'dashboard',     rotulo: 'Dashboard',        icone: '📊' },
  { id: 'chamada',       rotulo: 'Chamada',          icone: '✅' },
  { id: 'producao',      rotulo: 'Produção',         icone: '🧺' },
  { id: 'stock',         rotulo: 'Stock & Entregas', icone: '📦' },
  { id: 'salarios',      rotulo: 'Salários',         icone: '💶' },
  { id: 'empresas',      rotulo: 'Empresas',         icone: '🏢' },
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

/* ===== Sincronização na nuvem ===== */

const ESTADOS_NUVEM = {
  'local':        { texto: '💾 Só neste computador', classe: 'nuvem-local' },
  'sem-quinta':   { texto: '☁️ Ativar partilha',     classe: 'nuvem-atencao' },
  'ligando':      { texto: '☁️ A ligar…',            classe: 'nuvem-atencao' },
  'gravando':     { texto: '☁️ A gravar…',           classe: 'nuvem-ok' },
  'sincronizado': { texto: '☁️ Sincronizado',        classe: 'nuvem-ok' },
  'erro':         { texto: '⚠️ Erro de sincronização', classe: 'nuvem-erro' }
};

let detalheEstadoNuvem = '';

function atualizarChipNuvem(estado, detalhe){
  detalheEstadoNuvem = detalhe || '';
  const chip = document.getElementById('chip-nuvem');
  if (!chip) return;
  const info = ESTADOS_NUVEM[estado] || ESTADOS_NUVEM['local'];
  chip.textContent = info.texto;
  chip.className = 'chip-nuvem ' + info.classe;
  chip.style.display = '';
}

function aoMudarNuvem(ev){
  if (ev.tipo === 'dados') {
    // Dados novos vindos de outro dispositivo — aplicar se forem diferentes
    if (Nuvem.jsonEstavel(ev.db) === Nuvem.jsonEstavel(DB)) return;
    DB = ev.db;
    localStorage.setItem(CHAVE_DB, JSON.stringify(DB));
    rerender();
  } else if (ev.tipo === 'vazia-inicial') {
    // Quinta acabada de criar na nuvem — enviar os dados deste computador
    Nuvem.guardar(DB);
  } else if (ev.tipo === 'apagada') {
    // Dados apagados noutro dispositivo — recomeçar do zero
    localStorage.removeItem(CHAVE_DB);
    DB = null;
    carregarDB();
    navegar('dashboard');
    toast('Os dados foram apagados noutro dispositivo.');
  }
}

function mostrarConfigQuinta(){
  const id = (typeof Nuvem !== 'undefined') ? Nuvem.obterQuintaId() : null;
  let corpo = '';
  if (!Nuvem.disponivel()) {
    corpo = '<p>A partilha em tempo real ainda não está configurada — falta a configuração ' +
      'do Firebase em <code>js/firebase-config.js</code>.</p>' +
      '<p class="suave">Enquanto isso, os dados ficam guardados apenas neste browser.</p>';
    abrirModal('☁️ Partilha de dados', corpo);
    return;
  }
  if (id) {
    corpo = '<p>Este computador está ligado à quinta:</p>' +
      '<p><code id="codigo-quinta" style="font-size:1.05rem;font-weight:700">' + esc(id) + '</code></p>' +
      '<div class="linha-form">' +
        '<button class="btn" id="copiar-codigo">📋 Copiar código</button>' +
        '<button class="btn btn-sec" id="mudar-quinta">Usar outro código</button>' +
        '<button class="btn btn-perigo" id="sair-quinta">Desligar (modo local)</button>' +
      '</div>' +
      '<p class="suave">Partilha este código com a família — quem o introduzir vê e edita os mesmos dados em tempo real. Guarda-o como guardarias uma chave.</p>';
  } else {
    corpo = '<p>Os dados podem ser partilhados em tempo real entre vários computadores através da nuvem (Firebase).</p>' +
      '<div class="linha-form"><button class="btn" id="criar-quinta">➕ Criar quinta nova (gera um código)</button></div>' +
      '<hr class="separador">' +
      '<div class="linha-form">' +
        '<div class="campo"><label>Já tenho um código</label>' +
        '<input type="text" id="codigo-existente" placeholder="quinta-..." style="min-width:260px"></div>' +
        '<button class="btn btn-sec" id="ligar-quinta">Ligar</button>' +
      '</div>' +
      '<p class="suave">Se fores o primeiro a configurar, cria a quinta nova e envia o código ao resto da família.</p>';
  }
  const m = abrirModal('☁️ Partilha de dados', corpo);

  const btnCopiar = m.querySelector('#copiar-codigo');
  if (btnCopiar) btnCopiar.addEventListener('click', function(){
    navigator.clipboard.writeText(id).then(function(){ toast('Código copiado.'); });
  });
  const btnMudar = m.querySelector('#mudar-quinta');
  if (btnMudar) btnMudar.addEventListener('click', function(){
    const novo = prompt('Código da quinta a usar neste computador:', '');
    if (!novo || !novo.trim()) return;
    Nuvem.definirQuinta(novo.trim());
    fecharModal();
    toast('Ligado à quinta ' + novo.trim() + '.');
  });
  const btnSair = m.querySelector('#sair-quinta');
  if (btnSair) btnSair.addEventListener('click', function(){
    if (!confirm('Desligar este computador da nuvem? Os dados na nuvem mantêm-se; este browser passa a trabalhar sozinho.')) return;
    Nuvem.sairDaQuinta();
    fecharModal();
    toast('Modo local ativado.');
  });
  const btnCriar = m.querySelector('#criar-quinta');
  if (btnCriar) btnCriar.addEventListener('click', function(){
    const codigo = Nuvem.gerarCodigo();
    Nuvem.definirQuinta(codigo);
    fecharModal();
    abrirModal('✅ Quinta criada',
      '<p>O código da tua quinta é:</p>' +
      '<p><code style="font-size:1.15rem;font-weight:700">' + esc(codigo) + '</code></p>' +
      '<div class="linha-form"><button class="btn" id="copiar-novo">📋 Copiar código</button></div>' +
      '<p class="suave">Envia-o ao teu pai (ex.: WhatsApp). No computador dele: abrir a app → clicar em "☁️ Ativar partilha" no topo → "Já tenho um código".</p>')
      .querySelector('#copiar-novo').addEventListener('click', function(){
        navigator.clipboard.writeText(codigo).then(function(){ toast('Código copiado.'); });
      });
  });
  const btnLigar = m.querySelector('#ligar-quinta');
  if (btnLigar) btnLigar.addEventListener('click', function(){
    const codigo = m.querySelector('#codigo-existente').value.trim();
    if (!codigo) { toast('Escreve o código da quinta.', 'erro'); return; }
    Nuvem.definirQuinta(codigo);
    fecharModal();
    toast('Ligado à quinta ' + codigo + ' — a sincronizar…');
  });
}

document.addEventListener('DOMContentLoaded', function(){
  carregarDB();
  if (typeof Nuvem !== 'undefined') {
    Nuvem.iniciar({ aoMudar: aoMudarNuvem, aoEstado: atualizarChipNuvem });
    atualizarChipNuvem(Nuvem.estado(), '');
    document.getElementById('chip-nuvem').addEventListener('click', function(){
      if (Nuvem.estado() === 'erro' && detalheEstadoNuvem) {
        abrirModal('⚠️ Erro de sincronização', '<p>' + esc(detalheEstadoNuvem) + '</p>' +
          '<p class="suave">Os dados continuam guardados neste browser; a sincronização retoma quando o problema for resolvido.</p>');
      } else {
        mostrarConfigQuinta();
      }
    });
    // Primeira utilização com Firebase configurado: propor a partilha
    if (Nuvem.disponivel() && !Nuvem.obterQuintaId()) {
      setTimeout(mostrarConfigQuinta, 400);
    }
  }
  renderAplicacao();
});
