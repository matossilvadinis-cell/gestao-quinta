// vista-configuracao.js — configuração da temporada (valores, variedades, pomares, temporadas, backup)
'use strict';

(function(){

  Vistas.configuracao = { render: render };

  function render(el){
    const t = temporada();

    // ----- Variedades -----
    const linhasVariedades = t.variedades.length === 0
      ? '<div class="vazio">Sem variedades.</div>'
      : '<div class="tabela-envolver"><table class="tabela"><thead><tr>' +
        '<th>Variedade</th><th>Fruta</th><th class="num">Peso por palote (kg)</th><th></th></tr></thead><tbody>' +
        t.variedades.map(function(v){
          const usada = variedadeReferenciada(v.id);
          return '<tr><td>' + esc(v.nome) + '</td>' +
            '<td><span class="badge ' + (v.tipoFruta === 'pera' ? 'badge-pera' : 'badge-maca') + '">' +
              rotuloTipoFruta(v.tipoFruta) + '</span></td>' +
            '<td class="num"><input type="number" min="1" step="1" value="' + v.pesoPalote +
              '" data-peso-var="' + v.id + '" style="width:90px"></td>' +
            '<td class="texto-direita"><button class="btn btn-perigo btn-pq" data-remover-var="' + v.id + '"' +
              (usada ? ' disabled title="Em uso por um ou mais pomares"' : '') + '>Remover</button></td></tr>';
        }).join('') + '</tbody></table></div>';

    // ----- Pomares -----
    const opcoesVariedade = t.variedades.map(function(v){
      return '<option value="' + v.id + '">' + esc(v.nome) + '</option>';
    }).join('');

    const linhasPomares = t.pomares.length === 0
      ? '<div class="vazio">Ainda não há pomares. Adicione os pomares ativos desta temporada.</div>'
      : '<div class="tabela-envolver"><table class="tabela"><thead><tr>' +
        '<th>Pomar</th><th>Variedade</th><th class="num">Hectares</th><th>Ativo</th><th></th></tr></thead><tbody>' +
        t.pomares.map(function(p){
          const referenciado = pomarReferenciado(p.id);
          const ops = t.variedades.map(function(v){
            return '<option value="' + v.id + '"' + (v.id === p.variedadeId ? ' selected' : '') + '>' +
              esc(v.nome) + '</option>';
          }).join('');
          return '<tr' + (p.ativo === false ? ' class="linha-inativa"' : '') + '>' +
            '<td>' + esc(p.nome) + '</td>' +
            '<td><select data-var-pomar="' + p.id + '"' +
              (referenciado ? ' disabled title="Tem produção ou entregas registadas — a variedade já não pode mudar"' : '') +
              '>' + ops + '</select></td>' +
            '<td class="num"><input type="number" min="0" step="0.1" data-hectares="' + p.id +
              '" value="' + (p.hectares != null && p.hectares !== 0 ? p.hectares : '') +
              '" placeholder="—" style="width:80px"></td>' +
            '<td><input type="checkbox" data-ativo-pomar="' + p.id + '"' + (p.ativo === false ? '' : ' checked') + '></td>' +
            '<td class="texto-direita"><button class="btn btn-perigo btn-pq" data-remover-pomar="' + p.id + '"' +
              (referenciado ? ' disabled title="Tem produção ou entregas registadas"' : '') + '>Remover</button></td></tr>';
        }).join('') + '</tbody></table></div>';

    // ----- Temporadas -----
    const opcoesTemporadas = Object.keys(DB.temporadas).sort().reverse().map(function(k){
      const temp = DB.temporadas[k];
      return '<option value="' + k + '"' + (k === DB.temporadaAtual ? ' selected' : '') + '>' +
        temp.ano + (temp.fechada ? ' (fechada)' : '') + '</option>';
    }).join('');

    el.innerHTML =
      '<div class="cabecalho-vista"><h2>⚙️ Configuração da temporada ' + esc(t.ano) + '</h2></div>' +

      (t.fechada
        ? '<div class="aviso aviso-atencao">⚠️ Esta temporada está fechada. Pode consultar os dados, mas o ideal é criar/mudar para a nova temporada abaixo.</div>'
        : '') +

      '<div class="cartao"><h3>💶 Valores diários de pagamento</h3>' +
        '<div class="linha-form">' +
          '<div class="campo"><label>Trabalhador direto (€/dia)</label>' +
            '<input type="number" min="0" step="0.5" id="valor-trab" value="' + (t.config.valorDiarioTrabalhador || '') + '" placeholder="0,00"></div>' +
          '<div class="campo"><label>Líder de grupo (€/dia)</label>' +
            '<input type="number" min="0" step="0.5" id="valor-lider" value="' + (t.config.valorDiarioLider || '') + '" placeholder="0,00"></div>' +
          '<button class="btn" id="guardar-valores">Guardar valores</button>' +
        '</div>' +
        '<p class="suave">O meio-dia vale metade do valor diário. Os salários semanais usam sempre os valores aqui definidos.</p>' +
      '</div>' +

      '<div class="cartao"><h3>🍎 Variedades de fruta</h3>' +
        linhasVariedades +
        '<div class="linha-form" style="margin-top:10px">' +
          '<div class="campo"><label>Nome da variedade</label><input type="text" id="nova-var-nome" placeholder="Ex.: Golden"></div>' +
          '<div class="campo"><label>Fruta</label><select id="nova-var-tipo">' +
            '<option value="pera">Pera</option><option value="maca">Maçã</option></select></div>' +
          '<div class="campo"><label>Peso por palote (kg)</label><input type="number" min="1" step="1" id="nova-var-peso" value="250"></div>' +
          '<button class="btn" id="adicionar-var">Adicionar variedade</button>' +
        '</div>' +
        '<p class="suave">Pesos fixos por defeito: Pera Rocha 250 kg/palote, maçãs 280 kg/palote. O peso pode ser ajustado por variedade.</p>' +
      '</div>' +

      '<div class="cartao"><h3>🌳 Pomares ativos</h3>' +
        '<p class="suave">Cada pomar tem nome próprio e está associado a uma única variedade — a variedade da produção e das entregas é determinada automaticamente pelo pomar.</p>' +
        linhasPomares +
        '<div class="linha-form" style="margin-top:10px">' +
          '<div class="campo"><label>Nome do pomar</label><input type="text" id="novo-pomar-nome" placeholder="Ex.: Pomar da Eira"></div>' +
          '<div class="campo"><label>Variedade</label><select id="novo-pomar-var">' + opcoesVariedade + '</select></div>' +
          '<div class="campo"><label>Hectares (opcional)</label><input type="number" min="0" step="0.1" id="novo-pomar-hectares" placeholder="Ex.: 2,5"></div>' +
          '<button class="btn" id="adicionar-pomar"' + (t.variedades.length === 0 ? ' disabled' : '') + '>Adicionar pomar</button>' +
        '</div>' +
      '</div>' +

      '<div class="cartao"><h3>📅 Gestão de temporadas</h3>' +
        '<div class="linha-form">' +
          '<div class="campo"><label>Temporada em consulta</label><select id="sel-temporada">' + opcoesTemporadas + '</select></div>' +
          '<span style="flex:1"></span>' +
          (t.fechada
            ? ''
            : '<button class="btn btn-perigo" id="fechar-temporada">Fechar temporada ' + esc(t.ano) + '</button>') +
        '</div>' +
        '<p class="suave">Ao fechar a temporada, a produção por pomar e os dias de cada trabalhador ficam guardados no histórico — ' +
        'é assim que os trabalhadores repetidos são reconhecidos no ano seguinte.</p>' +
        '<hr class="separador">' +
        '<div class="linha-form">' +
          '<div class="campo"><label>Nova temporada (ano)</label>' +
            '<input type="number" id="novo-ano" min="2000" max="2100" value="' + (Number(t.ano) + 1) + '"></div>' +
          '<button class="btn" id="criar-temporada">Criar nova temporada</button>' +
        '</div>' +
        '<p class="suave">A nova temporada herda valores diários, variedades, pomares e empresas. Os trabalhadores registam-se de novo (com reconhecimento automático dos repetidos).</p>' +
      '</div>' +

      '<div class="cartao"><h3>☁️ Partilha de dados (nuvem)</h3>' +
        (typeof Nuvem !== 'undefined' && Nuvem.disponivel()
          ? (Nuvem.obterQuintaId()
              ? '<p>Este computador está ligado à quinta <code>' + esc(Nuvem.obterQuintaId()) + '</code> — os dados são partilhados em tempo real com quem tiver este código.</p>'
              : '<p>O Firebase está configurado mas este computador ainda não está ligado a nenhuma quinta.</p>') +
            '<button class="btn btn-sec" id="gerir-nuvem">Gerir partilha</button>'
          : '<p class="suave">Partilha em tempo real não configurada (js/firebase-config.js). Os dados ficam apenas neste browser.</p>') +
      '</div>' +

      '<div class="cartao"><h3>💾 Cópia de segurança</h3>' +
        '<div class="linha-form">' +
          '<button class="btn btn-sec" id="exportar-backup">📥 Descarregar cópia (JSON)</button>' +
          '<div class="campo"><label>Repor cópia de segurança</label><input type="file" id="ficheiro-importar" accept=".json,application/json"></div>' +
        '</div>' +
        '<p class="suave">Os dados vivem no browser deste computador. Faça cópias regulares para não os perder.</p>' +
        '<hr class="separador">' +
        '<button class="btn btn-perigo" id="apagar-tudo">🗑️ Apagar todos os dados</button>' +
      '</div>';

    // ----- Valores diários -----
    el.querySelector('#guardar-valores').addEventListener('click', function(){
      const vt = parseFloat(String(el.querySelector('#valor-trab').value).replace(',', '.'));
      const vl = parseFloat(String(el.querySelector('#valor-lider').value).replace(',', '.'));
      if (isNaN(vt) || vt < 0 || isNaN(vl) || vl < 0) {
        toast('Indique valores válidos (≥ 0).', 'erro');
        return;
      }
      t.config.valorDiarioTrabalhador = vt;
      t.config.valorDiarioLider = vl;
      guardarDB();
      toast('Valores diários guardados.');
      rerender();
    });

    // ----- Variedades -----
    el.querySelector('#nova-var-tipo').addEventListener('change', function(ev){
      el.querySelector('#nova-var-peso').value = ev.target.value === 'pera' ? 250 : 280;
    });

    el.querySelector('#adicionar-var').addEventListener('click', function(){
      const nome = el.querySelector('#nova-var-nome').value.trim();
      const tipo = el.querySelector('#nova-var-tipo').value;
      const peso = parseInt(el.querySelector('#nova-var-peso').value, 10);
      if (!nome) { toast('Indique o nome da variedade.', 'erro'); return; }
      if (!peso || peso <= 0) { toast('Indique um peso por palote válido.', 'erro'); return; }
      const existe = t.variedades.some(function(v){ return v.nome.toLowerCase() === nome.toLowerCase(); });
      if (existe) { toast('Já existe uma variedade com esse nome.', 'erro'); return; }
      t.variedades.push({ id: uid(), nome: nome, tipoFruta: tipo, pesoPalote: peso });
      guardarDB();
      toast('Variedade "' + nome + '" adicionada.');
      rerender();
    });

    el.querySelectorAll('input[data-peso-var]').forEach(function(inp){
      inp.addEventListener('change', function(){
        const v = variedadePorId(inp.dataset.pesoVar);
        const peso = parseInt(inp.value, 10);
        if (!v || !peso || peso <= 0) { toast('Peso inválido.', 'erro'); rerender(); return; }
        v.pesoPalote = peso;
        guardarDB();
        toast('Peso de ' + v.nome + ' atualizado para ' + peso + ' kg/palote.');
        rerender();
      });
    });

    el.querySelectorAll('[data-remover-var]').forEach(function(btn){
      btn.addEventListener('click', function(){
        const v = variedadePorId(btn.dataset.removerVar);
        if (!v || variedadeReferenciada(v.id)) return;
        if (!confirm('Remover a variedade "' + v.nome + '"?')) return;
        t.variedades = t.variedades.filter(function(x){ return x.id !== v.id; });
        guardarDB();
        toast('Variedade removida.');
        rerender();
      });
    });

    // ----- Pomares -----
    el.querySelector('#adicionar-pomar').addEventListener('click', function(){
      const nome = el.querySelector('#novo-pomar-nome').value.trim();
      const varId = el.querySelector('#novo-pomar-var').value;
      if (!nome) { toast('Indique o nome do pomar.', 'erro'); return; }
      if (!varId) { toast('Escolha a variedade do pomar.', 'erro'); return; }
      const existe = t.pomares.some(function(p){ return p.nome.toLowerCase() === nome.toLowerCase(); });
      if (existe) { toast('Já existe um pomar com esse nome.', 'erro'); return; }
      const haTexto = String(el.querySelector('#novo-pomar-hectares').value).replace(',', '.').trim();
      const ha = haTexto === '' ? null : parseFloat(haTexto);
      if (ha != null && (isNaN(ha) || ha < 0)) { toast('Hectares inválidos.', 'erro'); return; }
      t.pomares.push({ id: uid(), nome: nome, variedadeId: varId, ativo: true, hectares: ha });
      guardarDB();
      toast('Pomar "' + nome + '" adicionado.');
      rerender();
    });

    el.querySelectorAll('select[data-var-pomar]').forEach(function(sel){
      sel.addEventListener('change', function(){
        const p = pomarPorId(sel.dataset.varPomar);
        if (!p) return;
        p.variedadeId = sel.value;
        guardarDB();
        toast('Variedade do pomar "' + p.nome + '" atualizada.');
        rerender();
      });
    });

    el.querySelectorAll('input[data-hectares]').forEach(function(inp){
      inp.addEventListener('change', function(){
        const p = pomarPorId(inp.dataset.hectares);
        if (!p) return;
        const texto = String(inp.value).replace(',', '.').trim();
        if (texto === '') {
          p.hectares = null;
        } else {
          const v = parseFloat(texto);
          if (isNaN(v) || v < 0) { toast('Hectares inválidos.', 'erro'); rerender(); return; }
          p.hectares = v;
        }
        guardarDB();
        toast('Hectares do pomar "' + p.nome + '" atualizados.');
        rerender();
      });
    });

    el.querySelectorAll('input[data-ativo-pomar]').forEach(function(chk){
      chk.addEventListener('change', function(){
        const p = pomarPorId(chk.dataset.ativoPomar);
        if (!p) return;
        p.ativo = chk.checked;
        guardarDB();
        rerender();
      });
    });

    el.querySelectorAll('[data-remover-pomar]').forEach(function(btn){
      btn.addEventListener('click', function(){
        const p = pomarPorId(btn.dataset.removerPomar);
        if (!p || pomarReferenciado(p.id)) return;
        if (!confirm('Remover o pomar "' + p.nome + '"?')) return;
        t.pomares = t.pomares.filter(function(x){ return x.id !== p.id; });
        guardarDB();
        toast('Pomar removido.');
        rerender();
      });
    });

    // ----- Temporadas -----
    el.querySelector('#sel-temporada').addEventListener('change', function(ev){
      DB.temporadaAtual = ev.target.value;
      guardarDB();
      toast('A consultar a temporada ' + ev.target.value + '.');
      render2();
    });

    const btnFechar = el.querySelector('#fechar-temporada');
    if (btnFechar) {
      btnFechar.addEventListener('click', function(){
        const ok = confirm('Fechar a temporada ' + t.ano + '?\n\n' +
          '• A produção por pomar fica guardada no histórico (toneladas por ano).\n' +
          '• Os dias de cada trabalhador ficam guardados para reconhecimento futuro.\n' +
          '• Os dados da temporada continuam consultáveis.');
        if (!ok) return;
        fecharTemporadaAtual();
        toast('Temporada ' + t.ano + ' fechada — histórico guardado.');
        rerender();
      });
    }

    el.querySelector('#criar-temporada').addEventListener('click', function(){
      const ano = parseInt(el.querySelector('#novo-ano').value, 10);
      if (!ano || ano < 2000 || ano > 2100) { toast('Indique um ano válido.', 'erro'); return; }
      if (DB.temporadas[String(ano)]) {
        DB.temporadaAtual = String(ano);
        guardarDB();
        toast('A temporada ' + ano + ' já existia — passou a ser a temporada ativa.');
        render2();
        return;
      }
      if (!t.fechada) {
        const ok = confirm('A temporada atual (' + t.ano + ') ainda não foi fechada — o histórico de pomares e trabalhadores só é guardado ao fechar.\n\nCriar a nova temporada na mesma?');
        if (!ok) return;
      }
      criarTemporada(ano);
      toast('Temporada ' + ano + ' criada e ativa.');
      render2();
    });

    // ----- Backup -----
    el.querySelector('#exportar-backup').addEventListener('click', function(){
      descarregarFicheiro('gestao-quinta-backup-' + hojeISO() + '.json',
        JSON.stringify(DB, null, 2), 'application/json');
      toast('Cópia de segurança descarregada.');
    });

    el.querySelector('#ficheiro-importar').addEventListener('change', function(ev){
      const f = ev.target.files[0];
      if (!f) return;
      const leitor = new FileReader();
      leitor.onload = function(){
        try {
          const obj = JSON.parse(leitor.result);
          if (!obj || !obj.temporadas || !obj.temporadaAtual) throw new Error('formato inválido');
          if (!confirm('Substituir TODOS os dados atuais pelos da cópia de segurança?')) {
            ev.target.value = '';
            return;
          }
          DB = obj;
          if (!DB.historicoTrabalhadores) DB.historicoTrabalhadores = {};
          if (!DB.historicoPomares) DB.historicoPomares = {};
          guardarDB();
          toast('Cópia de segurança reposta com sucesso.');
          render2();
        } catch (e) {
          toast('Ficheiro inválido — não foi possível repor a cópia.', 'erro');
        }
      };
      leitor.readAsText(f);
    });

    const naNuvem = typeof Nuvem !== 'undefined' && Nuvem.disponivel() && Nuvem.obterQuintaId();
    const btnGerirNuvem = el.querySelector('#gerir-nuvem');
    if (btnGerirNuvem) {
      btnGerirNuvem.addEventListener('click', function(){ mostrarConfigQuinta(); });
    }

    el.querySelector('#apagar-tudo').addEventListener('click', function(){
      const aviso = naNuvem
        ? 'Apagar TODOS os dados da aplicação (todas as temporadas e históricos)?\n\nATENÇÃO: a quinta está sincronizada — os dados serão apagados em TODOS os dispositivos ligados.'
        : 'Apagar TODOS os dados da aplicação (todas as temporadas e históricos)?';
      if (!confirm(aviso)) return;
      if (!confirm('Tem mesmo a certeza? Esta ação não pode ser desfeita.')) return;
      if (naNuvem) Nuvem.apagarTudoNuvem();
      localStorage.removeItem(CHAVE_DB);
      DB = null;
      carregarDB();
      toast('Todos os dados foram apagados.');
      navegar('dashboard');
    });

    // Re-render completo (atualiza também o cabeçalho com a temporada)
    function render2(){
      renderAplicacao();
    }
  }

})();
