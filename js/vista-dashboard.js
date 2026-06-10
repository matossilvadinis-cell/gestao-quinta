// vista-dashboard.js — visão geral da temporada
'use strict';

(function(){

  Vistas.dashboard = { render: render };

  function barrasHorizontais(itens){
    if (itens.length === 0) return '<div class="vazio">Ainda não há produção registada.</div>';
    const max = Math.max.apply(null, [1].concat(itens.map(function(i){ return i.kg; })));
    return itens.map(function(i){
      return '<div class="barra-linha">' +
        '<div class="barra-rotulo" title="' + esc(i.rotulo) + '">' + esc(i.rotulo) +
          (i.sub ? ' <span class="suave">· ' + esc(i.sub) + '</span>' : '') + '</div>' +
        '<div class="barra-fundo"><div class="barra-preenchida" style="width:' +
          Math.max(2, Math.round(i.kg / max * 100)) + '%"></div></div>' +
        '<div class="barra-valor">' + fmtKg(i.kg) + '</div>' +
      '</div>';
    }).join('');
  }

  function render(el){
    const t = temporada();
    const hoje = hojeISO();
    const iniSem = inicioSemana(hoje);

    const regsHoje = producaoEntre(hoje, hoje);
    const regsSemana = producaoEntre(iniSem, somarDias(iniSem, 6));
    const tHoje = totaisProducao(regsHoje);
    const tSemana = totaisProducao(regsSemana);
    const tTotal = totaisProducao(t.producao);

    const resumo = resumoChamadaDia(hoje);
    const presentesDiretos = resumo.presentes + resumo.meios;
    const stock = stockPorVariedade();

    const porVar = agruparProducaoPorVariedade(t.producao);
    const porPomar = agruparProducaoPorPomar(t.producao);

    // Próximo pagamento (sábado)
    let sab = sabadoDaSemana(hoje);
    if (hoje > sab) sab = somarDias(sab, 7);
    const salSemana = calcularSalariosSemana(inicioSemana(sab));

    // Entregas
    const entregas = t.entregas.slice().sort(function(a, b){
      return b.data.localeCompare(a.data);
    });
    const totalEntregue = entregas.reduce(function(s, e){ return s + e.palotes; }, 0);
    const entreguesPorVar = {};
    entregas.forEach(function(e){
      const v = variedadeDoPomar(e.pomarId);
      if (v) entreguesPorVar[v.nome] = (entreguesPorVar[v.nome] || 0) + e.palotes;
    });

    // Avisos de configuração inicial
    const avisos = [];
    if (t.pomares.length === 0) {
      avisos.push('Ainda não há pomares configurados. <button class="btn btn-pq" data-nav="configuracao">Ir à Configuração</button>');
    }
    if (!t.config.valorDiarioTrabalhador || !t.config.valorDiarioLider) {
      avisos.push('Defina os valores diários de pagamento (trabalhador e líder). <button class="btn btn-pq" data-nav="configuracao">Ir à Configuração</button>');
    }
    if (t.trabalhadores.length === 0) {
      avisos.push('Registe os trabalhadores diretos e as empresas externas. <button class="btn btn-pq" data-nav="trabalhadores">Ir a Trabalhadores</button>');
    }

    const stockHtml = stock.length === 0
      ? '<div class="vazio">Sem palotes em stock — ainda não há produção registada.</div>'
      : '<div class="tabela-envolver"><table class="tabela"><thead><tr>' +
        '<th>Variedade</th><th class="num">Em stock</th><th class="num">Kg</th><th class="num">Colhidos</th><th class="num">Entregues</th></tr></thead><tbody>' +
        stock.map(function(s){
          return '<tr><td>' + esc(s.variedade.nome) +
            ' <span class="badge ' + (s.variedade.tipoFruta === 'pera' ? 'badge-pera' : 'badge-maca') + '">' +
            rotuloTipoFruta(s.variedade.tipoFruta) + '</span></td>' +
            '<td class="num"><strong>' + fmtNum(s.stock) + '</strong> palotes</td>' +
            '<td class="num">' + fmtKg(s.kg) + '</td>' +
            '<td class="num">' + fmtNum(s.colhidos) + '</td>' +
            '<td class="num">' + fmtNum(s.entregues) + '</td></tr>';
        }).join('') + '</tbody></table></div>';

    const ultimasEntregas = entregas.slice(0, 5);
    const entregasHtml = entregas.length === 0
      ? '<div class="vazio">Ainda não foram feitas entregas à cooperativa.</div>'
      : '<p>' + fmtNum(entregas.length) + ' entrega(s), num total de <strong>' + fmtNum(totalEntregue) + ' palotes</strong>' +
        (Object.keys(entreguesPorVar).length
          ? ' — ' + Object.keys(entreguesPorVar).map(function(n){ return esc(n) + ': ' + fmtNum(entreguesPorVar[n]); }).join(' · ')
          : '') + '</p>' +
        '<div class="tabela-envolver"><table class="tabela"><thead><tr><th>Data</th><th>Pomar</th><th>Variedade</th><th class="num">Palotes</th></tr></thead><tbody>' +
        ultimasEntregas.map(function(e){
          const p = pomarPorId(e.pomarId);
          const v = variedadeDoPomar(e.pomarId);
          return '<tr><td>' + formatarData(e.data) + '</td><td>' + esc(p ? p.nome : '—') + '</td><td>' +
            esc(v ? v.nome : '—') + '</td><td class="num">' + fmtNum(e.palotes) + '</td></tr>';
        }).join('') + '</tbody></table></div>';

    el.innerHTML =
      '<div class="cabecalho-vista">' +
        '<h2>📊 Dashboard — Temporada ' + esc(t.ano) + (t.fechada ? ' <span class="badge badge-repetido">Fechada</span>' : '') + '</h2>' +
        '<div class="suave">' + nomeDiaSemana(hoje) + ', ' + formatarData(hoje) + '</div>' +
      '</div>' +

      avisos.map(function(a){ return '<div class="aviso aviso-atencao">⚠️ ' + a + '</div>'; }).join('') +

      '<div class="grelha grelha-4">' +
        '<div class="cartao stat"><div class="stat-rotulo">Colhido hoje</div>' +
          '<div class="stat-valor">' + fmtKg(tHoje.kg) + '</div>' +
          '<div class="stat-sub">' + fmtNum(tHoje.palotes) + ' palotes</div></div>' +
        '<div class="cartao stat"><div class="stat-rotulo">Esta semana</div>' +
          '<div class="stat-valor">' + fmtKg(tSemana.kg) + '</div>' +
          '<div class="stat-sub">' + fmtNum(tSemana.palotes) + ' palotes · ' + rotuloSemana(iniSem) + '</div></div>' +
        '<div class="cartao stat"><div class="stat-rotulo">Temporada</div>' +
          '<div class="stat-valor">' + fmtTon(tTotal.kg) + '</div>' +
          '<div class="stat-sub">' + fmtKg(tTotal.kg) + ' · ' + fmtNum(tTotal.palotes) + ' palotes</div></div>' +
        '<div class="cartao stat"><div class="stat-rotulo">Pessoas hoje</div>' +
          '<div class="stat-valor">' + fmtNum(presentesDiretos + resumo.externos) + '</div>' +
          '<div class="stat-sub">' + fmtNum(presentesDiretos) + ' diretos' +
          (resumo.meios ? ' (' + fmtNum(resumo.meios) + ' a meio-dia)' : '') +
          ' · ' + fmtNum(resumo.externos) + ' de empresas</div></div>' +
      '</div>' +

      '<div class="grelha grelha-2">' +
        '<div class="cartao"><h3>📦 Stock de palotes na quinta</h3>' + stockHtml +
          '<div style="margin-top:10px"><button class="btn btn-sec btn-pq" data-nav="stock">Ver stock e entregas</button></div></div>' +
        '<div class="cartao"><h3>💶 Próximo pagamento salarial</h3>' +
          '<p><strong>' + nomeDiaSemana(sab) + ', ' + formatarData(sab) + '</strong></p>' +
          '<p>Estimativa com as presenças registadas até agora: <strong>' + fmtEuro(salSemana.totalGeral) + '</strong></p>' +
          '<div class="resumo-chips">' +
            '<span class="chip chip-verde">' + fmtNum(resumo.presentes) + ' presentes hoje</span>' +
            (resumo.meios ? '<span class="chip chip-laranja">' + fmtNum(resumo.meios) + ' meio-dia</span>' : '') +
            (resumo.ausentes ? '<span class="chip chip-vermelho">' + fmtNum(resumo.ausentes) + ' ausentes</span>' : '') +
          '</div>' +
          '<button class="btn btn-sec btn-pq" data-nav="salarios">Ver salários da semana</button></div>' +
      '</div>' +

      '<div class="grelha grelha-2">' +
        '<div class="cartao"><h3>🍐 Produção por variedade (temporada)</h3>' +
          barrasHorizontais(porVar.map(function(x){
            return { rotulo: x.variedade.nome, sub: fmtNum(x.palotes) + ' palotes', kg: x.kg };
          })) + '</div>' +
        '<div class="cartao"><h3>🌳 Produção por pomar (temporada)</h3>' +
          barrasHorizontais(porPomar.map(function(x){
            return { rotulo: x.pomar.nome, sub: x.variedade ? x.variedade.nome : '', kg: x.kg };
          })) + '</div>' +
      '</div>' +

      '<div class="cartao"><h3>🚚 Entregas à cooperativa</h3>' + entregasHtml +
        '<div style="margin-top:10px"><button class="btn btn-sec btn-pq" data-nav="stock">Registar entrega</button></div></div>';

    el.querySelectorAll('[data-nav]').forEach(function(b){
      b.addEventListener('click', function(){ navegar(b.dataset.nav); });
    });
  }

})();
