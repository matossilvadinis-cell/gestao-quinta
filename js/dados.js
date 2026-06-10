// dados.js — camada de dados (localStorage) e cálculos da aplicação
'use strict';

const CHAVE_DB = 'gestaoQuinta.v1';
let DB = null;

/* ===== Estrutura e arranque ===== */

function variedadesPadrao(){
  return [
    { id: uid(), nome: 'Pera Rocha', tipoFruta: 'pera', pesoPalote: 250 },
    { id: uid(), nome: 'Pink Lady',  tipoFruta: 'maca', pesoPalote: 280 },
    { id: uid(), nome: 'Royal Gala', tipoFruta: 'maca', pesoPalote: 280 },
    { id: uid(), nome: 'Fuji',       tipoFruta: 'maca', pesoPalote: 280 }
  ];
}

function novaTemporada(ano, base){
  return {
    ano: ano,
    fechada: false,
    config: {
      valorDiarioTrabalhador: base ? base.config.valorDiarioTrabalhador : 0,
      valorDiarioLider: base ? base.config.valorDiarioLider : 0
    },
    variedades: base ? base.variedades.map(function(v){ return Object.assign({}, v); }) : variedadesPadrao(),
    pomares: base ? base.pomares.map(function(p){ return Object.assign({}, p); }) : [],
    trabalhadores: [],          // { id, nome, tipo:'trabalhador'|'lider', repetido, ativo }
    empresas: base ? base.empresas.map(function(e){ return Object.assign({}, e); }) : [],
    registoEmpresas: {},        // { 'AAAA-MM-DD': { empresaId: nPessoas } }
    chamadas: {},               // { 'AAAA-MM-DD': { trabalhadorId: 'P'|'M'|'A' } }
    grupos: [],                 // { id, nome, liderId, membroIds: [] }
    producao: [],               // { id, data, grupoId, grupoNome, pomarId, palotes }
    entregas: [],               // { id, data, pomarId, palotes }
    pagamentos: {},             // { inicioSemana: { pago:true, em:'AAAA-MM-DD' } }
    caixa: { valor: 0, atualizadoEm: null }
  };
}

function carregarDB(){
  try {
    DB = JSON.parse(localStorage.getItem(CHAVE_DB));
  } catch (e) {
    DB = null;
  }
  if (!DB || !DB.temporadas || !DB.temporadaAtual) {
    const ano = new Date().getFullYear();
    DB = {
      versao: 1,
      temporadaAtual: String(ano),
      temporadas: {},
      historicoTrabalhadores: {},  // { chaveNome: { nome, anos: { '2025': { dias, tipo } } } }
      historicoPomares: {}         // { nomePomar: { '2025': kg } }
    };
    DB.temporadas[String(ano)] = novaTemporada(ano);
    guardarDB();
  }
  if (!DB.historicoTrabalhadores) DB.historicoTrabalhadores = {};
  if (!DB.historicoPomares) DB.historicoPomares = {};
}

function guardarDB(){
  localStorage.setItem(CHAVE_DB, JSON.stringify(DB));
  // Sincronização na nuvem (se configurada) — ver js/nuvem.js
  if (typeof Nuvem !== 'undefined' && Nuvem.disponivel()) Nuvem.guardar(DB);
}

function temporada(){
  return DB.temporadas[DB.temporadaAtual];
}

/* ===== Pesquisas básicas ===== */

function variedadePorId(id){
  return temporada().variedades.find(function(v){ return v.id === id; }) || null;
}

function pomarPorId(id){
  return temporada().pomares.find(function(p){ return p.id === id; }) || null;
}

function pomaresAtivos(){
  return temporada().pomares.filter(function(p){ return p.ativo !== false; });
}

function trabalhadorPorId(id){
  return temporada().trabalhadores.find(function(t){ return t.id === id; }) || null;
}

function trabalhadoresAtivos(){
  return temporada().trabalhadores.filter(function(t){ return t.ativo !== false; });
}

function ordenarTrabalhadores(lista){
  return lista.slice().sort(function(a, b){
    if (a.tipo !== b.tipo) return a.tipo === 'lider' ? -1 : 1;
    return a.nome.localeCompare(b.nome, 'pt');
  });
}

function empresaPorId(id){
  return temporada().empresas.find(function(e){ return e.id === id; }) || null;
}

