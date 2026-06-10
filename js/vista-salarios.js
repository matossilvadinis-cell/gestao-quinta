// vista-salarios.js — salários semanais (pagamento ao sábado)
'use strict';

(function(){

  let semanaSel = null;

  Vistas.salarios = { render: render };

  function render(el){
    const t = temporada();
    const semanas = semanasDaTemporada();
    if (!semanaSel || semanas.indexOf(semanaSel) === -1) semanaSel = semanas[0];

    const res = calcularSalariosSemana(semanaSel);
    const pagamento = t.pagamentos[semanaSel] || null;
    const sabado = sabadoDaSemana(semanaSel);

    const opcoesSemana = semanas.map(function(s){
      const pago = t.pagamentos[s] && t.pagamentos[s].pago;
      return '<option value="' + s + '"' + (s === semanaSel ? ' selected' : '') + '>' +
        rotuloSemana(s) + (pago ? ' — paga ✓' : '') + '</option>';
    }).join('');

    const avisoValores = (!t.config.valorDiarioTrabalhador || !t.config.valorDiarioLider)
      ? '<div class="aviso aviso-atencao">⚠️ Os valores diários ainda não estão definidos — os totais aparecem a zero. ' +
        '<button class="btn btn-pq" data-nav="configuracao">Ir à Configuração</button></div>'
      : '';

    const tabela = res.linhas.length === 0
      ? '<div class="vazio">Não há trabalhadores registados.</div>'
      : '<div class="tabela-envolver"><table class="tabela"><thead><tr>' +
        '<th>Nome</th><th>Tipo</th><th class="num">Dias completos</th><th class="num">Meios-dias</th>' +
        '<th class="num">Dias pagos</th><th class="num">Valor diário</th><th class="num">Total a pagar</th></tr></thead><tbody>' +
        res.linhas.map(function(l){
          const cls = l.diasPagos === 0 ? ' class="linha-inativa"' : '';
          return '<tr' + cls + '><td>' + esc(l.trabalhador.nome) + '</td>' +
            '<td><span class="badge ' + (l.trabalhador.tipo === 'lider' ? 'badge-lider' : 'badge-trab') + '">' +
              (l.trabalhador.tipo === 'lider' ? 'Líder' : 'Trabalhador') + '</span></td>' +
            '<td class="num">' + fmtNum(l.completos) + '</td>' +
            '<td class="num">' + fmtNum(l.meios) + '</td>' +
            '<td class="num">' + fmtDias(l.diasPagos) + '</td>' +
            '<td class="num">' + fmtEuro(l.valorDia) + '</td>' +
            '<td class="num"><strong>' + fmtEuro(l.total) + '</strong></td></tr>';
        }).join('') +
        '</tbody><tfoot><tr><td colspan="6">Total geral da semana</td>' +
        '<td class="num">' + fmtEuro(res.totalGeral) + '</td></tr></tfoot></table></div>';

    el.innerHTML =
      '<div class="cabecalho-vista"><h2>💶 Salários semanais</h2></div>' +

      avisoValores +

      '<div class="cartao">' +
        '<div class="linha-form">' +
          '<div class="campo"><label>Semana</label><select id="sel-semana">' + opcoesSemana + '</select></div>' +
          '<div class="campo"><label>Dia de pagamento</label>' +
            '<div style="padding:8px 0;font-weight:600">' + nomeDiaSemana(sabado) + ', ' + formatarData(sabado) + '</div></div>' +
          '<span style="flex:1"></span>' +
          (pagamento && pagamento.pago
            ? '<span class="badge badge-pago" style="font-size:.85rem;padding:6px 14px">✓ Paga em ' + formatarData(pagamento.em) + '</span>' +
              '<button class="btn btn-sec" id="desmarcar-pago">Desfazer</button>'
            : '<button class="btn" id="marcar-pago">Marcar semana como paga</button>') +
          '<button class="btn btn-sec" id="exportar-semana">📤 Exportar Excel</button>' +
        '</div>' +
        '<p class="suave">Cálculo automático com base na chamada: dia completo × valor diário; meio-dia × metade. ' +
        'Quem esteve ausente não recebe esse dia.</p>' +
        tabela +
      '</div>';

    el.querySelectorAll('[data-nav]').forEach(function(b){
      b.addEventListener('click', function(){ navegar(b.dataset.nav); });
    });

    el.querySelector('#sel-semana').addEventListener('change', function(ev){
      semanaSel = ev.target.value;
      rerender();
    });

    const btnPagar = el.querySelector('#marcar-pago');
    if (btnPagar) {
      btnPagar.addEventListener('click', function(){
        temporada().pagamentos[semanaSel] = { pago: true, em: hojeISO() };
        guardarDB();
        toast('Semana marcada como paga.');
        rerender();
      });
    }
    const btnDesfazer = el.querySelector('#desmarcar-pago');
    if (btnDesfazer) {
      btnDesfazer.addEventListener('click', function(){
        delete temporada().pagamentos[semanaSel];
        guardarDB();
        toast('Pagamento desmarcado.');
        rerender();
      });
    }
    el.querySelector('#exportar-semana').addEventListener('click', function(){
      exportarRelatorioSalarios(semanaSel);
    });
  }

})();
