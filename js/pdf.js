// pdf.js — geração do resumo diário em PDF (jsPDF via CDN)
'use strict';

function gerarResumoDiarioPDF(dataIso){
  if (typeof window === 'undefined' || !window.jspdf || !window.jspdf.jsPDF) {
    toast('A biblioteca de PDF não carregou — verifique a ligação à internet e recarregue a página.', 'erro');
    return;
  }
  const t = temporada();
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

  /* ===== Cabeçalho ===== */
  titulo('Resumo do dia — ' + nomeDiaSemana(dataIso) + ', ' + formatarData(dataIso));
  subtitulo('Gestão da Quinta · Temporada ' + t.ano +
    ' · gerado em ' + formatarData(hojeISO()));

  /* ===== Presenças ===== */
  const reg = t.chamadas[dataIso] || {};
  const presentes = [];
  const meios = [];
  ordenarTrabalhadores(t.trabalhadores).forEach(function(tr){
    if (reg[tr.id] === 'P') presentes.push(tr);
    else if (reg[tr.id] === 'M') meios.push(tr);
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
  const totalDiretos = presentes.length + meios.length;

  seccao('Presenças');
  linha('Trabalhadores diretos: ' + totalDiretos +
    (meios.length ? ' (' + meios.length + ' a meio-dia)' : '') +
    '  ·  Empresas externas: ' + externos +
    '  ·  Total: ' + (totalDiretos + externos), false, true);
  if (totalDiretos === 0) {
    vazio('Sem presenças de trabalhadores diretos registadas neste dia.');
  } else {
    presentes.forEach(function(tr){
      linha('• ' + tr.nome + (tr.tipo === 'lider' ? ' (líder)' : '') + ' — dia completo', true);
    });
    meios.forEach(function(tr){
      linha('• ' + tr.nome + (tr.tipo === 'lider' ? ' (líder)' : '') + ' — meio-dia', true);
    });
  }
  linhasEmpresas.forEach(function(l){ linha('• ' + l, true); });

  /* ===== Produção por grupo ===== */
  const regsDia = t.producao.filter(function(r){ return r.data === dataIso; });

  seccao('Produção por grupo');
  if (regsDia.length === 0) {
    vazio('Sem produção registada neste dia.');
  } else {
    // grupos existentes + registos de grupos entretanto removidos
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
        sufixo = ' — ' + fmtDias(pres.equivalente) + ' presente(s)' +
          (media != null ? ' — média ' + fmtNum(media) + ' kg/pessoa' : '');
      }
      quebraSePreciso(8);
      linha(b.nome + sufixo, false, true);
      b.lotes.forEach(function(r){
        const p = pomarPorId(r.pomarId);
        const v = variedadeDoPomar(r.pomarId);
        linha('• ' + (p ? p.nome : '—') + (v ? ' (' + v.nome + ')' : '') + ': ' +
          fmtNum(r.palotes) + ' palotes — ' + fmtKg(kgDeRegisto(r)), true);
      });
      linha('Total do grupo: ' + fmtNum(tot.palotes) + ' palotes — ' + fmtKg(tot.kg), true);
      y += 1.5;
    });
  }

  /* ===== Totais do dia por variedade ===== */
  seccao('Total do dia por variedade');
  const porVar = agruparProducaoPorVariedade(regsDia);
  if (porVar.length === 0) {
    vazio('Sem produção registada neste dia.');
  } else {
    porVar.forEach(function(x){
      linha('• ' + x.variedade.nome + ': ' + fmtNum(x.palotes) + ' palotes — ' + fmtKg(x.kg), true);
    });
    const tot = totaisProducao(regsDia);
    linha('Total da quinta: ' + fmtNum(tot.palotes) + ' palotes — ' + fmtKg(tot.kg), false, true);
  }

  /* ===== Stock após o dia ===== */
  seccao('Stock de palotes na quinta (após este dia)');
  const stock = stockPorVariedade(dataIso);
  if (stock.length === 0) {
    vazio('Sem movimentos de palotes até este dia.');
  } else {
    stock.forEach(function(s){
      linha('• ' + s.variedade.nome + ': ' + fmtNum(s.stock) + ' palotes (' + fmtKg(s.kg) + ')' +
        '  [colhidos: ' + fmtNum(s.colhidos) + ' · entregues: ' + fmtNum(s.entregues) + ']', true);
    });
  }

  /* ===== Rodapé ===== */
  const totalPaginas = doc.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Gestão da Quinta — resumo de ' + formatarData(dataIso) +
      ' — página ' + p + ' de ' + totalPaginas, MARGEM, 292);
  }

  doc.save('resumo_dia_' + dataIso + '.pdf');
  toast('Resumo do dia exportado em PDF.');
}