function grupoPorId(id){
  return temporada().grupos.find(function(g){ return g.id === id; }) || null;
}

function variedadeDoPomar(pomarId){
  const p = pomarPorId(pomarId);
  return p ? variedadePorId(p.variedadeId) : null;
}

function rotuloTipoFruta(tf){
  return tf === 'pera' ? 'Pera' : 'Maçã';
}

function kgDeRegisto(reg){
  const v = variedadeDoPomar(reg.pomarId);
  return v ? reg.palotes * v.pesoPalote : 0;
}

/* ===== Referências (para impedir remoções com histórico) ===== */

function variedadeReferenciada(varId){
  return temporada().pomares.some(function(p){ return p.variedadeId === varId; });
}

function pomarReferenciado(pomarId){
  const t = temporada();
  return t.producao.some(function(r){ return r.pomarId === pomarId; }) ||
         t.entregas.some(function(e){ return e.pomarId === pomarId; });
}

function empresaReferenciada(empId){
  const re = temporada().registoEmpresas;
  return Object.keys(re).some(function(d){ return re[d][empId] != null; });
}

/* ===== Chamada ===== */

function estadoChamada(data, trabId){
  const reg = temporada().chamadas[data];
  return reg ? (reg[trabId] || null) : null;
}

function definirChamada(data, trabId, estado){
  const t = temporada();
  if (!t.chamadas[data]) t.chamadas[data] = {};
  if (estado) t.chamadas[data][trabId] = estado;
  else delete t.chamadas[data][trabId];
  if (Object.keys(t.chamadas[data]).length === 0) delete t.chamadas[data];
  guardarDB();
}

function resumoChamadaDia(data){
  const t = temporada();
  const reg = t.chamadas[data] || {};
  let presentes = 0, meios = 0, ausentes = 0, semRegisto = 0;
  trabalhadoresAtivos().forEach(function(tr){
    if (reg[tr.id] === 'P') presentes++;
    else if (reg[tr.id] === 'M') meios++;
    else if (reg[tr.id] === 'A') ausentes++;
    else semRegisto++;
  });
  let externos = 0;
  const re = t.registoEmpresas[data] || {};
  Object.keys(re).forEach(function(k){ externos += parseInt(re[k], 10) || 0; });
  return { presentes: presentes, meios: meios, ausentes: ausentes, semRegisto: semRegisto, externos: externos };
}

function diasSemanaTrabalhador(trabId, inicio){
  const t = temporada();
  let completos = 0, meios = 0;
  for (let i = 0; i < 7; i++) {
    const reg = t.chamadas[somarDias(inicio, i)];
    if (!reg) continue;
    if (reg[trabId] === 'P') completos++;
    else if (reg[trabId] === 'M') meios++;
  }
  return { completos: completos, meios: meios };
}

function diasTemporadaTrabalhador(trabId){
  const t = temporada();
  let completos = 0, meios = 0;
  Object.keys(t.chamadas).forEach(function(d){
    const e = t.chamadas[d][trabId];
    if (e === 'P') completos++;
    else if (e === 'M') meios++;
  });
  return { completos: completos, meios: meios };
}

// Presenças dos elementos de um grupo (líder + trabalhadores) num dia
function presentesDoGrupo(grupoId, data){
  const g = grupoPorId(grupoId);
  if (!g) return { completos: 0, meios: 0, equivalente: 0 };
  const reg = temporada().chamadas[data] || {};
  const ids = (g.liderId ? [g.liderId] : []).concat(g.membroIds);
  let completos = 0, meios = 0;
  ids.forEach(function(id){
    if (reg[id] === 'P') completos++;
    else if (reg[id] === 'M') meios++;
  });
  return { completos: completos, meios: meios, equivalente: completos + meios * 0.5 };
}

function trabalhadorTemRegistos(trabId){
  const t = temporada();
  return Object.keys(t.chamadas).some(function(d){ return t.chamadas[d][trabId] != null; });
}

/* ===== Produção ===== */

function producaoEntre(d1, d2){
  return temporada().producao.filter(function(r){ return r.data >= d1 && r.data <= d2; });
}

function totaisProducao(regs){
  let palotes = 0, kg = 0;
  regs.forEach(function(r){
    palotes += r.palotes;
    kg += kgDeRegisto(r);
  });
  return { palotes: palotes, kg: kg };
}

