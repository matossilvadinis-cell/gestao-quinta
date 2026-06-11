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
t.pomares.push({ id: 'pomA', nome: 'Pomar da Eira', variedadeId: peraRocha.id, ativo: true, hectares: 2 });
t.pomares.push({ id: 'pomB', nome: 'Pomar Novo', variedadeId: royalGala.id, ativo: true, hectares: null });
guardarDB();
verificar('variedade do pomar determinada automaticamente',
  variedadeDoPomar('pomA').nome === 'Pera Rocha' && variedadeDoPomar('pomB').nome === 'Royal Gala');

print('— Trabalhadores e empresas —');
t.trabalhadores.push({ id: 'w1', nome: 'Ana Silva', tipo: 'trabalhador', repetido: false, ativo: true, telefone: '912345678', notas: 'vem só às terças' });
t.trabalhadores.push({ id: 'w2', nome: 'Bruno Costa', tipo: 'trabalhador', repetido: false, ativo: true });
t.trabalhadores.push({ id: 'w3', nome: 'Carlos Líder', tipo: 'lider', repetido: false, ativo: true });
t.empresas.push({ id: 'e1', nome: 'AgriTemp', valorPorPessoaDia: 10 });
guardarDB();
verificar('3 trabalhadores ativos', trabalhadoresAtivos().length === 3);
verificar('contacto e notas guardados', trabalhadorPorId('w1').telefone === '912345678' &&
  trabalhadorPorId('w1').notas === 'vem só às terças');

print('— Grupos (simplificados: nome + líder fixo) —');
t.grupos.push({ id: 'g1', nome: 'Grupo 1', liderId: 'w3' });
guardarDB();
verificar('grupo criado sem lista fixa de membros', grupoPorId('g1').membroIds === undefined);

print('— Chamada por horas e grupo do dia —');
var seg = inicioSemana(hojeISO());
var ter = somarDias(seg, 1);
verificar('início de semana é segunda-feira', isoParaData(seg).getDay() === 1);
definirChamada(seg, 'w1', { horas: 8, grupoId: 'g1' });
definirChamada(seg, 'w2', { horas: 4, grupoId: 'g1' });
definirChamada(seg, 'w3', { horas: 8 });                 // líder — grupo é automático
definirChamada(ter, 'w1', { horas: 8, grupoId: 'g1' });
definirChamada(ter, 'w2', { horas: 0 });                 // ausente
definirChamada(ter, 'w3', { horas: 8 });
t.registoEmpresas[seg] = { e1: 5 };
guardarDB();
var resumo = resumoChamadaDia(seg);
verificar('resumo do dia: 2 completos, 1 parcial, 20 h, 5 externos',
  resumo.completos === 2 && resumo.parciais === 1 && resumo.horasTotais === 20 && resumo.externos === 5);
verificar('líder fica associado ao seu grupo automaticamente',
  grupoDoTrabalhadorNoDia('w3', seg) === 'g1');

print('— Compatibilidade com o formato antigo (P/M/A) —');
var diaAntigo = somarDias(seg, 14);
t.chamadas[diaAntigo] = { w1: 'P', w2: 'M', w3: 'A' };
verificar("'P' antigo lê-se como 8 h", registoChamada(diaAntigo, 'w1').horas === 8);
verificar("'M' antigo lê-se como 4 h", registoChamada(diaAntigo, 'w2').horas === 4);
verificar("'A' antigo lê-se como 0 h", registoChamada(diaAntigo, 'w3').horas === 0);
verificar('semana antiga: 8 h para a Ana', horasSemanaTrabalhador('w1', inicioSemana(diaAntigo)) === 8);
delete t.chamadas[diaAntigo];
guardarDB();

print('— Produção —');
t.producao.push({ id: 'p1', data: seg, grupoId: 'g1', grupoNome: 'Grupo 1', pomarId: 'pomA', palotes: 4 });
t.producao.push({ id: 'p2', data: seg, grupoId: 'g1', grupoNome: 'Grupo 1', pomarId: 'pomB', palotes: 3 });
guardarDB();
var totDia = totaisProducao(producaoEntre(seg, seg));
verificar('kg automáticos: 4×250 + 3×280 = 1840 kg', totDia.kg === 1840 && totDia.palotes === 7);
verificar('agrupado por variedade (2 variedades)', agruparProducaoPorVariedade(t.producao).length === 2);

print('— Stock e entregas —');
var stock0 = stockPorVariedade();
var stockPera = stock0.find(function(s){ return s.variedade.id === peraRocha.id; });
verificar('stock inicial de pera = 4 palotes (1000 kg)', stockPera.stock === 4 && stockPera.kg === 1000);
t.entregas.push({ id: 'ent1', data: ter, pomarId: 'pomA', palotes: 3 });
guardarDB();
verificar('após entrega de 3, stock de pera = 1', stockDaVariedade(peraRocha.id) === 1);
var stockSeg = stockPorVariedade(seg).find(function(s){ return s.variedade.id === peraRocha.id; });
verificar('stock à data de segunda = 4 (entrega só na terça)', stockSeg.stock === 4);

