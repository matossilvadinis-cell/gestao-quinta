// vista-chamada.js — chamada diária (presenças) e pessoas de empresas externas
'use strict';

(function(){

  let dataSel = hojeISO();

  Vistas.chamada = { render: render };

  function render(el){
    const t = temporada();
    const trabs = ordenarTrabalhadores(trabalhadoresAtivos());
    const reg = t.chamadas[dataSel] || {};
    const resumo = resumoChamadaDia(dataSel);
    const registoEmp = t.registoEmpresas[dataSel] || {};

    const linhasTrabs = trabs.length === 0
      ? '<div class="vazio">Não há trabalhadores ativos. Registe-os primeiro no separador Trabalhadores.</div>'
      : '<div class="tabela-envolver"><table class="tabela"><thead><tr>' +
        '<th>Nome</th><th>Tipo</th><th>Presença</th></tr></thead><tbody>' +
        trabs.map(function(tr){
          const e = reg[tr.id] || null;
          return '<tr><td>' + esc(tr.nome) + '</td>' +
            '<td><span class="badge ' + (tr.tipo === 'lider' ? 'badge-lider' : 'badge-trab') + '">' +
              (tr.tipo === 'lider' ? 'Líder' : 'Trabalhador') + '</span></td>' +
            '<td><div class="seg" data-trab="' + tr.id + '">' +
              '<button type="button" class="seg-btn seg-p' + (e === 'P' ? ' ativo' : '') + '" data-estado="P">Presente</button>' +
              '<button type="button" class="seg-btn seg-m' + (e === 'M' ? ' ativo' : '') + '" data-estado="M">Meio-dia</button>' +
              '<button type="button" class="seg-btn seg-a' + (e === 'A' ? ' ativo' : '') + '" data-estado="A">Ausente</button>' +
            '</div></td></tr>';
        }).join('') + '</tbody></table></div>';

    const empresasHtml = t.empresas.length === 0
      ? '<div class="vazio">Não há empresas externas registadas. Pode adicioná-las no separador Trabalhadores.</div>'
      : '<div class="linha-form">' +
        t.empresas.map(function(emp){
          return '<div class="campo"><label>' + esc(emp.nome) + ' — nº de pessoas</label>' +
            '<input type="number" min="0" step="1" data-empresa="' + emp.id + '" value="' +
            (registoEmp[emp.id] != null ? registoEmp[emp.id] : '') + '" placeholder="0"></div>';
        }).join('') +
        '</div><p class="suave">O número fica guardado automaticamente ao sair do campo.</p>';

    el.innerHTML =
      '<div class="cabecalho-vista"><h2>✅ Chamada diária</h2></div>' +

      '<div class="cartao">' +
        '<div class="linha-data">' +
          '<button class="btn btn-sec btn-pq" id="dia-ant" title="Dia anterior">◀</button>' +
          '<input type="date" id="data-chamada" value="' + dataSel + '">' +
          '<button class="btn btn-sec btn-pq" id="dia-seg" title="Dia seguinte">▶</button>' +
          '<span class="dia-semana">' + nomeDiaSemana(dataSel) + '</span>' +
          '<span style="flex:1"></span>' +
          '<button class="btn btn-pq" id="hoje-btn">Hoje</button>' +
          '<button class="btn btn-pq" id="todos-presentes" title="Marca como presentes todos os que ainda não têm registo neste dia">Marcar todos presentes</button>' +
        '</div>' +
        '<div class="resumo-chips">' +
          '<span class="chip chip-verde">✓ ' + fmtNum(resumo.presentes) + ' presentes</span>' +
          '<span class="chip chip-laranja">½ ' + fmtNum(resumo.meios) + ' meio-dia</span>' +
          '<span class="chip chip-vermelho">✗ ' + fmtNum(resumo.ausentes) + ' ausentes</span>' +
          '<span class="chip">' + fmtNum(resumo.semRegisto) + ' sem registo</span>' +
          '<span class="chip chip-azul">🏢 ' + fmtNum(resumo.externos) + ' de empresas</span>' +
        '</div>' +
        linhasTrabs +
      '</div>' +

      '<div class="cartao"><h3>🏢 Empresas externas — pessoas enviadas em ' + formatarData(dataSel) + '</h3>' +
        empresasHtml +
      '</div>';

    // Navegação de datas
    el.querySelector('#dia-ant').addEventListener('click', function(){
      dataSel = somarDias(dataSel, -1);
      rerender();
    });
    el.querySelector('#dia-seg').addEventListener('click', function(){
      dataSel = somarDias(dataSel, 1);
      rerender();
    });
    el.querySelector('#hoje-btn').addEventListener('click', function(){
      dataSel = hojeISO();
      rerender();
    });
    el.querySelector('#data-chamada').addEventListener('change', function(ev){
      dataSel = ev.target.value || hojeISO();
      rerender();
    });

    // Marcar todos presentes (apenas quem não tem registo)
    el.querySelector('#todos-presentes').addEventListener('click', function(){
      const atual = temporada().chamadas[dataSel] || {};
      let marcados = 0;
      trabalhadoresAtivos().forEach(function(tr){
        if (!atual[tr.id]) {
          definirChamada(dataSel, tr.id, 'P');
          marcados++;
        }
      });
      if (marcados > 0) toast(marcados + ' trabalhador(es) marcados como presentes.');
      rerender();
    });

    // Botões de presença (clicar no estado ativo limpa o registo)
    el.querySelectorAll('.seg[data-trab]').forEach(function(seg){
      seg.querySelectorAll('.seg-btn').forEach(function(btn){
        btn.addEventListener('click', function(){
          const id = seg.dataset.trab;
          const atual = estadoChamada(dataSel, id);
          const novo = btn.dataset.estado === atual ? null : btn.dataset.estado;
          definirChamada(dataSel, id, novo);
          rerender();
        });
      });
    });

    // Pessoas das empresas externas
    el.querySelectorAll('input[data-empresa]').forEach(function(inp){
      inp.addEventListener('change', function(){
        const t2 = temporada();
        if (!t2.registoEmpresas[dataSel]) t2.registoEmpresas[dataSel] = {};
        const n = Math.max(0, parseInt(inp.value, 10) || 0);
        if (n === 0) delete t2.registoEmpresas[dataSel][inp.dataset.empresa];
        else t2.registoEmpresas[dataSel][inp.dataset.empresa] = n;
        if (Object.keys(t2.registoEmpresas[dataSel]).length === 0) delete t2.registoEmpresas[dataSel];
        guardarDB();
        rerender();
      });
    });
  }

})();