function agruparProducaoPorVariedade(regs){
  const mapa = {};
  regs.forEach(function(r){
    const v = variedadeDoPomar(r.pomarId);
    if (!v) return;
    if (!mapa[v.id]) mapa[v.id] = { variedade: v, palotes: 0, kg: 0 };
    mapa[v.id].palotes += r.palotes;
    mapa[v.id].kg += r.palotes * v.pesoPalote;
  });
  return Object.keys(mapa).map(function(k){ return mapa[k]; })
    .sort(function(a, b){ return b.kg - a.kg; });
}

function agruparProducaoPorPomar(regs){
  const mapa = {};
  regs.forEach(function(r){
    const p = pomarPorId(r.pomarId);
    if (!p) return;
    if (!mapa[p.id]) mapa[p.id] = { pomar: p, variedade: variedadePorId(p.variedadeId), palotes: 0, kg: 0 };
    mapa[p.id].palotes += r.palotes;
    mapa[p.id].kg += kgDeRegisto(r);
  });
  return Object.keys(mapa).map(function(k){ return mapa[k]; })
    .sort(function(a, b){ return b.kg - a.kg; });
}

/* ===== Stock de palotes ===== */

// Stock por variedade; com `ateData` considera apenas registos até esse dia (inclusive)
function stockPorVariedade(ateData){
  const t = temporada();
  const limite = ateData || '9999-12-31';
  const mapa = {};
  function entrada(v){
    if (!mapa[v.id]) mapa[v.id] = { variedade: v, colhidos: 0, entregues: 0 };
    return mapa[v.id];
  }
  t.producao.forEach(function(r){
    if (r.data > limite) return;
    const v = variedadeDoPomar(r.pomarId);
    if (v) entrada(v).colhidos += r.palotes;
  });
  t.entregas.forEach(function(e){
    if (e.data > limite) return;
    const v = variedadeDoPomar(e.pomarId);
    if (v) entrada(v).entregues += e.palotes;
  });
  return Object.keys(mapa).map(function(k){
    const m = mapa[k];
    const stock = m.colhidos - m.entregues;
    return {
      variedade: m.variedade,
      colhidos: m.colhidos,
      entregues: m.entregues,
      stock: stock,
      kg: stock * m.variedade.pesoPalote
    };
  }).sort(function(a, b){ return a.variedade.nome.localeCompare(b.variedade.nome, 'pt'); });
}

function stockDaVariedade(varId){
  const linha = stockPorVariedade().find(function(s){ return s.variedade.id === varId; });
  return linha ? linha.stock : 0;
}

/* ===== Semanas e salários ===== */

function semanasDaTemporada(){
  const t = temporada();
  const conjunto = new Set();
  Object.keys(t.chamadas).forEach(function(d){ conjunto.add(inicioSemana(d)); });
  Object.keys(t.registoEmpresas).forEach(function(d){ conjunto.add(inicioSemana(d)); });
  t.producao.forEach(function(r){ conjunto.add(inicioSemana(r.data)); });
  t.entregas.forEach(function(e){ conjunto.add(inicioSemana(e.data)); });
  if (!t.fechada && String(new Date().getFullYear()) === String(t.ano)) {
    conjunto.add(inicioSemana(hojeISO()));
  }
  if (conjunto.size === 0) conjunto.add(inicioSemana(hojeISO()));
  return Array.from(conjunto).sort().reverse();
}

// Valor diário do trabalhador: usa o valor personalizado ("da casa") se definido
function valorDiarioDoTrabalhador(tr){
  if (tr.valorDiarioProprio != null && tr.valorDiarioProprio !== '' && !isNaN(tr.valorDiarioProprio)) {
    return Number(tr.valorDiarioProprio);
  }
  const c = temporada().config;
  return tr.tipo === 'lider' ? (c.valorDiarioLider || 0) : (c.valorDiarioTrabalhador || 0);
}

// Caixa da temporada (com migração de dados antigos sem o campo)
function caixaDaTemporada(){
  const t = temporada();
  if (!t.caixa) t.caixa = { valor: 0, atualizadoEm: null };
  return t.caixa;
}

