// nuvem.js — sincronização em tempo real com Firebase Firestore (plano Spark)
//
// Modelo de dados na nuvem:
//   quintas/{codigoDaQuinta}/docs/global   → temporadaAtual + históricos
//   quintas/{codigoDaQuinta}/docs/t2026    → uma temporada por documento
//
// O código da quinta é um segredo gerado aleatoriamente e partilhado entre
// os membros da família — sem ele não é possível encontrar os dados.
// Se o Firebase não estiver configurado (firebase-config.js com null),
// a app funciona em modo local, exatamente como antes.
'use strict';

var Nuvem = (function(){

  var CHAVE_QUINTA = 'gestaoQuinta.quintaId';

  var fs = null;              // instância do Firestore
  var colecao = null;         // quintas/{id}/docs
  var quintaId = null;
  var autenticado = false;
  var aoMudar = null;         // callback({tipo, db})
  var aoEstado = null;        // callback(estado, detalhe)
  var estadoAtual = 'local';
  var enviados = {};          // docId -> json estável da última versão conhecida na nuvem
  var temporizador = null;
  var dbPendente = null;
  var pararListener = null;
  var primeiroSnapshot = true;

  /* ===== util ===== */

  // JSON com chaves ordenadas — para comparar conteúdos vindos de origens diferentes
  function jsonEstavel(v){
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(jsonEstavel).join(',') + ']';
    return '{' + Object.keys(v).sort().filter(function(k){
      return v[k] !== undefined;
    }).map(function(k){
      return JSON.stringify(k) + ':' + jsonEstavel(v[k]);
    }).join(',') + '}';
  }

  function definirEstado(e, detalhe){
    estadoAtual = e;
    if (aoEstado) aoEstado(e, detalhe || '');
  }

  function disponivel(){
    return !!(typeof window !== 'undefined' && window.FIREBASE_CONFIG &&
      typeof firebase !== 'undefined' && firebase.firestore);
  }

  function gerarCodigo(){
    var letras = 'abcdefghjkmnpqrstuvwxyz23456789';
    var s = 'quinta-';
    for (var i = 0; i < 16; i++) s += letras[Math.floor(Math.random() * letras.length)];
    return s;
  }

  /* ===== decomposição BD <-> documentos ===== */

  function decompor(db){
    var partes = {
      global: {
        versao: db.versao || 1,
        temporadaAtual: db.temporadaAtual,
        historicoTrabalhadores: db.historicoTrabalhadores || {},
        historicoPomares: db.historicoPomares || {}
      }
    };
    Object.keys(db.temporadas).forEach(function(chave){
      partes['t' + chave] = db.temporadas[chave];
    });
    return partes;
  }

  function montarDB(docs){
    if (!docs.global) return null;
    var db = {
      versao: docs.global.versao || 1,
      temporadaAtual: docs.global.temporadaAtual,
      temporadas: {},
      historicoTrabalhadores: docs.global.historicoTrabalhadores || {},
      historicoPomares: docs.global.historicoPomares || {}
    };
    Object.keys(docs).forEach(function(id){
      if (id.charAt(0) === 't' && id !== 'global') db.temporadas[id.slice(1)] = docs[id];
    });
    if (!db.temporadaAtual || !db.temporadas[db.temporadaAtual]) {
      var chaves = Object.keys(db.temporadas).sort();
      if (chaves.length === 0) return null;
      db.temporadaAtual = chaves[chaves.length - 1];
    }
    return db;
  }

  /* ===== arranque e ligação ===== */

  function iniciar(callbacks){
    aoMudar = callbacks.aoMudar;
    aoEstado = callbacks.aoEstado;
    if (!disponivel()) { definirEstado('local'); return false; }
    try {
      firebase.initializeApp(window.FIREBASE_CONFIG);
      fs = firebase.firestore();
      try {
        fs.enablePersistence({ synchronizeTabs: true }).catch(function(){ /* várias abas — ignorar */ });
      } catch (e) { /* persistência indisponível — segue sem cache offline */ }
      quintaId = localStorage.getItem(CHAVE_QUINTA) || null;
      definirEstado(quintaId ? 'ligando' : 'sem-quinta');
      firebase.auth().onAuthStateChanged(function(u){
        autenticado = !!u;
        if (autenticado) tentarLigar();
      });
      firebase.auth().signInAnonymously().catch(function(e){
        definirEstado('erro', 'Autenticação falhou: ' + (e.code || e.message));
      });
      return true;
    } catch (e) {
      definirEstado('erro', e.message);
      return false;
    }
  }

  function tentarLigar(){
    if (!autenticado || !quintaId || pararListener) return;
    ligarQuinta();
  }

  function ligarQuinta(){
    if (pararListener) { pararListener(); pararListener = null; }
    primeiroSnapshot = true;
    enviados = {};
    colecao = fs.collection('quintas').doc(quintaId).collection('docs');
    definirEstado('ligando');
    pararListener = colecao.onSnapshot(function(snap){
      var docs = {};
      snap.forEach(function(d){ docs[d.id] = d.data(); });
      var n = Object.keys(docs).length;
      var inicial = primeiroSnapshot;
      primeiroSnapshot = false;

      if (n === 0) {
        if (inicial) {
          // Quinta nova na nuvem: migrar os dados locais para lá
          definirEstado('sincronizado');
          if (aoMudar) aoMudar({ tipo: 'vazia-inicial' });
        } else {
          // Dados apagados noutro dispositivo
          definirEstado('sincronizado');
          if (aoMudar) aoMudar({ tipo: 'apagada' });
        }
        return;
      }

      enviados = {};
      Object.keys(docs).forEach(function(id){ enviados[id] = jsonEstavel(docs[id]); });
      var db = montarDB(docs);
      definirEstado('sincronizado');
      if (db && aoMudar) aoMudar({ tipo: 'dados', db: db });
    }, function(err){
      definirEstado('erro', err.code === 'permission-denied'
        ? 'Sem permissão — verifica as regras do Firestore.'
        : (err.code || err.message));
    });
  }

  function definirQuinta(id){
    id = String(id || '').trim();
    if (!id) return false;
    quintaId = id;
    localStorage.setItem(CHAVE_QUINTA, id);
    if (pararListener) { pararListener(); pararListener = null; }
    tentarLigar();
    return true;
  }

  function sairDaQuinta(){
    if (pararListener) { pararListener(); pararListener = null; }
    localStorage.removeItem(CHAVE_QUINTA);
    quintaId = null;
    colecao = null;
    enviados = {};
    definirEstado('sem-quinta');
  }

  /* ===== gravação (com debounce e diferenças por documento) ===== */

  function guardar(db){
    if (!disponivel() || !colecao) return;
    dbPendente = db;
    if (temporizador) clearTimeout(temporizador);
    temporizador = setTimeout(despejar, 900);
  }

  function despejar(){
    temporizador = null;
    if (!colecao || !dbPendente) return;
    var partes = decompor(dbPendente);
    var lote = fs.batch();
    var mudou = false;
    Object.keys(partes).forEach(function(id){
      var json = jsonEstavel(partes[id]);
      if (enviados[id] !== json) {
        lote.set(colecao.doc(id), JSON.parse(json));
        enviados[id] = json;
        mudou = true;
      }
    });
    Object.keys(enviados).forEach(function(id){
      if (!partes[id]) {
        lote.delete(colecao.doc(id));
        delete enviados[id];
        mudou = true;
      }
    });
    if (!mudou) return;
    definirEstado('gravando');
    lote.commit().then(function(){
      definirEstado('sincronizado');
    }).catch(function(e){
      definirEstado('erro', 'Falha ao gravar: ' + (e.code || e.message));
    });
  }

  function apagarTudoNuvem(){
    if (!colecao) return Promise.resolve();
    if (temporizador) { clearTimeout(temporizador); temporizador = null; }
    dbPendente = null;
    return colecao.get().then(function(snap){
      var lote = fs.batch();
      snap.forEach(function(d){ lote.delete(d.ref); });
      enviados = {};
      return lote.commit();
    });
  }

  return {
    disponivel: disponivel,
    iniciar: iniciar,
    definirQuinta: definirQuinta,
    sairDaQuinta: sairDaQuinta,
    gerarCodigo: gerarCodigo,
    guardar: guardar,
    apagarTudoNuvem: apagarTudoNuvem,
    jsonEstavel: jsonEstavel,
    obterQuintaId: function(){ return quintaId; },
    estado: function(){ return estadoAtual; }
  };

})();
