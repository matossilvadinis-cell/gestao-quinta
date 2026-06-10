// vista-stock.js — stock de palotes na quinta e entregas à cooperativa
'use strict';

(function(){

  Vistas.stock = { render: render };

  function render(el){
    const t = temporada();
    const stock = stockPorVariedade();
    const entregas = t.entregas.slice().sort(function(a, b){
      if (a.data !== b.data) return b.data.localeCompare(a.data);
      return t.entregas.indexOf(b) - t.entregas.indexOf(a);
    });

    const cartoesStock = stock.length === 0
      ? '<div class="cartao"><div class="vazio">Ainda não há produção registada — o stock aparece aqui automaticamente.</div></div>'
      : '<div class="grelha grelha-3">' +
        stock.map(function(s){
          return '<div class="cartao">' +
            '<h3>' + esc(s.variedade.nome) +
            ' <span class="badge ' + (s.variedade.tipoFruta === 'pera' ? 'badge-pera' : 'badge-maca') + '">' +
            rotuloTipoFruta(s.variedade.tipoFruta) + '</span></h3>' +
            '<div class="stock-numero">' + fmtNum(s.stock) + ' <span style="font-size:.55em;font-weight:600">palotes</span></div>' +
            '<div class="stock-detalhe">' + fmtKg(s.kg) + ' em stock</div>' +
            '<div class="stock-detalhe">Colhidos: ' + fmtNum(s.colhidos) + ' · Entregues: ' + fmtNum(s.entregues) + '</div>' +
          '</div>';
        }).join('') + '</div>';

    const opcoesPomar = t.pomares.map(function(p){
      const v = variedadePorId(p.variedadeId);
      return '<option value="' + p.id + '">' + esc(p.nome) + (v ? ' — ' + esc(v.nome) : '') +
        (p.ativo === false ? ' (inativo)' : '') + '</option>';
    }).join('');

    const listaEntregas = entregas.length === 0
      ? '<div class="vazio">Ainda não foram registadas entregas.</div>'
      : '<div class="tabela-envolver"><table class="tabela"><thead><tr>' +
        '<th>Data</th><th>Pomar de origem</th><th>Variedade</th><th class="num">Palotes</th><th class="num">Kg</th><th></th></tr></thead><tbody>' +
        entregas.map(function(e){
          const p = pomarPorId(e.pomarId);
          const v = variedadeDoPomar(e.pomarId);
          return '<tr><td>' + formatarData(e.data) + ' <span class="suave">(' + nomeDiaSemana(e.data).slice(0, 3) + ')</span></td>' +
            '<td>' + esc(p ? p.nome : '—') + '</td>' +
            '<td>' + esc(v ? v.nome : '—') + '</td>' +
            '<td class="num">' + fmtNum(e.palotes) + '</td>' +
            '<td class="num">' + (v ? fmtKg(e.palotes * v.pesoPalote) : '—') + '</td>' +
            '<td class="texto-direita"><button class="btn btn-perigo btn-pq" data-remover-entrega="' + e.id + '">Remover</button></td></tr>';
        }).join('') + '</tbody></table></div>';

    el.innerHTML =
      '<div class="cabecalho-vista"><h2>📦 Stock de palotes & entregas à cooperativa</h2></div>' +

      cartoesStock +

      '<div class="cartao"><h3>🚚 Registar entrega à cooperativa</h3>' +
        '<p class="suave">A variedade é determinada automaticamente pelo pomar de origem. O stock é atualizado de imediato.</p>' +
        (t.pomares.length === 0
          ? '<div class="aviso aviso-atencao">⚠️ Configure primeiro os pomares. <button class="btn btn-pq" data-nav="configuracao">Ir à Configuração</button></div>'
          : '<div class="linha-form">' +
            '<div class="campo"><label>Data</label><input type="date" id="entrega-data" value="' + hojeISO() + '"></div>' +
            '<div class="campo"><label>Pomar de origem</label><select id="entrega-pomar">' + opcoesPomar + '</select></div>' +
            '<div class="campo"><label>Nº de palotes</label><input type="number" min="1" step="1" id="entrega-palotes" placeholder="0"></div>' +
            '<button class="btn" id="registar-entrega">Registar entrega</button>' +
          '</div>') +
      '</div>' +

      '<div class="cartao"><h3>📜 Entregas registadas</h3>' + listaEntregas + '</div>';

    el.querySelectorAll('[data-nav]').forEach(function(b){
      b.addEventListener('click', function(){ navegar(b.dataset.nav); });
    });

    const btnRegistar = el.querySelector('#registar-entrega');
    if (btnRegistar) {
      btnRegistar.addEventListener('click', function(){
        const data = el.querySelector('#entrega-data').value;
        const pomarId = el.querySelector('#entrega-pomar').value;
        const palotes = parseInt(el.querySelector('#entrega-palotes').value, 10);
        if (!data) { toast('Indique a data da entrega.', 'erro'); return; }
        if (!pomarId) { toast('Escolha o pomar de origem.', 'erro'); return; }
        if (!palotes || palotes <= 0) { toast('Indique um número de palotes válido.', 'erro'); return; }
        const v = variedadeDoPomar(pomarId);
        if (v) {
          const disponivel = stockDaVariedade(v.id);
          if (palotes > disponivel) {
            const ok = confirm('Atenção: vai entregar ' + palotes + ' palotes de ' + v.nome +
              ', mas o stock atual é de ' + disponivel + '. Registar mesmo assim?');
            if (!ok) return;
          }
        }
        temporada().entregas.push({ id: uid(), data: data, pomarId: pomarId, palotes: palotes });
        guardarDB();
        toast('Entrega registada — stock atualizado.');
        rerender();
      });
    }

    el.querySelectorAll('[data-remover-entrega]').forEach(function(btn){
      btn.addEventListener('click', function(){
        if (!confirm('Remover este registo de entrega? Os palotes voltam ao stock.')) return;
        const t2 = temporada();
        const i = t2.entregas.findIndex(function(e){ return e.id === btn.dataset.removerEntrega; });
        if (i >= 0) {
          t2.entregas.splice(i, 1);
          guardarDB();
          toast('Entrega removida.');
        }
        rerender();
      });
    });
  }

})();
