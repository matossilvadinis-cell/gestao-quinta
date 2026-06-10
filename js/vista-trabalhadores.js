// vista-trabalhadores.js — trabalhadores diretos (novos/repetidos) e empresas externas
'use strict';

(function(){

  Vistas.trabalhadores = { render: render };

  function totalPessoasDiaEmpresa(empId){
    const re = temporada().registoEmpresas;
    let total = 0;
    Object.keys(re).forEach(function(d){
      total += parseInt(re[d][empId], 10) || 0;
    });
    return total;
  }

  function render(el){
    const t = temporada();
    const trabs = ordenarTrabalhadores(t.trabalhadores);

    const sugestoes = Object.keys(DB.historicoTrabalhadores).map(function(k){
      return '<option value="' + esc(DB.historicoTrabalhadores[k].nome) + '">';
    }).join('');

    const linhasTrabs = trabs.length === 0
      ? '<div class="vazio">Ainda não há trabalhadores registados.</div>'
      : '<div class="tabela-envolver"><table class="tabela"><thead><tr>' +
        '<th>Nome</th><th>Tipo</th><th>Origem</th><th class="num">€/dia próprio</th><th class="num">Dias nesta temporada</th><th>Ativo</th><th></th></tr></thead><tbody>' +
        trabs.map(function(tr){
          const d = diasTemporadaTrabalhador(tr.id);
          const dias = d.completos + d.meios * 0.5;
          const inativo = tr.ativo === false;
          const temProprio = tr.valorDiarioProprio != null && tr.valorDiarioProprio !== '';
          return '<tr' + (inativo ? ' class="linha-inativa"' : '') + '>' +
            '<td>' + esc(tr.nome) +
              (temProprio ? ' <span class="badge badge-pago" title="Valor diário personalizado">€ próprio</span>' : '') + '</td>' +
            '<td><select data-tipo="' + tr.id + '">' +
              '<option value="trabalhador"' + (tr.tipo === 'trabalhador' ? ' selected' : '') + '>Trabalhador</option>' +
              '<option value="lider"' + (tr.tipo === 'lider' ? ' selected' : '') + '>Líder</option>' +
            '</select></td>' +
            '<td><span class="badge ' + (tr.repetido ? 'badge-repetido' : 'badge-novo') + '">' +
              (tr.repetido ? 'Repetido' : 'Novo') + '</span></td>' +
            '<td class="num"><input type="number" min="0" step="0.5" data-valor-proprio="' + tr.id +
              '" value="' + (temProprio ? tr.valorDiarioProprio : '') + '" placeholder="geral" style="width:90px" ' +
              'title="Vazio = usa o valor geral da temporada (' + fmtEuro(valorDiarioDoTrabalhador({ tipo: tr.tipo })) + ')"></td>' +
            '<td class="num">' + fmtDias(dias) + '</td>' +
            '<td><input type="checkbox" data-ativo="' + tr.id + '"' + (inativo ? '' : ' checked') + '></td>' +
            '<td class="texto-direita">' +
              '<button class="btn btn-sec btn-pq" data-historico="' + tr.id + '">Histórico</button> ' +
              '<button class="btn btn-perigo btn-pq" data-remover="' + tr.id + '">Remover</button>' +
            '</td></tr>';
        }).join('') + '</tbody></table></div>';

    const linhasEmpresas = t.empresas.length === 0
      ? '<div class="vazio">Ainda não há empresas externas registadas.</div>'
      : '<div class="tabela-envolver"><table class="tabela"><thead><tr>' +
        '<th>Empresa</th><th class="num">Total pessoas-dia enviadas</th><th></th></tr></thead><tbody>' +
        t.empresas.map(function(emp){
          return '<tr><td>🏢 ' + esc(emp.nome) + '</td>' +
            '<td class="num">' + fmtNum(totalPessoasDiaEmpresa(emp.id)) + '</td>' +
            '<td class="texto-direita"><button class="btn btn-perigo btn-pq" data-remover-empresa="' + emp.id + '">Remover</button></td></tr>';
        }).join('') + '</tbody></table></div>';

    el.innerHTML =
      '<div class="cabecalho-vista"><h2>🧑‍🌾 Trabalhadores</h2></div>' +

      '<div class="cartao"><h3>➕ Adicionar trabalhador direto</h3>' +
        '<div class="linha-form">' +
          '<div class="campo"><label>Nome</label>' +
            '<input type="text" id="novo-nome" list="sugestoes-historico" placeholder="Nome do trabalhador" style="min-width:240px">' +
            '<datalist id="sugestoes-historico">' + sugestoes + '</datalist></div>' +
          '<div class="campo"><label>Tipo</label><select id="novo-tipo">' +
            '<option value="trabalhador">Trabalhador</option>' +
            '<option value="lider">Líder de grupo</option>' +
          '</select></div>' +
          '<div class="campo"><label>€/dia próprio (opcional)</label>' +
            '<input type="number" min="0" step="0.5" id="novo-valor-proprio" placeholder="usa o geral"></div>' +
          '<button class="btn" id="adicionar-trab">Adicionar</button>' +
        '</div>' +
        '<div id="info-historico"></div>' +
        '<p class="suave">Ao escrever o nome, a app verifica automaticamente se o trabalhador já trabalhou em anos anteriores.</p>' +
      '</div>' +

      '<div class="cartao"><h3>📋 Trabalhadores da temporada (' + fmtNum(t.trabalhadores.length) + ')</h3>' + linhasTrabs + '</div>' +

      '<div class="cartao"><h3>🏢 Empresas externas</h3>' +
        '<p class="suave">Registe as empresas aqui; o número de pessoas enviadas por dia regista-se na Chamada. ' +
        'Não há cálculo de faturas — a empresa trata disso.</p>' +
        '<div class="linha-form">' +
          '<div class="campo"><label>Nome da empresa</label><input type="text" id="nova-empresa" placeholder="Ex.: AgriTrabalho Lda."></div>' +
          '<button class="btn" id="adicionar-empresa">Adicionar empresa</button>' +
        '</div>' +
        linhasEmpresas +
      '</div>';

    // Reconhecimento automático ao escrever o nome
    const inpNome = el.querySelector('#novo-nome');
    inpNome.addEventListener('input', function(){
      const alvo = el.querySelector('#info-historico');
      const nome = inpNome.value.trim();
      if (!nome) { alvo.innerHTML = ''; return; }
      const hist = procurarHistoricoTrabalhador(nome);
      if (hist) {
        const anos = Object.keys(hist.anos).sort();
        alvo.innerHTML = '<div class="aviso aviso-ok">🔁 <strong>' + esc(hist.nome) +
          '</strong> é trabalhador repetido — ' +
          anos.map(function(a){ return a + ': ' + fmtDias(hist.anos[a].dias) + ' dias'; }).join(' · ') +
          '</div>';
      } else {
        alvo.innerHTML = '<div class="aviso aviso-info">🆕 Sem histórico — será registado como trabalhador novo.</div>';
      }
    });

    el.querySelector('#adicionar-trab').addEventListener('click', function(){
      const nome = inpNome.value.trim();
      const tipo = el.querySelector('#novo-tipo').value;
      if (!nome) { toast('Indique o nome do trabalhador.', 'erro'); return; }
      const duplicado = temporada().trabalhadores.some(function(x){
        return normalizarNome(x.nome) === normalizarNome(nome);
      });
      if (duplicado) {
        toast('Já existe um trabalhador com esse nome nesta temporada.', 'erro');
        return;
      }
      const hist = procurarHistoricoTrabalhador(nome);
      const vpTexto = String(el.querySelector('#novo-valor-proprio').value).replace(',', '.');
      const vp = vpTexto.trim() === '' ? null : parseFloat(vpTexto);
      if (vp != null && (isNaN(vp) || vp < 0)) {
        toast('Valor diário próprio inválido.', 'erro');
        return;
      }
      temporada().trabalhadores.push({
        id: uid(),
        nome: nome,
        tipo: tipo,
        repetido: !!hist,
        ativo: true,
        valorDiarioProprio: vp
      });
      guardarDB();
      toast(hist
        ? nome + ' adicionado (repetido — histórico reconhecido).'
        : nome + ' adicionado como trabalhador novo.');
      rerender();
    });

    // Alterar tipo
    el.querySelectorAll('select[data-tipo]').forEach(function(sel){
      sel.addEventListener('change', function(){
        const tr = trabalhadorPorId(sel.dataset.tipo);
        if (!tr) return;
        tr.tipo = sel.value;
        guardarDB();
        toast('Tipo de ' + tr.nome + ' atualizado.');
        rerender();
      });
    });

    // Valor diário personalizado ("trabalhador da casa")
    el.querySelectorAll('input[data-valor-proprio]').forEach(function(inp){
      inp.addEventListener('change', function(){
        const tr = trabalhadorPorId(inp.dataset.valorProprio);
        if (!tr) return;
        const texto = String(inp.value).replace(',', '.').trim();
        if (texto === '') {
          tr.valorDiarioProprio = null;
          guardarDB();
          toast(tr.nome + ' volta a usar o valor geral da temporada.');
        } else {
          const v = parseFloat(texto);
          if (isNaN(v) || v < 0) { toast('Valor inválido.', 'erro'); rerender(); return; }
          tr.valorDiarioProprio = v;
          guardarDB();
          toast(tr.nome + ': valor diário próprio de ' + fmtEuro(v) + '.');
        }
        rerender();
      });
    });

    // Ativar / desativar
    el.querySelectorAll('input[data-ativo]').forEach(function(chk){
      chk.addEventListener('change', function(){
        const tr = trabalhadorPorId(chk.dataset.ativo);
        if (!tr) return;
        tr.ativo = chk.checked;
        guardarDB();
        rerender();
      });
    });

    // Histórico (modal)
    el.querySelectorAll('[data-historico]').forEach(function(btn){
      btn.addEventListener('click', function(){
        const tr = trabalhadorPorId(btn.dataset.historico);
        if (!tr) return;
        const hist = procurarHistoricoTrabalhador(tr.nome);
        const d = diasTemporadaTrabalhador(tr.id);
        const diasAtual = d.completos + d.meios * 0.5;
        let corpo = '<p><strong>Temporada atual (' + esc(temporada().ano) + '):</strong> ' +
          fmtDias(diasAtual) + ' dias (' + fmtNum(d.completos) + ' completos, ' + fmtNum(d.meios) + ' meios-dias)</p>';
        if (hist && Object.keys(hist.anos).length > 0) {
          corpo += '<p><strong>Anos anteriores:</strong></p><ul class="lista-simples">' +
            Object.keys(hist.anos).sort().map(function(a){
              const h = hist.anos[a];
              return '<li>' + a + ' — ' + fmtDias(h.dias) + ' dias' +
                (h.tipo === 'lider' ? ' (líder)' : '') + '</li>';
            }).join('') + '</ul>';
        } else {
          corpo += '<p class="suave">Sem histórico de anos anteriores.</p>';
        }
        abrirModal('🧑‍🌾 ' + esc(tr.nome), corpo);
      });
    });

    // Remover trabalhador
    el.querySelectorAll('[data-remover]').forEach(function(btn){
      btn.addEventListener('click', function(){
        const tr = trabalhadorPorId(btn.dataset.remover);
        if (!tr) return;
        if (trabalhadorTemRegistos(tr.id)) {
          toast(tr.nome + ' tem presenças registadas — desative-o em vez de remover.', 'erro');
          return;
        }
        if (!confirm('Remover ' + tr.nome + '?')) return;
        const t2 = temporada();
        t2.trabalhadores = t2.trabalhadores.filter(function(x){ return x.id !== tr.id; });
        t2.grupos.forEach(function(g){
          g.membroIds = g.membroIds.filter(function(id){ return id !== tr.id; });
          if (g.liderId === tr.id) g.liderId = null;
        });
        guardarDB();
        toast('Trabalhador removido.');
        rerender();
      });
    });

    // Empresas
    el.querySelector('#adicionar-empresa').addEventListener('click', function(){
      const nome = el.querySelector('#nova-empresa').value.trim();
      if (!nome) { toast('Indique o nome da empresa.', 'erro'); return; }
      const existe = temporada().empresas.some(function(e){
        return e.nome.toLowerCase() === nome.toLowerCase();
      });
      if (existe) { toast('Já existe uma empresa com esse nome.', 'erro'); return; }
      temporada().empresas.push({ id: uid(), nome: nome });
      guardarDB();
      toast('Empresa "' + nome + '" adicionada.');
      rerender();
    });

    el.querySelectorAll('[data-remover-empresa]').forEach(function(btn){
      btn.addEventListener('click', function(){
        const emp = empresaPorId(btn.dataset.removerEmpresa);
        if (!emp) return;
        if (empresaReferenciada(emp.id)) {
          toast('A empresa "' + emp.nome + '" tem registos diários de pessoas — não pode ser removida.', 'erro');
          return;
        }
        if (!confirm('Remover a empresa "' + emp.nome + '"?')) return;
        const t2 = temporada();
        t2.empresas = t2.empresas.filter(function(e){ return e.id !== emp.id; });
        guardarDB();
        toast('Empresa removida.');
        rerender();
      });
    });
  }

})();
