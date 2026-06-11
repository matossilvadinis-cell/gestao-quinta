// vista-empresas.js — custos semanais das empresas externas (separado dos salários)
'use strict';

(function(){

  let semanaSel = null;

  Vistas.empresas = { render: render };

  function render(el){
    const t = temporada();
    const semanas = semanasDaTemporada();
    if (!semanaSel || semanas.indexOf(semanaSel) === -1) semanaSel = semanas[0];
    const custos = custosEmpresasSemana(semanaSel);

    const opcoesSemana = semanas.map(function(s){
      return '<option value="' + s + '"' + (s === semanaSel ? ' selected' : '') + '>' + rotuloSemana(s) + '</option>';
    }).join('');

    const semValor = t.empresas.filter(function(e){ return !(e.valorPorPessoaDia > 0); });

    const tabela = t.empresas.length === 0
      ? '<div class="vazio">Não há empresas externas registadas. Adicione-as no separador Trabalhadores.</div>'
      : '<div class="tabela-envolver"><table class="tabela"><thead><tr>' +
        '<th>Empresa</th><th class="num">Pessoas-dia na semana</th><th class="num">€/pessoa-dia</th><th class="num">Total a pagar</th></tr></thead><tbody>' +
        custos.linhas.map(function(l){
          const cls = l.pessoasDia === 0 ? ' class="linha-inativa"' : '';
          return '<tr' + cls + '><td>🏢 ' + esc(l.empresa.nome) + '</td>' +
            '<td class="num">' + fmtNum(l.pessoasDia) + '</td>' +
            '<td class="num">' + fmtEuro(l.valor) + '</td>' +
            '<td class="num"><strong>' + fmtEuro(l.total) + '</strong></td></tr>';
        }).join('') +
        '</tbody><tfoot><tr><td>Total geral da semana</td>' +
        '<td class="num">' + fmtNum(custos.totalPessoasDia) + '</td><td></td>' +
        '<td class="num">' + fmtEuro(custos.totalGeral) + '</td></tr></tfoot></table></div>';

    el.innerHTML =
      '<div class="cabecalho-vista"><h2>🏢 Custos de empresas externas</h2></div>' +

      '<div class="aviso aviso-info">ℹ️ Esta secção é independente dos salários dos trabalhadores diretos. ' +
      'O nº de pessoas por dia regista-se na <strong>Chamada</strong>; o €/pessoa-dia define-se em <strong>Trabalhadores</strong>.</div>' +

      (semValor.length > 0
        ? '<div class="aviso aviso-atencao">⚠️ Sem valor €/pessoa-dia definido: ' +
          semValor.map(function(e){ return esc(e.nome); }).join(', ') +
          ' — o total dessas empresas aparece a 0 €. <button class="btn btn-pq" data-nav="trabalhadores">Definir valores</button></div>'
        : '') +

      '<div class="cartao">' +
        '<div class="linha-form">' +
          '<div class="campo"><label>Semana</label><select id="sel-semana-emp">' + opcoesSemana + '</select></div>' +
          '<span style="flex:1"></span>' +
          '<button class="btn btn-sec" id="exportar-empresas">📤 Exportar Excel</button>' +
        '</div>' +
        tabela +
        '<p class="suave">Total a pagar = pessoas-dia da semana × valor por pessoa-dia. ' +
        'Use o seletor de semana para consultar o histórico.</p>' +
      '</div>';

    el.querySelectorAll('[data-nav]').forEach(function(b){
      b.addEventListener('click', function(){ navegar(b.dataset.nav); });
    });

    el.querySelector('#sel-semana-emp').addEventListener('change', function(ev){
      semanaSel = ev.target.value;
      rerender();
    });

    el.querySelector('#exportar-empresas').addEventListener('click', function(){
      exportarRelatorioEmpresas(semanaSel);
    });
  }

})();