// Próximo pagamento: sábado desta semana (ou da próxima, se já passou)
function proximoPagamentoInfo(){
  const hoje = hojeISO();
  let sab = sabadoDaSemana(hoje);
  if (hoje > sab) sab = somarDias(sab, 7);
  const inicio = inicioSemana(sab);
  return { sabado: sab, inicio: inicio, total: calcularSalariosSemana(inicio).totalGeral };
}

function calcularSalariosSemana(inicio){
  const t = temporada();
  const linhas = [];
  let totalGeral = 0;
  t.trabalhadores.forEach(function(tr){
    const d = diasSemanaTrabalhador(tr.id, inicio);
    const diasPagos = d.completos + d.meios * 0.5;
    if (diasPagos === 0 && tr.ativo === false) return;
    const valorDia = valorDiarioDoTrabalhador(tr);
    const total = diasPagos * valorDia;
    totalGeral += total;
    linhas.push({
      trabalhador: tr,
      completos: d.completos,
      meios: d.meios,
      diasPagos: diasPagos,
      valorDia: valorDia,
      total: total
    });
  });
  linhas.sort(function(a, b){
    if (a.trabalhador.tipo !== b.trabalhador.tipo) return a.trabalhador.tipo === 'lider' ? -1 : 1;
    return a.trabalhador.nome.localeCompare(b.trabalhador.nome, 'pt');
  });
  return { linhas: linhas, totalGeral: totalGeral };
}

/* ===== Histórico de trabalhadores e pomares ===== */

function procurarHistoricoTrabalhador(nome){
  const chave = normalizarNome(nome);
  if (!chave) return null;
  return DB.historicoTrabalhadores[chave] || null;
}

function producaoPomaresTemporadaKg(t){
  const porPomar = {};
  t.producao.forEach(function(r){
    const p = t.pomares.find(function(x){ return x.id === r.pomarId; });
    if (!p) return;
    const v = t.variedades.find(function(x){ return x.id === p.variedadeId; });
    if (!v) return;
    porPomar[p.nome] = (porPomar[p.nome] || 0) + r.palotes * v.pesoPalote;
  });
  return porPomar;
}

// Junta o histórico guardado com as temporadas em curso/registadas na app
function dadosHistoricoPomares(){
  const valores = {};
  Object.keys(DB.historicoPomares).forEach(function(nome){
    valores[nome] = Object.assign({}, DB.historicoPomares[nome]);
  });
  Object.keys(DB.temporadas).forEach(function(chave){
    const t = DB.temporadas[chave];
    const porPomar = producaoPomaresTemporadaKg(t);
    Object.keys(porPomar).forEach(function(nome){
      if (!valores[nome]) valores[nome] = {};
      valores[nome][String(t.ano)] = porPomar[nome];
    });
  });
  const anos = new Set();
  Object.keys(valores).forEach(function(nome){
    Object.keys(valores[nome]).forEach(function(a){ anos.add(a); });
  });
  return {
    pomares: Object.keys(valores).sort(function(a, b){ return a.localeCompare(b, 'pt'); }),
    anos: Array.from(anos).sort(),
    valores: valores
  };
}

/* ===== Gestão de temporadas ===== */

function fecharTemporadaAtual(){
  const t = temporada();
  // Histórico de pomares (kg por pomar nesta temporada)
  const porPomar = producaoPomaresTemporadaKg(t);
  Object.keys(porPomar).forEach(function(nome){
    if (!DB.historicoPomares[nome]) DB.historicoPomares[nome] = {};
    DB.historicoPomares[nome][String(t.ano)] = porPomar[nome];
  });
  // Histórico de trabalhadores (dias trabalhados nesta temporada)
  t.trabalhadores.forEach(function(tr){
    const d = diasTemporadaTrabalhador(tr.id);
    const dias = d.completos + d.meios * 0.5;
    if (dias <= 0) return;
    const chave = normalizarNome(tr.nome);
    if (!DB.historicoTrabalhadores[chave]) {
      DB.historicoTrabalhadores[chave] = { nome: tr.nome, anos: {} };
    }
    DB.historicoTrabalhadores[chave].anos[String(t.ano)] = { dias: dias, tipo: tr.tipo };
  });
  t.fechada = true;
  guardarDB();
}

function criarTemporada(ano){
  const chave = String(ano);
  if (!DB.temporadas[chave]) {
    DB.temporadas[chave] = novaTemporada(Number(ano), temporada());
  }
  DB.temporadaAtual = chave;
  guardarDB();
}
