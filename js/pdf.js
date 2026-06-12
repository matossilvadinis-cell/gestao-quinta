// pdf.js — relatórios em PDF (jsPDF via CDN): resumo diário e relatório de fim de temporada
'use strict';

// Helpers comuns de layout (margens, secções, quebra de página, rodapé)
function __criarPDF(){
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
  const MARGEM = 16;
  const LARGURA = 210 - MARGEM * 2;
  let y = 18;

  function quebraSePreciso(altura){
    if (y + altura > 282) {
      doc.addPage();
      y = 18;
    }
  }

  function titulo(texto){
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(27, 94, 32);
    doc.text(texto, MARGEM, y);
    y += 7;
  }

  function subtitulo(texto){
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(110, 110, 110);
    doc.text(texto, MARGEM, y);
    y += 8;
  }

  function seccao(texto){
    quebraSePreciso(14);
    y += 3;
    doc.setFillColor(232, 245, 233);
    doc.rect(MARGEM, y - 4.5, LARGURA, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(27, 94, 32);
    doc.text(texto, MARGEM + 2, y);
    y += 7;
  }

  function linha(texto, indentar, negrito){
    quebraSePreciso(6);
    doc.setFont('helvetica', negrito ? 'bold' : 'normal');
    doc.setFontSize(10);
    doc.setTextColor(33, 33, 33);
    doc.text(texto, MARGEM + (indentar ? 5 : 1), y);
    y += 5.4;
  }

  function vazio(texto){
    quebraSePreciso(6);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(130, 130, 130);
    doc.text(texto, MARGEM + 1, y);
    y += 5.4;
  }

  function espaco(mm){
    y += (mm == null ? 1.5 : mm);
  }

  function rodape(texto){
    const totalPaginas = doc.getNumberOfPages();
    for (let p = 1; p <= totalPaginas; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(texto + ' — página ' + p + ' de ' + totalPaginas, MARGEM, 292);
    }
  }

  return {
    doc: doc, titulo: titulo, subtitulo: subtitulo, seccao: seccao,
    linha: linha, vazio: vazio, espaco: espaco, rodape: rodape
  };
}

function __pdfDisponivel(){
  if (typeof window === 'undefined' || !window.jspdf || !window.jspdf.jsPDF) {
    toast('A biblioteca de PDF não carregou — verifique a ligação à internet e recarregue a página.', 'erro');
    return false;
  }
  return true;
}

/* ===== Resumo diário ===== */

function gerarResumoDiarioPDF(dataIso){
  if (!__pdfDisponivel()) return;
  const t = temporada();
  const pdf = __criarPDF();

  pdf.titulo('Resumo do dia — ' + nomeDiaSemana(dataIso) + ', ' + formatarData(dataIso));
  pdf.subtitulo('Gestão da Quinta · Temporada ' + t.ano + ' · gerado em ' + formatarData(hojeISO()));

  /* Presenças */
  const presentes = [];
  let parciais = 0, horasTotais = 0;
  ordenarTrabalhadores(t.trabalhadores).forEach(function(tr){
    const r = registoChamada(dataIso, tr.id);
    if (!r || r.horas <= 0) return;
    presentes.push({ trabalhador: tr, horas: r.horas, grupoId: grupoDoTrabalhadorNoDia(tr.id, dataIso) });
    horasTotais += r.horas;
    if (r.horas < HORAS_DIA_COMPLETO) parciais++;
  });
  let externos = 0;
  const linhasEmpresas = [];
  const re = t.registoEmpresas[dataIso] || {};
  t.empresas.forEach(function(emp){
    const n = parseInt(re[emp.id], 10) || 0;
    if (n > 0) {
      externos += n;
      linhasEmpresas.push(emp.nome + ': ' + n + ' pessoa(s)');
    }
  });
  const totalDiretos = presentes.length;

  pdf.seccao('Presenças');
  pdf.linha('Trabalhadores diretos: ' + totalDiretos +
    (parciais ? ' (' + parciais + ' parciais)' : '') +
    '  ·  ' + fmtHoras(horasTotais) +
    '  ·  Empresas externas: ' + externos +
    '  ·  Total: ' + (totalDiretos + externos) + ' pessoas', false, true);
  if (totalDiretos === 0) {
    pdf.vazio('Sem presenças de trabalhadores diretos registadas neste dia.');
  } else {
    presentes.forEach(function(p){
      const g = p.grupoId ? grupoPorId(p.grupoId) : null;
      pdf.linha('• ' + p.trabalhador.nome + (p.trabalhador.tipo === 'lider' ? ' (líder)' : '') +
        ' — ' + fmtHoras(p.horas) + (g ? ' — ' + g.nome : ''), true);
    });
  }
  linhasEmpresas.forEach(function(l){ pdf.linha('• ' + l, true); });

  /* Produção por grupo */
  const regsDia = t.producao.filter(function(r){ return r.data === dataIso; });

  pdf.seccao('Produção por grupo');
  if (regsDia.length === 0) {
    pdf.vazio('Sem produção registada neste dia.');
  } else {
    const blocos = [];
    t.grupos.forEach(function(g){
      const lotes = regsDia.filter(function(r){ return r.grupoId === g.id; });
      if (lotes.length > 0) blocos.push({ nome: g.nome, grupoId: g.id, lotes: lotes });
    });
    const orfaos = regsDia.filter(function(r){ return !grupoPorId(r.grupoId); });
    const porNome = {};
    orfaos.forEach(function(r){
      const nome = (r.grupoNome || 'Grupo removido');
      if (!porNome[nome]) porNome[nome] = [];
      porNome[nome].push(r);
    });
    Object.keys(porNome).forEach(function(nome){
      blocos.push({ nome: nome, grupoId: null, lotes: porNome[nome] });
    });

    blocos.forEach(function(b){
      const tot = totaisProducao(b.lotes);
      let sufixo = '';
      if (b.grupoId) {
        const pres = presentesDoGrupo(b.grupoId, dataIso);
        const media = pres.equivalente > 0 ? Math.round(tot.kg / pres.equivalente) : null;
        sufixo = ' — ' + fmtNum(pres.pessoas) + ' pessoa(s), ' + fmtHoras(pres.horas) +
          (media != null ? ' — média ' + fmtNum(media) + ' kg/pessoa' : '');
      }
      pdf.linha(b.nome + sufixo, false, true);
      b.lotes.forEach(function(r){
        const p = pomarPorId(r.pomarId);
        const v = variedadeDoPomar(r.pomarId);
        pdf.linha('• ' + (p ? p.nome : '—') + (v ? ' (' + v.nome + ')' : '') + ': ' +
          fmtNum(r.palotes) + ' palotes — ' + fmtKg(kgDeRegisto(r)), true);
      });
      pdf.linha('Total do grupo: ' + fmtNum(tot.palotes) + ' palotes — ' + fmtKg(tot.kg), true);
      pdf.espaco();
    });
  }

  /* Totais do dia por variedade */
  pdf.seccao('Total do dia por variedade');
  const porVar = agruparProducaoPorVariedade(regsDia);
  if (porVar.length === 0) {
    pdf.vazio('Sem produção registada neste dia.');
  } else {
    porVar.forEach(function(x){
      pdf.linha('• ' + x.variedade.nome + ': ' + fmtNum(x.palotes) + ' palotes — ' + fmtKg(x.kg), true);
    });
    const tot = totaisProducao(regsDia);
    pdf.linha('Total da quinta: ' + fmtNum(tot.palotes) + ' palotes — ' + fmtKg(tot.kg), false, true);
  }

  /* Stock após o dia */
  pdf.seccao('Stock de palotes na quinta (após este dia)');
  const stock = stockPorVariedade(dataIso);
  if (stock.length === 0) {
    pdf.vazio('Sem movimentos de palotes até este dia.');
  } else {
    stock.forEach(function(s){
      pdf.linha('• ' + s.variedade.nome + ': ' + fmtNum(s.stock) + ' palotes (' + fmtKg(s.kg) + ')' +
        '  [colhidos: ' + fmtNum(s.colhidos) + ' · entregues: ' + fmtNum(s.entregues) + ']', true);
    });
  }

  pdf.rodape('Gestão da Quinta — resumo de ' + formatarData(dataIso));
  pdf.doc.save('resumo_dia_' + dataIso + '.pdf');
  toast('Resumo do dia exportado em PDF.');
}

/* ===== Relatório de fim de temporada ===== */

function gerarRelatorioTemporadaPDF(){
  if (!__pdfDisponivel()) return;
  const t = temporada();
  const pdf = __criarPDF();
  const ano = String(t.ano);

  const totTemporada = totaisProducao(t.producao);
  const porVar = agruparProducaoPorVariedade(t.producao);
  const porPomar = agruparProducaoPorPomar(t.producao);
  const salarios = custoSalariosTemporada();
  const empresas = custoEmpresasTemporada();
  const custoTotal = salarios.total + empresas.total;
  const stock = stockPorVariedade();
  const totalEntregue = t.entregas.reduce(function(s, e){ return s + e.palotes; }, 0);
  const historico = dadosHistoricoPomares();

  pdf.titulo('Relatório da temporada ' + ano + (t.fechada ? ' (fechada)' : ' (em curso)'));
  pdf.subtitulo('Gestão da Quinta · gerado em ' + formatarData(hojeISO()));

  /* Resumo geral */
  pdf.seccao('Resumo geral');
  pdf.linha('Produção total: ' + fmtTon(totTemporada.kg) + ' (' + fmtKg(totTemporada.kg) + ') em ' +
    fmtNum(totTemporada.palotes) + ' palotes', false, true);
  pdf.linha('Pomares com produção: ' + porPomar.length + '  ·  Variedades: ' + porVar.length, true);
  pdf.linha('Trabalhadores com presenças: ' + salarios.linhas.length +
    '  ·  Total trabalhado: ' + fmtHoras(salarios.horas) +
    ' (' + fmtDias(Math.round(salarios.horas / HORAS_DIA_COMPLETO * 10) / 10) + ' dias)', true);
  pdf.linha('Pessoas-dia de empresas externas: ' + fmtNum(empresas.pessoasDia), true);
  pdf.linha('Entregas à cooperativa: ' + fmtNum(totalEntregue) + ' palotes  ·  Em stock: ' +
    stock.reduce(function(s, x){ return s + x.stock; }, 0) + ' palotes', true);

  /* Por variedade */
  pdf.seccao('Produção por variedade');
  if (porVar.length === 0) pdf.vazio('Sem produção registada.');
  porVar.forEach(function(x){
    pdf.linha('• ' + x.variedade.nome + ': ' + fmtNum(x.palotes) + ' palotes — ' + fmtTon(x.kg) +
      ' (' + fmtKg(x.kg) + ')', true);
  });

  /* Por pomar com t/ha */
  pdf.seccao('Produção por pomar (com toneladas por hectare)');
  if (porPomar.length === 0) pdf.vazio('Sem produção registada.');
  porPomar.forEach(function(x){
    const tha = tonPorHectare(x.kg, x.pomar.hectares);
    pdf.linha('• ' + x.pomar.nome + (x.variedade ? ' (' + x.variedade.nome + ')' : '') + ': ' +
      fmtNum(x.palotes) + ' palotes — ' + fmtTon(x.kg) +
      (x.pomar.hectares ? '  [' + fmtNum(x.pomar.hectares, 1) + ' ha → ' + fmtNum(tha, 1) + ' t/ha]' : ''), true);
  });

  /* Custos de mão-de-obra */
  pdf.seccao('Custos de mão-de-obra');
  pdf.linha('Salários (trabalhadores diretos): ' + fmtEuro(salarios.total), false, true);
  salarios.linhas.forEach(function(l){
    pdf.linha('• ' + l.trabalhador.nome + (l.trabalhador.tipo === 'lider' ? ' (líder)' : '') + ': ' +
      fmtDias(Math.round(l.dias * 100) / 100) + ' dias × ' + fmtEuro(l.valorDia) + ' = ' + fmtEuro(l.total), true);
  });
  pdf.espaco();
  pdf.linha('Empresas externas: ' + fmtEuro(empresas.total), false, true);
  if (empresas.linhas.length === 0) pdf.vazio('Sem registos de empresas externas.');
  empresas.linhas.forEach(function(l){
    pdf.linha('• ' + l.empresa.nome + ': ' + fmtNum(l.pessoasDia) + ' pessoas-dia × ' +
      fmtEuro(l.valor) + ' = ' + fmtEuro(l.total), true);
  });
  pdf.espaco();
  pdf.linha('Custo total de mão-de-obra: ' + fmtEuro(custoTotal), false, true);
  pdf.linha('Custo de mão-de-obra por kg: ' +
    (totTemporada.kg > 0 ? fmtNum(custoTotal / totTemporada.kg, 3) + ' €/kg' : '—') +
    (totTemporada.kg > 0 ? '  (' + fmtNum(custoTotal / (totTemporada.kg / 1000), 0) + ' €/tonelada)' : ''), false, true);

  /* Comparação com anos anteriores */
  pdf.seccao('Comparação com anos anteriores');
  if (historico.anos.length <= 1) {
    pdf.vazio('Ainda não há anos anteriores no histórico.');
  } else {
    const totaisAno = {};
    historico.anos.forEach(function(a){
      let soma = 0;
      historico.pomares.forEach(function(p){
        const kg = historico.valores[p][a];
        if (kg != null) soma += kg;
      });
      totaisAno[a] = soma;
    });
    pdf.linha('Produção total da quinta por ano:', false, true);
    historico.anos.forEach(function(a, i){
      const ant = i > 0 ? totaisAno[historico.anos[i - 1]] : null;
      let variacao = '';
      if (ant != null && ant > 0) {
        const pct = (totaisAno[a] - ant) / ant * 100;
        variacao = '  (' + (pct >= 0 ? '+' : '') + fmtNum(pct, 0) + '% vs ' + historico.anos[i - 1] + ')';
      }
      pdf.linha('• ' + a + ': ' + fmtTon(totaisAno[a]) + variacao + (a === ano ? '  ← temporada atual' : ''), true);
    });

    // pomares da temporada atual vs ano anterior
    const anoAnterior = String(Number(ano) - 1);
    const comAnterior = porPomar.filter(function(x){
      return historico.valores[x.pomar.nome] && historico.valores[x.pomar.nome][anoAnterior] != null;
    });
    if (comAnterior.length > 0) {
      pdf.espaco();
      pdf.linha('Pomares desta temporada vs ' + anoAnterior + ':', false, true);
      comAnterior.forEach(function(x){
        const antes = historico.valores[x.pomar.nome][anoAnterior];
        let variacao = '';
        if (antes > 0) {
          const pct = (x.kg - antes) / antes * 100;
          variacao = '  (' + (pct >= 0 ? '+' : '') + fmtNum(pct, 0) + '%)';
        }
        pdf.linha('• ' + x.pomar.nome + ': ' + fmtTon(x.kg) + ' em ' + ano + ' vs ' +
          fmtTon(antes) + ' em ' + anoAnterior + variacao, true);
      });
    }
  }

  pdf.rodape('Gestão da Quinta — relatório da temporada ' + ano);
  pdf.doc.save('relatorio_temporada_' + ano + '.pdf');
  toast('Relatório da temporada exportado em PDF.');
}