print('— Salários por horas —');
var sal = calcularSalariosSemana(seg);
var linhaAna = sal.linhas.find(function(l){ return l.trabalhador.id === 'w1'; });
var linhaBruno = sal.linhas.find(function(l){ return l.trabalhador.id === 'w2'; });
var linhaCarlos = sal.linhas.find(function(l){ return l.trabalhador.id === 'w3'; });
verificar('Ana: 16 h = 2 dias × 60€ = 120€', linhaAna.horas === 16 && linhaAna.total === 120);
verificar('Bruno: 4 h = 0,5 dia × 60€ = 30€ (ausência não conta)', linhaBruno.total === 30);
verificar('Carlos (líder): 16 h × 75€/dia = 150€', linhaCarlos.total === 150);
verificar('total geral = 300€', sal.totalGeral === 300);
definirChamada(somarDias(seg, 2), 'w1', { horas: 6, grupoId: 'g1' });
verificar('horas intermédias: +6 h → 120 + 45 = 165€ para a Ana',
  calcularSalariosSemana(seg).linhas.find(function(l){ return l.trabalhador.id === 'w1'; }).total === 165);
definirChamada(somarDias(seg, 2), 'w1', null);
verificar('semana aparece na lista de semanas', semanasDaTemporada().indexOf(seg) !== -1);

print('— Média de kg por pessoa via chamada —');
var presG = presentesDoGrupo('g1', seg);
verificar('grupo na segunda: 3 pessoas, 20 h, 2,5 dias equivalentes',
  presG.pessoas === 3 && presG.horas === 20 && presG.equivalente === 2.5);
verificar('média do grupo = 1840 ÷ 2,5 = 736 kg/pessoa', 1840 / presG.equivalente === 736);
verificar('composição do dia tem 3 nomes', composicaoDoGrupoNoDia('g1', seg).length === 3);

print('— Trabalhador da casa (valor diário próprio) —');
t.trabalhadores.push({ id: 'w4', nome: 'Dona da Casa', tipo: 'trabalhador', repetido: false, ativo: true, valorDiarioProprio: 50 });
definirChamada(seg, 'w4', { horas: 8, grupoId: 'g1' });
verificar('valor diário usa o personalizado (50€, não 60€)', valorDiarioDoTrabalhador(trabalhadorPorId('w4')) === 50);
var sal2 = calcularSalariosSemana(seg);
verificar('salário da semana: 8 h × 50€/dia = 50€',
  sal2.linhas.find(function(l){ return l.trabalhador.id === 'w4'; }).total === 50);
verificar('total geral passa a 350€ (300 + 50)', sal2.totalGeral === 350);

print('— Caixa —');
var cx = caixaDaTemporada();
verificar('caixa começa a 0 (com migração automática)', cx.valor === 0);
cx.valor = 400; cx.atualizadoEm = seg; guardarDB();
verificar('caixa 400€ vs 350€ a pagar → sobram 50€', caixaDaTemporada().valor - sal2.totalGeral === 50);

print('— Custos de empresas externas —');
t.registoEmpresas[ter] = { e1: 3 };
guardarDB();
var custos = custosEmpresasSemana(seg);
verificar('AgriTemp: 8 pessoas-dia × 10€ = 80€',
  custos.linhas[0].pessoasDia === 8 && custos.linhas[0].total === 80);
verificar('total geral da semana = 80€', custos.totalGeral === 80 && custos.totalPessoasDia === 8);

print('— Hectares e toneladas por hectare —');
verificar('hectares do Pomar da Eira = 2', hectaresDoPomarPorNome('Pomar da Eira') === 2);
verificar('1000 kg em 2 ha = 0,5 t/ha', tonPorHectare(1000, 2) === 0.5);
verificar('sem hectares → sem indicador', tonPorHectare(1000, null) === null &&
  hectaresDoPomarPorNome('Pomar Novo') === null);

print('— Fecho de temporada e reconhecimento de repetidos —');
var anoAtual = t.ano;
fecharTemporadaAtual();
verificar('temporada marcada como fechada', temporada().fechada === true);
var histAna = procurarHistoricoTrabalhador('ana silva');
verificar('histórico de Ana guardado (16 h = 2 dias)',
  histAna && histAna.anos[String(anoAtual)].dias === 2);
var histPom = dadosHistoricoPomares();
verificar('histórico do pomar da Eira tem ' + anoAtual + ' = 1000 kg',
  histPom.valores['Pomar da Eira'][String(anoAtual)] === 1000);

criarTemporada(anoAtual + 1);
var t2 = temporada();
verificar('nova temporada herda config, pomares (com hectares) e empresas, sem trabalhadores',
  t2.ano === anoAtual + 1 && t2.config.valorDiarioTrabalhador === 60 &&
  t2.pomares.length === 2 && t2.pomares[0].hectares === 2 &&
  t2.empresas.length === 1 && t2.empresas[0].valorPorPessoaDia === 10 &&
  t2.trabalhadores.length === 0);
verificar('na nova temporada, Ana é reconhecida como repetida',
  procurarHistoricoTrabalhador('Ana Silva') !== null);
verificar('hectares continuam acessíveis para t/ha de anos anteriores',
  hectaresDoPomarPorNome('Pomar da Eira') === 2);

print('');
if (falhas === 0) print('✅ TODOS OS TESTES PASSARAM');
else print('❌ ' + falhas + ' teste(s) falharam');
