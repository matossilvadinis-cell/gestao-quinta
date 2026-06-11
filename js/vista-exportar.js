// vista-exportar.js — exportação de relatórios Excel (salários e produção semanais)
'use strict';

(function(){

  let semanaSel = null;

  Vistas.exportar = { render: render };

  function envolverExcel(nomeFolha, tabelaHtml){
    return '﻿<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
      'xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8">' +
      '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>' +
      '<x:Name>' + nomeFolha + '</x:Name>' +
      '<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>' +
      '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->' +
      '<style>table{border-collapse:collapse} td,th{border:1px solid #999;padding:4px 8px;' +
      'font-family:Arial;font-size:12px} th{background:#e8f5e9;font-weight:bold}</style>' +
      '</head><body>' + tabelaHtml + '</body></html>';
  }

  function exportarSalarios(semana){
    const res = calcularSalariosSemana(semana);
    const linhas = res.linhas.filter(function(l){ return l.diasPagos > 0; });
    if (linhas.length === 0) {
      toast('Não há presenças registadas nesta semana — nada para exportar.', 'erro');
      return;
    }
    const tabela =
      '<table>' +
      '<tr><th colspan="6">Resumo salarial — ' + rotuloSemana(semana) + ' ' + temporada().ano +
        ' (pagamento: sábado, ' + formatarData(sabadoDaSemana(semana)) + ')</th></tr>' +
      '<tr><th>Nome</th><th>Tipo</th><th>Horas trabalhadas</th>' +
      '<th>Dias equivalentes</th><th>Valor diário (€)</th><th>Total a pagar (€)</th></tr>' +
      linhas.map(function(l){
        return '<tr><td>' + esc(l.trabalhador.nome) + '</td>' +
          '<td>' + (l.trabalhador.tipo === 'lider' ? 'Líder' : 'Trabalhador') + '</td>' +
          '<td>' + fmtNum(l.horas, 1) + '</td>' +
          '<td>' + fmtNum(l.diasPagos, 2) + '</td>' +
          '<td>' + fmtNum(l.valorDia, 2) + '</td>' +
          '<td>' + fmtNum(l.total, 2) + '</td></tr>';
      }).join('') +
      '<tr><th colspan="5">Total geral</th><th>' + fmtNum(res.totalGeral, 2) + '</th></tr>' +
      '</table>';
    descarregarFicheiro('salarios_semana_' + semana + '.xls',
      envolverExcel('Salarios', tabela), 'application/vnd.ms-excel');
    toast('Relatório salarial exportado.');
  }

  function exportarProducao(semana){
    const t = temporada();
    const fim = somarDias(semana, 6);
    const regs = producaoEntre(semana, fim);
    if (regs.length === 0) {
      toast('Não há produção registada nesta semana — nada para exportar.', 'erro');
      return;
    }
    const porVar = agruparProducaoPorVariedade(regs);
    const porPomar = agruparProducaoPorPomar(regs);
    const totSemana = totaisProducao(regs);
    const acumulado = totaisProducao(t.producao.filter(function(r){ return r.data <= fim; }));

    const tabela =
      '<table>' +
      '<tr><th colspan="4">Produção semanal — ' + rotuloSemana(semana) + ' ' + t.ano + '</th></tr>' +
      '<tr><th colspan="4">Por variedade</th></tr>' +
      '<tr><th>Variedade</th><th>Palotes</th><th>Kg</th><th>Peso por palote (kg)</th></tr>' +
      porVar.map(function(x){
        return '<tr><td>' + esc(x.variedade.nome) + '</td>' +
          '<td>' + fmtNum(x.palotes) + '</td>' +
          '<td>' + fmtNum(x.kg) + '</td>' +
          '<td>' + fmtNum(x.variedade.pesoPalote) + '</td></tr>';
      }).join('') +
      '<tr><th colspan="4">Por pomar</th></tr>' +
      '<tr><th>Pomar</th><th>Variedade</th><th>Palotes</th><th>Kg</th></tr>' +
      porPomar.map(function(x){
        return '<tr><td>' + esc(x.pomar.nome) + '</td>' +
          '<td>' + esc(x.variedade ? x.variedade.nome : '—') + '</td>' +
          '<td>' + fmtNum(x.palotes) + '</td>' +
          '<td>' + fmtNum(x.kg) + '</td></tr>';
      }).join('') +
      '<tr><th colspan="2">Total da semana</th><th>' + fmtNum(totSemana.palotes) + '</th><th>' + fmtNum(totSemana.kg) + '</th></tr>' +
      '<tr><th colspan="2">Acumulado da temporada (até ' + formatarData(fim) + ')</th>' +
      '<th>' + fmtNum(acumulado.palotes) + '</th><th>' + fmtNum(acumulado.kg) + '</th></tr>' +
      '</table>';
    descarregarFicheiro('producao_semana_' + semana + '.xls',
      envolverExcel('Producao', tabela), 'application/vnd.ms-excel');
    toast('Relatório de produção exportado.');
  }

  function exportarEmpresas(semana){
    const custos = custosEmpresasSemana(semana);
    if (custos.linhas.length === 0) {
      toast('Não há empresas externas registadas — nada para exportar.', 'erro');
      return;
    }
    const tabela =
      '<table>' +
      '<tr><th colspan="4">Custos de empresas externas — ' + rotuloSemana(semana) + ' ' + temporada().ano + '</th></tr>' +
      '<tr><th>Empresa</th><th>Pessoas-dia</th><th>Valor por pessoa-dia (€)</th><th>Total a pagar (€)</th></tr>' +
      custos.linhas.map(function(l){
        return '<tr><td>' + esc(l.empresa.nome) + '</td>' +
          '<td>' + fmtNum(l.pessoasDia) + '</td>' +
          '<td>' + fmtNum(l.valor, 2) + '</td>' +
          '<td>' + fmtNum(l.total, 2) + '</td></tr>';
      }).join('') +
      '<tr><th>Total geral</th><th>' + fmtNum(custos.totalPessoasDia) + '</th><th></th>' +
      '<th>' + fmtNum(custos.totalGeral, 2) + '</th></tr>' +
      '</table>';
    descarregarFicheiro('empresas_semana_' + semana + '.xls',
      envolverExcel('Empresas', tabela), 'application/vnd.ms-excel');
    toast('Relatório de empresas externas exportado.');
  }

  // Disponível para outras vistas (ex.: botões nas vistas de salários e empresas)
  window.exportarRelatorioSalarios = exportarSalarios;
  window.exportarRelatorioProducao = exportarProducao;
  window.exportarRelatorioEmpresas = exportarEmpresas;

  function render(el){
    const semanas = semanasDaTemporada();
    if (!semanaSel || semanas.indexOf(semanaSel) === -1) semanaSel = semanas[0];

    const opcoes = semanas.map(function(s){
      return '<option value="' + s + '"' + (s === semanaSel ? ' selected' : '') + '>' + rotuloSemana(s) + '</option>';
    }).join('');

    el.innerHTML =
      '<div class="cabecalho-vista"><h2>📤 Exportação Excel</h2></div>' +

      '<div class="cartao">' +
        '<div class="linha-form">' +
          '<div class="campo"><label>Semana a exportar</label><select id="sel-semana-exp">' + opcoes + '</select></div>' +
        '</div>' +
        '<p class="suave">Os ficheiros são descarregados em formato Excel (.xls) e abrem diretamente no Microsoft Excel ou LibreOffice.</p>' +
      '</div>' +

      '<div class="grelha grelha-2">' +
        '<div class="cartao"><h3>💶 Resumo salarial semanal</h3>' +
          '<p>Nome, tipo, dias trabalhados (completos e meios-dias), valor diário e total a pagar por pessoa, ' +
          'com o total geral da semana.</p>' +
          '<button class="btn" id="exp-salarios">📥 Descarregar relatório salarial</button></div>' +
        '<div class="cartao"><h3>🧺 Produção semanal</h3>' +
          '<p>Kg e palotes por variedade e por pomar, total da semana e acumulado da temporada.</p>' +
          '<button class="btn" id="exp-producao">📥 Descarregar relatório de produção</button></div>' +
        '<div class="cartao"><h3>🏢 Custos de empresas externas</h3>' +
          '<p>Pessoas-dia por empresa na semana, valor por pessoa-dia e total a pagar a cada empresa.</p>' +
          '<button class="btn" id="exp-empresas">📥 Descarregar custos de empresas</button></div>' +
      '</div>' +

      '<div class="cartao"><h3>📄 Resumo diário (PDF)</h3>' +
        '<p>Presenças do dia (diretos e empresas), produção por grupo com média de kg por pessoa, ' +
        'totais por variedade e stock de palotes após o dia.</p>' +
        '<div class="linha-form">' +
          '<div class="campo"><label>Dia</label><input type="date" id="pdf-data" value="' + hojeISO() + '"></div>' +
          '<button class="btn" id="exp-pdf">📥 Descarregar resumo do dia</button>' +
        '</div>' +
      '</div>';

    el.querySelector('#sel-semana-exp').addEventListener('change', function(ev){
      semanaSel = ev.target.value;
    });
    el.querySelector('#exp-salarios').addEventListener('click', function(){
      exportarSalarios(semanaSel);
    });
    el.querySelector('#exp-producao').addEventListener('click', function(){
      exportarProducao(semanaSel);
    });
    el.querySelector('#exp-empresas').addEventListener('click', function(){
      exportarEmpresas(semanaSel);
    });
    el.querySelector('#exp-pdf').addEventListener('click', function(){
      const data = el.querySelector('#pdf-data').value || hojeISO();
      gerarResumoDiarioPDF(data);
    });
  }

})();
