// ui.js — componentes de interface partilhados (toast, modal)
'use strict';

function toast(msg, tipo){
  const raiz = document.getElementById('raiz-toast');
  const el = document.createElement('div');
  el.className = 'toast ' + (tipo === 'erro' ? 'toast-erro' : 'toast-ok');
  el.textContent = msg;
  raiz.appendChild(el);
  setTimeout(function(){
    el.style.opacity = '0';
    el.style.transition = 'opacity .3s';
    setTimeout(function(){ el.remove(); }, 320);
  }, 2600);
}

function abrirModal(titulo, corpoHtml){
  const raiz = document.getElementById('raiz-modal');
  raiz.innerHTML =
    '<div class="modal-fundo">' +
      '<div class="modal">' +
        '<div class="modal-cabecalho"><h3>' + titulo + '</h3>' +
        '<button class="modal-fechar" type="button" title="Fechar">✕</button></div>' +
        '<div class="modal-corpo">' + corpoHtml + '</div>' +
      '</div>' +
    '</div>';
  raiz.querySelector('.modal-fechar').addEventListener('click', fecharModal);
  raiz.querySelector('.modal-fundo').addEventListener('click', function(e){
    if (e.target.classList.contains('modal-fundo')) fecharModal();
  });
  return raiz.querySelector('.modal-corpo');
}

function fecharModal(){
  document.getElementById('raiz-modal').innerHTML = '';
}
