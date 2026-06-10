// teste-logica.js — teste funcional da camada de dados (correr com jsc; não é carregado pela app)
// Uso: jsc teste-logica.js (a partir da pasta gestao-quinta)
'use strict';

// Stub de localStorage para correr fora do browser
var __memoria = {};
var localStorage = {
  getItem: function(k){ return __memoria[k] !== undefined ? __memoria[k] : null; },
  setItem: function(k, v){ __memoria[k] = String(v); },
  removeItem: function(k){ delete __memoria[k]; }
};

load('js/utils.js');
load('js/dados.js');

var falhas = 0;
function verificar(nome, condicao){
  if (condicao) { print('  ✓ ' + nome); }
  else { falhas++; print('  ✗ FALHOU: ' + nome); }
}

print('— Arranque —');
carregarDB();
var t = temporada();
verificar('temporada criada com 4 variedades padrão', t.variedades.length === 4);
var peraRocha = t.variedades.find(function(v){ return v.nome === 'Pera Rocha'; });
var royalGala = t.variedades.find(function(v){ return v.nome === 'Royal Gala'; });
verificar('Pera Rocha = 250 kg/palote', peraRocha.pesoPalote === 250);
verificar('Royal Gala = 280 kg/palote', royalGala.pesoPalote === 280);

print('— Configuração —');
t.config.valorDiarioTrabalhador = 60;
t.config.valorDiarioLider = 75;
t.pomares.push({ id: 'pomA', nome: 'Pomar da Eira', variedadeId: peraRocha.id, ativo: true });
t.pomares.push({ id: 'pomB', nome: 'Pomar Novo', variedadeId: royalGala.id, ativo: true });
guardarDB();
verificar('variedade do pomar determinada automaticamente',
  variedadeDoPomar('pomA').nome === 'Pera Rocha' && variedadeDoPomar('pomB').nome === 'Royal Gala');

print('— Trabalhadores e empresas —');
t.trabalhadores.push({ id: 'w1', nome: 'Ana Silva', tipo: 'trabalhador', repetido: false, ativo: true });
t.trabalhadores.push({ id: 'w2', nome: 'Bruno Costa', tipo: 'trabalhador', repetido: false, ativo: true });
t.trabalhadores.push({ id: 'w3', nome: 'Carlos Líder', tipo: 'lider', repetido: false, ativo: true });
t.empresas.push({ id: 'e1', nome: 'AgriTemp' });
guardarDB();
verificar('3 trabalhadores ativos', trabalhadoresAtivos().length === 3);

print('— Chamada (segunda-feira da semana corrente) —');
var seg = inicioSemana(hojeISO());
var ter = somarDias(seg, 1);
verificar('início de semana é segunda-feira', isoParaData(seg).getDay() === 1);
definirChamada(seg, 'w1', 'P');
definirChamada(seg, 'w2', 'M');
definirChamada(seg, 'w3', 'P');
definirChamada(ter, 'w1', 'P');
definirChamada(ter, 'w2', 'A');
definirChamada(ter, 'w3', 'P');
t.registoEmpresas[seg] = { e1: 5 };
guardarDB();
var resumo = resumoChamadaDia(seg);
verificar('resumo do dia: 2 presentes, 1 meio-dia, 5 externos',
  resumo.presentes === 2 && resumo.meios === 1 && resumo.externos === 5);

print('— Grupos e produção —');
t.grupos.push({ id: 'g1', nome: 'Grupo 1', liderId: 'w3', membroIds: ['w1', 'w2'] });
t.producao.push({ id: 'p1', data: seg, grupoId: 'g1', grupoNome: 'Grupo 1', pomarId: 'pomA', palotes: 4 });
t.producao.push({ id: 'p2', data: seg, grupoId: 'g1', grupoNome: 'Grupo 1', pomarId: 'pomB', palotes: 3 });
guardarDB();
var totDia = totaisProducao(producaoEntre(seg, seg));
verificar('kg automáticos: 4×250 + 3×280 = 1840 kg', totDia.kg === 1840 && totDia.palotes === 7);
var porVar = agruparProducaoPorVariedade(t.producao);
verificar('agrupado por variedade (2 variedades)', porVar.length === 2);

print('— Stock e entregas —');
var stock0 = stockPorVariedade();
var stockPera = stock0.find(function(s){ return s.variedade.id === peraRocha.id; });
verificar('stock inicial de pera = 4 palotes (1000 kg)', stockPera.stock === 4 && stockPera.kg === 1000);
t.entregas.push({ id: 'ent1', data: ter, pomarId: 'pomA', palotes: 3 });
guardarDB();
verificar('após entrega de 3, stock de pera = 1', stockDaVariedade(peraRocha.id) === 1);

