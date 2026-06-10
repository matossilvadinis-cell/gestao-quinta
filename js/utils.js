// utils.js — utilitários gerais (datas, formatação, helpers)
'use strict';

const Vistas = {};

function uid(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}

function normalizarNome(n){
  return String(n || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/* ===== Datas (formato interno: 'AAAA-MM-DD') ===== */

function dataParaISO(d){
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + dia;
}

function hojeISO(){
  return dataParaISO(new Date());
}

function isoParaData(iso){
  const p = iso.split('-').map(Number);
  return new Date(p[0], p[1] - 1, p[2]);
}

function formatarData(iso){
  if (!iso) return '';
  const p = iso.split('-');
  return p[2] + '/' + p[1] + '/' + p[0];
}

function formatarDataCurta(iso){
  const p = iso.split('-');
  return p[2] + '/' + p[1];
}

function nomeDiaSemana(iso){
  const dias = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  return dias[isoParaData(iso).getDay()];
}

function somarDias(iso, n){
  const d = isoParaData(iso);
  d.setDate(d.getDate() + n);
  return dataParaISO(d);
}

// Semana: segunda-feira a domingo
function inicioSemana(iso){
  const d = isoParaData(iso);
  const desvio = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - desvio);
  return dataParaISO(d);
}

function fimSemana(iso){
  return somarDias(inicioSemana(iso), 6);
}

function sabadoDaSemana(iso){
  return somarDias(inicioSemana(iso), 5);
}

function rotuloSemana(inicioIso){
  return 'Semana de ' + formatarDataCurta(inicioIso) + ' a ' + formatarDataCurta(somarDias(inicioIso, 6));
}

/* ===== Formatação de números ===== */

function fmtNum(v, dec){
  if (dec === undefined) dec = 0;
  return Number(v || 0).toLocaleString('pt-PT', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtEuro(v){
  return Number(v || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

function fmtKg(v){
  return fmtNum(v) + ' kg';
}

function fmtTon(v){
  return fmtNum(v / 1000, 1) + ' t';
}

function fmtDias(d){
  return Number.isInteger(d) ? fmtNum(d) : fmtNum(d, 1);
}

/* ===== Ficheiros ===== */

function descarregarFicheiro(nome, conteudo, tipoMime){
  const blob = new Blob([conteudo], { type: tipoMime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  setTimeout(function(){
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 150);
}
