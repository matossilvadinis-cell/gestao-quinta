// vista-pomares.js — histórico de produção por pomar (toneladas por temporada) e gráfico comparativo
'use strict';

(function(){

  const CORES = ['#81c784', '#4caf50', '#2e7d32', '#1b5e20', '#a1887f', '#6d4c41', '#90caf9', '#1976d2'];

  Vistas.pomares = { render: render };

  function render(el){
    const dados = dadosHistoricoPomares();
    const temDados = dados.pomares.length > 0;

    // Gráfico de barras agrupadas: um grupo por pomar, uma barra por ano
    let grafico = '<div class="vazio">Ainda não há dados de produção — registe produção ou adicione registos de anos anteriores abaixo.</div>';
    if (temDados) {
      let maxKg = 1;
      dados.pomares.forEach(function(p){
        dados.anos.forEach(function(a){
          const v = dados.valores[p][a];
          if (v && v > maxKg) maxKg = v;
        });
      });
      grafico =
        '<div class="legenda">' +
          dados.anos.map(function(a, i){
            return '<span class="legenda-item"><span class="legenda-cor" style="background:' +
              CORES[i % CORES.length] + '"></span>' + a + '</span>';
          }).join('') +
        '</div>' +
        '<div class="grafico-grupos">' +
          dados.pomares.map(function(p){
            return '<div class="grafico-grupo"><div class="grafico-barras">' +
              dados.anos.map(function(a, i){
                const kg = dados.valores[p][a];
                if (kg == null) return '<div class="grafico-barra vazia" style="width:34px"></div>';
                const altura = Math.max(5, Math.round(kg / maxKg * 170));
                const tha = tonPorHectare(kg, hectaresDoPomarPorNome(p));
                return '<div class="grafico-barra" style="height:' + altura + 'px;background:' +
                  CORES[i % CORES.length] + '" title="' + esc(p) + ' — ' + a + ': ' + fmtTon(kg) +
                  (tha != null ? ' (' + fmtNum(tha, 1) + ' t/ha)' : '') + '">' +
                  '<span>' + fmtNum(kg / 1000, 1) + '</span></div>';
              }).join('') +
            '</div><div class="grafico-rotulo">' + esc(p) + '</div></div>';
          }).join('') +
        '</div>' +
        '<p class="suave">Valores em toneladas. Passe o rato sobre as barras para ver o detalhe.</p>';

    }

    // Tabela pomar × ano (com toneladas/hectare quando os hectares estão definidos)
    let tabela = '';
    if (temDados) {
      tabela = '<div class="tabela-envolver"><table class="tabela"><thead><tr><th>Pomar</th><th class="num">Hectares</th>' +
        dados.anos.map(function(a){ return '<th class="num">' + a + '</th>'; }).join('') +
        '</tr></thead><tbody>' +
        dados.pomares.map(function(p){
          const ha = hectaresDoPomarPorNome(p);
          return '<tr><td>' + esc(p) + '</td>' +
            '<td class="num">' + (ha != null ? fmtNum(ha, 1) + ' ha' : '—') + '</td>' +
            dados.anos.map(function(a){
              const kg = dados.valores[p][a];
              if (kg == null) return '<td class="num">—</td>';
              const tha = tonPorHectare(kg, ha);
              return '<td class="num">' + fmtTon(kg) +
                (tha != null ? '<div class="suave" style="font-size:.75rem">' + fmtNum(tha, 1) + ' t/ha</div>' : '') +
                '</td>';
            }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>' +
        '<p class="suave">Os hectares definem-se na Configuração dos pomares; o indicador t/ha usa os hectares ' +
        'atuais do pomar, também para os anos anteriores.</p>';
    }

    // Registos históricos guardados manualmente / por fecho de temporada
    const registosGuardados = [];
    Object.keys(DB.historicoPomares).forEach(function(nome){
      Object.keys(DB.historicoPomares[nome]).forEach(function(ano){
        registosGuardados.push({ pomar: nome, ano: ano, kg: DB.historicoPomares[nome][ano] });
      });
    });
    registosGuardados.sort(function(a, b){
      if (a.ano !== b.ano) return b.ano.localeCompare(a.ano);
      return a.pomar.localeCompare(b.pomar, 'pt');
    });

    const listaGuardados = registosGuardados.length === 0
      ? '<div class="vazio">Sem registos de anos anteriores guardados.</div>'
      : '<div class="tabela-envolver"><table class="tabela"><thead><tr>' +
        '<th>Ano</th><th>Pomar</th><th class="num">Produção</th><th></th></tr></thead><tbody>' +
        registosGuardados.map(function(r){
          return '<tr><td>' + r.ano + '</td><td>' + esc(r.pomar) + '</td>' +
            '<td class="num">' + fmtTon(r.kg) + '</td>' +
            '<td class="texto-direita"><button class="btn btn-perigo btn-pq" data-remover-hist="' +
            esc(r.pomar) + '|' + r.ano + '">Remover</button></td></tr>';
        }).join('') + '</tbody></table></div>';

    const nomesConhecidos = new Set(dados.pomares);
    temporada().pomares.forEach(function(p){ nomesConhecidos.add(p.nome); });

    el.innerHTML =
      '<div class="cabecalho-vista"><h2>🌳 Histórico de pomares</h2></div>' +

      '<div class="cartao"><h3>📈 Evolução ano a ano (toneladas por pomar)</h3>' + grafico + '</div>' +

      (tabela ? '<div class="cartao"><h3>📋 Produção por pomar e por temporada</h3>' + tabela +
        '<p class="suave">A temporada atual é calculada automaticamente a partir da produção registada. ' +
        'As temporadas anteriores vêm do fecho de temporada ou de registos manuais.</p></div>' : '') +

      '<div class="cartao"><h3>➕ Adicionar registo de ano anterior</h3>' +
        '<p class="suave">Para comparar com anos antes de começar a usar a aplicação.</p>' +
        '<div class="linha-form">' +
          '<div class="campo"><label>Pomar</label>' +
            '<input type="text" id="hist-pomar" list="lista-pomares" placeholder="Nome do pomar">' +
            '<datalist id="lista-pomares">' +
              Array.from(nomesConhecidos).sort().map(function(n){ return '<option value="' + esc(n) + '">'; }).join('') +
            '</datalist></div>' +
          '<div class="campo"><label>Ano</label><input type="number" id="hist-ano" min="2000" max="2100" value="' +
            (Number(temporada().ano) - 1) + '"></div>' +
          '<div class="campo"><label>Produção (toneladas)</label><input type="number" id="hist-ton" min="0" step="0.1" placeholder="0,0"></div>' +
          '<button class="btn" id="adicionar-hist">Guardar registo</button>' +
        '</div>' +
        listaGuardados +
      '</div>';

    el.querySelector('#adicionar-hist').addEventListener('click', function(){
      const pomar = el.querySelector('#hist-pomar').value.trim();
      const ano = parseInt(el.querySelector('#hist-ano').value, 10);
      const ton = parseFloat(String(el.querySelector('#hist-ton').value).replace(',', '.'));
      if (!pomar) { toast('Indique o nome do pomar.', 'erro'); return; }
      if (!ano || ano < 2000 || ano > 2100) { toast('Indique um ano válido.', 'erro'); return; }
      if (isNaN(ton) || ton < 0) { toast('Indique a produção em toneladas.', 'erro'); return; }
      if (!DB.historicoPomares[pomar]) DB.historicoPomares[pomar] = {};
      DB.historicoPomares[pomar][String(ano)] = ton * 1000;
      guardarDB();
      toast('Registo guardado: ' + pomar + ', ' + ano + ' — ' + fmtNum(ton, 1) + ' t.');
      rerender();
    });

    el.querySelectorAll('[data-remover-hist]').forEach(function(btn){
      btn.addEventListener('click', function(){
        const partes = btn.dataset.removerHist.split('|');
        const pomar = partes[0], ano = partes[1];
        if (!confirm('Remover o registo de ' + pomar + ' em ' + ano + '?')) return;
        if (DB.historicoPomares[pomar]) {
          delete DB.historicoPomares[pomar][ano];
          if (Object.keys(DB.historicoPomares[pomar]).length === 0) delete DB.historicoPomares[pomar];
          guardarDB();
          toast('Registo removido.');
        }
        rerender();
      });
    });
  }

})();