print('— Salários da semana —');
var sal = calcularSalariosSemana(seg);
var linhaAna = sal.linhas.find(function(l){ return l.trabalhador.id === 'w1'; });
var linhaBruno = sal.linhas.find(function(l){ return l.trabalhador.id === 'w2'; });
var linhaCarlos = sal.linhas.find(function(l){ return l.trabalhador.id === 'w3'; });
verificar('Ana: 2 dias × 60€ = 120€', linhaAna.total === 120);
verificar('Bruno: meio-dia × 60€ = 30€ (ausente não conta)', linhaBruno.total === 30 && linhaBruno.diasPagos === 0.5);
verificar('Carlos (líder): 2 dias × 75€ = 150€', linhaCarlos.total === 150);
verificar('total geral = 300€', sal.totalGeral === 300);
verificar('semana aparece na lista de semanas', semanasDaTemporada().indexOf(seg) !== -1);

print('— Média de kg por pessoa no grupo —');
// seg: w1=P, w2=M, w3(líder)=P → 2,5 pessoas equivalentes; produção do dia = 1840 kg
var presG = presentesDoGrupo('g1', seg);
verificar('presenças do grupo: 2 completos + 1 meio = 2,5 equivalentes',
  presG.completos === 2 && presG.meios === 1 && presG.equivalente === 2.5);
var kgGrupoSeg = totaisProducao(t.producao.filter(function(r){ return r.data === seg && r.grupoId === 'g1'; })).kg;
verificar('média do grupo = 1840 ÷ 2,5 = 736 kg/pessoa', kgGrupoSeg / presG.equivalente === 736);

print('— Trabalhador da casa (valor diário próprio) —');
t.trabalhadores.push({ id: 'w4', nome: 'Dona da Casa', tipo: 'trabalhador', repetido: false, ativo: true, valorDiarioProprio: 50 });
definirChamada(seg, 'w4', 'P');
verificar('valor diário usa o personalizado (50€, não 60€)', valorDiarioDoTrabalhador(trabalhadorPorId('w4')) === 50);
var sal2 = calcularSalariosSemana(seg);
var linhaCasa = sal2.linhas.find(function(l){ return l.trabalhador.id === 'w4'; });
verificar('salário da semana: 1 dia × 50€ = 50€', linhaCasa.total === 50);
verificar('total geral passa a 350€ (300 + 50)', sal2.totalGeral === 350);

print('— Caixa —');
var cx = caixaDaTemporada();
verificar('caixa começa a 0 (com migração automática)', cx.valor === 0);
cx.valor = 400; cx.atualizadoEm = seg; guardarDB();
verificar('caixa 400€ vs 350€ a pagar → sobram 50€', caixaDaTemporada().valor - sal2.totalGeral === 50);

print('— Stock até um dia —');
// produção em seg (4 pera + 3 maçã); entrega de 3 peras em ter
var stockSeg = stockPorVariedade(seg).find(function(s){ return s.variedade.id === peraRocha.id; });
var stockTer = stockPorVariedade(ter).find(function(s){ return s.variedade.id === peraRocha.id; });
verificar('stock de pera no fim de segunda = 4 (entrega ainda não aconteceu)', stockSeg.stock === 4);
verificar('stock de pera no fim de terça = 1 (após entrega de 3)', stockTer.stock === 1);

print('— Fecho de temporada e reconhecimento de repetidos —');
var anoAtual = t.ano;
fecharTemporadaAtual();
verificar('temporada marcada como fechada', temporada().fechada === true);
var histAna = procurarHistoricoTrabalhador('ana silva');
verificar('histórico de Ana guardado (2 dias, nome normalizado sem maiúsculas)',
  histAna && histAna.anos[String(anoAtual)].dias === 2);
var histPom = dadosHistoricoPomares();
verificar('histórico do pomar da Eira tem ' + anoAtual + ' = 1000 kg',
  histPom.valores['Pomar da Eira'][String(anoAtual)] === 1000);

criarTemporada(anoAtual + 1);
var t2 = temporada();
verificar('nova temporada herda config, pomares e empresas, sem trabalhadores',
  t2.ano === anoAtual + 1 && t2.config.valorDiarioTrabalhador === 60 &&
  t2.pomares.length === 2 && t2.empresas.length === 1 && t2.trabalhadores.length === 0);
verificar('na nova temporada, Ana é reconhecida como repetida',
  procurarHistoricoTrabalhador('Ana Silva') !== null);
verificar('histórico de pomares continua acessível na nova temporada',
  dadosHistoricoPomares().valores['Pomar da Eira'][String(anoAtual)] === 1000);

print('');
if (falhas === 0) print('✅ TODOS OS TESTES PASSARAM');
else print('❌ ' + falhas + ' teste(s) falharam');
