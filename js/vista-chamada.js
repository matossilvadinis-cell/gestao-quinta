// vista-chamada.js — chamada diária por horas, grupo do dia e pessoas de empresas externas
'use strict';

(function(){

  let dataSel = hojeISO();

  Vistas.chamada = { render: render };

  function render(el){
    const t = temporada();
    const trabs = ordenarTrabalhadores(trabalhadoresAtivos());
    const resumo = resumoChamadaDia(dataSel);
    const registoEmp = t.registoEmpresas[dataSel] || {};
    const grupos = t.grupos;

    const linhasTrabs = trabs.length === 0
      ? '<div class="vazio">Não há trabalhadores ativos. Registe-os primeiro no separador Trabalhadores.</div>'
      : '<div class="tabela-envolver"><table class="tabela"><thead><tr>' +
        '<th>Nome</th><th>Tipo</th><th>Presença</th><th>Horas</th><th>Grupo do dia</th></tr></thead><tbody>' +
        trabs.map(function(tr){
          const r = registoChamada(dataSel, tr.id);
          const lidera = grupos.find(function(g){ return g.liderId === tr.id; }) || null;
          const presente = r && r.horas >= HORAS_DIA_COMPLETO;
          const ausente = r && r.horas === 0;
          const parcial = r && r.horas > 0 && r.horas < HORAS_DIA_COMPLETO;

          let seletorGrupo;
          if (lidera) {
            seletorGrupo = '<select disabled title="Líder — o grupo é fixo">' +
              '<option>' + esc(lidera.nome) + ' (líder)</option></select>';
          } else if (grupos.length === 0) {
            seletorGrupo = '<span class="suave">sem grupos criados</span>';
          } else {
            seletorGrupo = '<select data-grupo-chamada="' + tr.id + '">' +
              '<option value="">— sem grupo —</option>' +
              grupos.map(function(g){
                const sel = r && r.grupoId === g.id ? ' selected' : '';
                return '<option value="' + g.id + '"' + sel + '>' + esc(g.nome) + '</option>';
              }).join('') +
            '</select>';
          }

          return '<tr>' +
            '<td>' + esc(tr.nome) + '</td>' +
            '<td><span class="badge ' + (tr.tipo === 'lider' ? 'badge-lider' : 'badge-trab') + '">' +
              (tr.tipo === 'lider' ? 'Líder' : 'Trabalhador') + '</span></td>' +
            '<td><div class="seg" data-trab="' + tr.id + '">' +
              '<button type="button" class="seg-btn seg-p' + (presente ? ' ativo' : '') + '" data-presenca="P">Presente</button>' +
              '<button type="button" class="seg-btn seg-a' + (ausente ? ' ativo' : '') + '" data-presenca="A">Ausente</button>' +
            '</div>' + (parcial ? ' <span class="badge badge-repetido">parcial</span>' : '') + '</td>' +
            '<td><input type="number" min="0" max="16" step="0.5" data-horas="' + tr.id +
              '" value="' + (r ? r.horas : '') + '" placeholder="—" style="width:72px"> <span class="suave">h</span></td>' +
            '<td>' + seletorGrupo + '</td>' +
          '</tr>';
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
          '<button class="btn btn-pq" id="todos-presentes" title="Marca 8 h para todos os que ainda não têm registo neste dia">Marcar todos presentes</button>' +
        '</div>' +
        '<div class="resumo-chips">' +
          '<span class="chip chip-verde">✓ ' + fmtNum(resumo.completos) + ' dia completo</span>' +
          '<span class="chip chip-laranja">± ' + fmtNum(resumo.parciais) + ' parcial</span>' +
          '<span class="chip chip-vermelho">✗ ' + fmtNum(resumo.ausentes) + ' ausentes</span>' +
          '<span class="chip">' + fmtNum(resumo.semRegisto) + ' sem registo</span>' +
          '<span class="chip">⏱ ' + fmtHoras(resumo.horasTotais) + ' no total</span>' +
          '<span class="chip chip-azul">🏢 ' + fmtNum(resumo.externos) + ' de empresas</span>' +
        '</div>' +
        '<p class="suave">Presente = ' + HORAS_DIA_COMPLETO + ' h (editável). Pode registar qualquer valor intermédio (ex.: 4 h, 6 h) — ' +
        'o salário é proporcional às horas. O grupo escolhido aqui define a composição do grupo nesse dia ' +
        '(o líder pertence sempre ao seu grupo).</p>' +
        linhasTrabs +
      '</div>' +

      '<div class="cartao"><h3>🏢 Empresas externas — pessoas enviadas em ' + formatarData(dataSel) + '</h3>' +
        empresasHtml +
      '</div>';

    // Navegação de datas
    el.querySelector('#dia-ant').addEventListener('click', function(){ dataSel = somarDias(dataSel, -1); rerender(); });
    el.querySelector('#dia-seg').addEventListener('click', function(){ dataSel = somarDias(dataSel, 1); rerender(); });
    el.querySelector('#hoje-btn').addEventListener('click', function(){ dataSel = hojeISO(); rerender(); });
    el.querySelector('#data-chamada').addEventListener('change', function(ev){
      dataSel = ev.target.value || hojeISO();
      rerender();
    });

    // Marcar todos presentes (apenas quem não tem registo)
    el.querySelector('#todos-presentes').addEventListener('click', function(){
      let marcados = 0;
      trabalhadoresAtivos().forEach(function(tr){
        if (registoChamada(dataSel, tr.id)) return;
        definirChamada(dataSel, tr.id, { horas: HORAS_DIA_COMPLETO, grupoId: null });
        marcados++;
      });
      if (marcados > 0) toast(marcados + ' trabalhador(es) marcados com ' + HORAS_DIA_COMPLETO + ' h.');
      rerender();
    });

    // Botões Presente/Ausente (clicar no estado ativo limpa o registo)
    el.querySelectorAll('.seg[data-trab]').forEach(function(seg){
      seg.querySelectorAll('.seg-btn').forEach(function(btn){
        btn.addEventListener('click', function(){
          const id = seg.dataset.trab;
          const r = registoChamada(dataSel, id);
          if (btn.dataset.presenca === 'P') {
            if (r && r.horas >= HORAS_DIA_COMPLETO) definirChamada(dataSel, id, null);
            else definirChamada(dataSel, id, { horas: HORAS_DIA_COMPLETO, grupoId: r ? r.grupoId : null });
          } else {
            if (r && r.horas === 0) definirChamada(dataSel, id, null);
            else definirChamada(dataSel, id, { horas: 0, grupoId: null });
          }
          rerender();
        });
      });
    });

    // Horas trabalhadas (campo livre)
    el.querySelectorAll('input[data-horas]').forEach(function(inp){
      inp.addEventListener('change', function(){
        const id = inp.dataset.horas;
        const texto = String(inp.value).replace(',', '.').trim();
        if (texto === '') { definirChamada(dataSel, id, null); rerender(); return; }
        let h = parseFloat(texto);
        if (isNaN(h) || h < 0) { toast('Horas inválidas.', 'erro'); rerender(); return; }
        if (h > 16) h = 16;
        const r = registoChamada(dataSel, id);
        definirChamada(dataSel, id, { horas: h, grupoId: h > 0 && r ? r.grupoId : (h > 0 ? null : null) });
        rerender();
      });
    });

    // Grupo do dia
    el.querySelectorAll('select[data-grupo-chamada]').forEach(function(sel){
      sel.addEventListener('change', function(){
        const id = sel.dataset.grupoChamada;
        const r = registoChamada(dataSel, id);
        const grupoId = sel.value || null;
        // escolher um grupo implica presença: se não havia registo, assume dia completo
        const horas = r ? r.horas : HORAS_DIA_COMPLETO;
        definirChamada(dataSel, id, { horas: horas, grupoId: grupoId });
        rerender();
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
