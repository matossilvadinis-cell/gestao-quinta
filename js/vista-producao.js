// vista-producao.js — registo de produção diária por grupo (vários lotes/pomares por dia)
'use strict';

(function(){

  let dataSel = hojeISO();

  Vistas.producao = { render: render };

  function render(el){
    const t = temporada();
    const pomares = pomaresAtivos();
    const regsDia = t.producao.filter(function(r){ return r.data === dataSel; });
    const totDia = totaisProducao(regsDia);
    const porVarDia = agruparProducaoPorVariedade(regsDia);

    const opcoesPomar = pomares.map(function(p){
      const v = variedadePorId(p.variedadeId);
      return '<option value="' + p.id + '">' + esc(p.nome) + (v ? ' — ' + esc(v.nome) : '') + '</option>';
    }).join('');

    let corpo = '';

    if (t.grupos.length === 0) {
      corpo = '<div class="aviso aviso-atencao">⚠️ Ainda não há grupos criados. ' +
        '<button class="btn btn-pq" data-nav="grupos">Ir a Grupos</button></div>';
    } else if (pomares.length === 0) {
      corpo = '<div class="aviso aviso-atencao">⚠️ Não há pomares ativos configurados. ' +
        '<button class="btn btn-pq" data-nav="configuracao">Ir à Configuração</button></div>';
    } else {
      corpo = t.grupos.map(function(g){
        const lider = trabalhadorPorId(g.liderId);
        const lotes = regsDia.filter(function(r){ return r.grupoId === g.id; });
        const totGrupo = totaisProducao(lotes);
        const pres = presentesDoGrupo(g.id, dataSel);
        const media = pres.equivalente > 0 ? totGrupo.kg / pres.equivalente : null;
        const linhaMedia = '<div class="resumo-chips">' +
          '<span class="chip">👥 ' + fmtNum(pres.pessoas) + ' pessoas no dia · ' + fmtHoras(pres.horas) + '</span>' +
          '<span class="chip ' + (media != null ? 'chip-verde' : '') + '">📊 Média: ' +
            (media != null ? fmtNum(media) + ' kg/pessoa' : '—') + '</span>' +
        '</div>';

        const linhasLotes = lotes.length === 0
          ? '<div class="vazio">Sem lotes registados neste dia.</div>'
          : '<div class="tabela-envolver"><table class="tabela"><thead><tr>' +
            '<th>Pomar</th><th>Variedade</th><th class="num">Palotes</th><th class="num">Kg</th><th></th></tr></thead><tbody>' +
            lotes.map(function(r){
              const p = pomarPorId(r.pomarId);
              const v = variedadeDoPomar(r.pomarId);
              return '<tr><td>' + esc(p ? p.nome : '—') + '</td>' +
                '<td>' + esc(v ? v.nome : '—') + '</td>' +
                '<td class="num">' + fmtNum(r.palotes) + '</td>' +
                '<td class="num">' + fmtKg(kgDeRegisto(r)) + '</td>' +
                '<td class="texto-direita"><button class="btn btn-perigo btn-pq" data-remover-lote="' + r.id + '">Remover</button></td></tr>';
            }).join('') +
            '</tbody><tfoot><tr><td colspan="2">Total do grupo</td>' +
            '<td class="num">' + fmtNum(totGrupo.palotes) + '</td>' +
            '<td class="num">' + fmtKg(totGrupo.kg) + '</td><td></td></tr></tfoot></table></div>';

        return '<div class="cartao">' +
          '<h3>👥 ' + esc(g.nome) +
            ' <span class="suave">— líder: ' + esc(lider ? lider.nome : '—') + '</span></h3>' +
          linhaMedia +
          linhasLotes +
          '<div class="linha-form" style="margin-top:10px">' +
            '<div class="campo"><label>Pomar</label><select data-grupo-pomar="' + g.id + '">' + opcoesPomar + '</select></div>' +
            '<div class="campo"><label>Nº de palotes</label><input type="number" min="1" step="1" data-grupo-palotes="' + g.id + '" placeholder="0"></div>' +
            '<button class="btn" data-adicionar-lote="' + g.id + '">+ Adicionar lote</button>' +
          '</div>' +
        '</div>';
      }).join('');

      // Lotes do dia de grupos entretanto removidos
      const orfaos = regsDia.filter(function(r){ return !grupoPorId(r.grupoId); });
      if (orfaos.length > 0) {
        corpo += '<div class="cartao"><h3>📋 Registos de grupos removidos</h3>' +
          '<div class="tabela-envolver"><table class="tabela"><thead><tr>' +
          '<th>Grupo</th><th>Pomar</th><th class="num">Palotes</th><th class="num">Kg</th><th></th></tr></thead><tbody>' +
          orfaos.map(function(r){
            const p = pomarPorId(r.pomarId);
            return '<tr><td>' + esc(r.grupoNome || '—') + '</td><td>' + esc(p ? p.nome : '—') + '</td>' +
              '<td class="num">' + fmtNum(r.palotes) + '</td>' +
              '<td class="num">' + fmtKg(kgDeRegisto(r)) + '</td>' +
              '<td class="texto-direita"><button class="btn btn-perigo btn-pq" data-remover-lote="' + r.id + '">Remover</button></td></tr>';
          }).join('') + '</tbody></table></div></div>';
      }
    }

    el.innerHTML =
      '<div class="cabecalho-vista"><h2>🧺 Produção diária</h2></div>' +

      '<div class="cartao">' +
        '<div class="linha-data">' +
          '<button class="btn btn-sec btn-pq" id="dia-ant">◀</button>' +
          '<input type="date" id="data-producao" value="' + dataSel + '">' +
          '<button class="btn btn-sec btn-pq" id="dia-seg">▶</button>' +
          '<span class="dia-semana">' + nomeDiaSemana(dataSel) + '</span>' +
          '<span style="flex:1"></span>' +
          '<button class="btn btn-pq" id="hoje-btn">Hoje</button>' +
          '<button class="btn btn-sec btn-pq" id="pdf-dia">📄 Resumo do dia (PDF)</button>' +
        '</div>' +
        '<div class="resumo-chips">' +
          '<span class="chip chip-verde">Total do dia: ' + fmtNum(totDia.palotes) + ' palotes · ' + fmtKg(totDia.kg) + '</span>' +
          porVarDia.map(function(x){
            return '<span class="chip">' + esc(x.variedade.nome) + ': ' + fmtNum(x.palotes) + ' palotes (' + fmtKg(x.kg) + ')</span>';
          }).join('') +
        '</div>' +
        '<p class="suave">Um grupo pode ter vários lotes no mesmo dia — registe um lote por cada pomar onde o grupo apanhou. ' +
        'Os kg são calculados automaticamente (palotes × peso fixo da variedade).</p>' +
      '</div>' +

      corpo;

    // Navegação de datas
    el.querySelector('#dia-ant').addEventListener('click', function(){ dataSel = somarDias(dataSel, -1); rerender(); });
    el.querySelector('#dia-seg').addEventListener('click', function(){ dataSel = somarDias(dataSel, 1); rerender(); });
    el.querySelector('#hoje-btn').addEventListener('click', function(){ dataSel = hojeISO(); rerender(); });
    el.querySelector('#pdf-dia').addEventListener('click', function(){ gerarResumoDiarioPDF(dataSel); });
    el.querySelector('#data-producao').addEventListener('change', function(ev){
      dataSel = ev.target.value || hojeISO();
      rerender();
    });

    el.querySelectorAll('[data-nav]').forEach(function(b){
      b.addEventListener('click', function(){ navegar(b.dataset.nav); });
    });

    // Adicionar lote
    el.querySelectorAll('[data-adicionar-lote]').forEach(function(btn){
      btn.addEventListener('click', function(){
        const grupoId = btn.dataset.adicionarLote;
        const grupo = grupoPorId(grupoId);
        const selPomar = el.querySelector('select[data-grupo-pomar="' + grupoId + '"]');
        const inpPalotes = el.querySelector('input[data-grupo-palotes="' + grupoId + '"]');
        const pomarId = selPomar.value;
        const palotes = parseInt(inpPalotes.value, 10);
        if (!pomarId) { toast('Escolha o pomar.', 'erro'); return; }
        if (!palotes || palotes <= 0) { toast('Indique um número de palotes válido.', 'erro'); return; }
        temporada().producao.push({
          id: uid(),
          data: dataSel,
          grupoId: grupoId,
          grupoNome: grupo ? grupo.nome : '',
          pomarId: pomarId,
          palotes: palotes
        });
        guardarDB();
        const v = variedadeDoPomar(pomarId);
        toast('Lote registado: ' + palotes + ' palotes' + (v ? ' (' + fmtKg(palotes * v.pesoPalote) + ')' : '') + '.');
        rerender();
      });
    });

    // Remover lote
    el.querySelectorAll('[data-remover-lote]').forEach(function(btn){
      btn.addEventListener('click', function(){
        if (!confirm('Remover este lote de produção?')) return;
        const t2 = temporada();
        const i = t2.producao.findIndex(function(r){ return r.id === btn.dataset.removerLote; });
        if (i >= 0) {
          t2.producao.splice(i, 1);
          guardarDB();
          toast('Lote removido.');
        }
        rerender();
      });
    });
  }

})();
