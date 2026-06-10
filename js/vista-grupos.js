// vista-grupos.js — grupos de trabalho (líder + trabalhadores), composição semanal
'use strict';

(function(){

  Vistas.grupos = { render: render };

  function lideresDisponiveis(grupoAtualId){
    const t = temporada();
    return trabalhadoresAtivos().filter(function(tr){
      if (tr.tipo !== 'lider') return false;
      const lideraOutro = t.grupos.some(function(g){
        return g.liderId === tr.id && g.id !== grupoAtualId;
      });
      return !lideraOutro;
    });
  }

  function trabalhadoresSemGrupo(){
    const t = temporada();
    const ocupados = new Set();
    t.grupos.forEach(function(g){
      g.membroIds.forEach(function(id){ ocupados.add(id); });
    });
    return trabalhadoresAtivos().filter(function(tr){
      return tr.tipo === 'trabalhador' && !ocupados.has(tr.id);
    });
  }

  function render(el){
    const t = temporada();
    const livres = trabalhadoresSemGrupo();
    const lideresLivres = lideresDisponiveis(null);

    const cartoesGrupos = t.grupos.length === 0
      ? '<div class="cartao"><div class="vazio">Ainda não há grupos. Crie o primeiro grupo acima.</div></div>'
      : t.grupos.map(function(g){
        const lider = trabalhadorPorId(g.liderId);
        const membros = g.membroIds.map(trabalhadorPorId).filter(Boolean);
        const opLideres = lideresDisponiveis(g.id).map(function(l){
          return '<option value="' + l.id + '"' + (l.id === g.liderId ? ' selected' : '') + '>' + esc(l.nome) + '</option>';
        }).join('');
        const opMembros = livres.map(function(tr){
          return '<option value="' + tr.id + '">' + esc(tr.nome) + '</option>';
        }).join('');

        return '<div class="cartao">' +
          '<div class="cabecalho-vista" style="margin-bottom:6px">' +
            '<h3 class="mt0">👥 ' + esc(g.nome) + '</h3>' +
            '<div><button class="btn btn-sec btn-pq" data-renomear="' + g.id + '">✏️ Renomear</button> ' +
            '<button class="btn btn-perigo btn-pq" data-eliminar="' + g.id + '">Eliminar grupo</button></div>' +
          '</div>' +
          '<div class="linha-form">' +
            '<div class="campo"><label>Líder</label>' +
              '<select data-lider="' + g.id + '">' +
                (g.liderId && !lider ? '<option value="">(líder removido)</option>' : '') +
                (!g.liderId ? '<option value="" selected>— sem líder —</option>' : '') +
                opLideres +
              '</select></div>' +
          '</div>' +
          '<div><strong>Trabalhadores (' + membros.length + '):</strong></div>' +
          '<div class="membros">' +
            (membros.length === 0 ? '<span class="suave">Sem trabalhadores no grupo.</span>' : '') +
            membros.map(function(m){
              return '<span class="membro">' + esc(m.nome) +
                '<button type="button" title="Retirar do grupo" data-retirar="' + g.id + ':' + m.id + '">✕</button></span>';
            }).join('') +
          '</div>' +
          '<div class="linha-form">' +
            '<div class="campo"><label>Adicionar trabalhador</label>' +
              '<select data-novo-membro="' + g.id + '">' +
                (livres.length === 0 ? '<option value="">— sem trabalhadores livres —</option>' : opMembros) +
              '</select></div>' +
            '<button class="btn btn-sec" data-adicionar-membro="' + g.id + '"' + (livres.length === 0 ? ' disabled' : '') + '>+ Adicionar</button>' +
          '</div>' +
        '</div>';
      }).join('');

    el.innerHTML =
      '<div class="cabecalho-vista"><h2>👥 Grupos de trabalho</h2></div>' +

      '<div class="aviso aviso-info">ℹ️ A composição dos grupos mantém-se estável durante a semana e pode ser ' +
      'alterada no início de cada nova semana. Cada trabalhador pertence a um único grupo de cada vez.</div>' +

      '<div class="cartao"><h3>➕ Criar grupo</h3>' +
        '<div class="linha-form">' +
          '<div class="campo"><label>Nome / número do grupo</label><input type="text" id="novo-grupo-nome" placeholder="Ex.: Grupo 1"></div>' +
          '<div class="campo"><label>Líder</label><select id="novo-grupo-lider">' +
            '<option value="">— escolher depois —</option>' +
            lideresLivres.map(function(l){ return '<option value="' + l.id + '">' + esc(l.nome) + '</option>'; }).join('') +
          '</select></div>' +
          '<button class="btn" id="criar-grupo">Criar grupo</button>' +
        '</div>' +
        (lideresLivres.length === 0
          ? '<p class="suave">Não há líderes disponíveis — registe líderes no separador Trabalhadores.</p>'
          : '') +
      '</div>' +

      cartoesGrupos;

    el.querySelector('#criar-grupo').addEventListener('click', function(){
      const nome = el.querySelector('#novo-grupo-nome').value.trim();
      const liderId = el.querySelector('#novo-grupo-lider').value || null;
      if (!nome) { toast('Indique o nome do grupo.', 'erro'); return; }
      const existe = temporada().grupos.some(function(g){
        return g.nome.toLowerCase() === nome.toLowerCase();
      });
      if (existe) { toast('Já existe um grupo com esse nome.', 'erro'); return; }
      temporada().grupos.push({ id: uid(), nome: nome, liderId: liderId, membroIds: [] });
      guardarDB();
      toast('Grupo "' + nome + '" criado.');
      rerender();
    });

    el.querySelectorAll('[data-renomear]').forEach(function(btn){
      btn.addEventListener('click', function(){
        const g = grupoPorId(btn.dataset.renomear);
        if (!g) return;
        const novo = prompt('Novo nome do grupo:', g.nome);
        if (!novo || !novo.trim()) return;
        g.nome = novo.trim();
        guardarDB();
        rerender();
      });
    });

    el.querySelectorAll('[data-eliminar]').forEach(function(btn){
      btn.addEventListener('click', function(){
        const g = grupoPorId(btn.dataset.eliminar);
        if (!g) return;
        if (!confirm('Eliminar o grupo "' + g.nome + '"? Os registos de produção já feitos mantêm-se.')) return;
        const t2 = temporada();
        t2.grupos = t2.grupos.filter(function(x){ return x.id !== g.id; });
        guardarDB();
        toast('Grupo eliminado.');
        rerender();
      });
    });

    el.querySelectorAll('select[data-lider]').forEach(function(sel){
      sel.addEventListener('change', function(){
        const g = grupoPorId(sel.dataset.lider);
        if (!g) return;
        g.liderId = sel.value || null;
        guardarDB();
        rerender();
      });
    });

    el.querySelectorAll('[data-adicionar-membro]').forEach(function(btn){
      btn.addEventListener('click', function(){
        const g = grupoPorId(btn.dataset.adicionarMembro);
        const sel = el.querySelector('select[data-novo-membro="' + btn.dataset.adicionarMembro + '"]');
        if (!g || !sel || !sel.value) return;
        if (g.membroIds.indexOf(sel.value) === -1) g.membroIds.push(sel.value);
        guardarDB();
        rerender();
      });
    });

    el.querySelectorAll('[data-retirar]').forEach(function(btn){
      btn.addEventListener('click', function(){
        const partes = btn.dataset.retirar.split(':');
        const g = grupoPorId(partes[0]);
        if (!g) return;
        g.membroIds = g.membroIds.filter(function(id){ return id !== partes[1]; });
        guardarDB();
        rerender();
      });
    });
  }

})();
