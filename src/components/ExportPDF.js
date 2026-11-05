'use client';

export default function ExportPDF({ transactions = [], summary = {}, month, year, userName }) {
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const fmt = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const incomes   = (transactions || []).filter(t => t.type === 'income');
  const materials = (transactions || []).filter(t => t.type === 'material_donation');
  const expenses  = (transactions || []).filter(t => t.type === 'expense');

  // Cálculos específicos para o relatório da ABOA
  const totalIncomes   = incomes.reduce((s, t) => s + (t.amount || 0), 0);
  const totalMaterials = materials.reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpenses  = expenses.reduce((s, t) => s + (t.amount || 0), 0);
  const emendaExpenses = expenses
    .filter(t => t.fundingSource === 'Emenda Governamental / Fomento')
    .reduce((s, t) => s + (t.amount || 0), 0);

  const balance = totalIncomes - totalExpenses;

  const buildRows = (items, isMaterial = false) => items.map(t => {
    const isEmenda = t.fundingSource === 'Emenda Governamental / Fomento';
    const entity = t.entityName ? `${t.entityName} ${t.entityDoc ? `(${t.entityDoc})` : ''}` : '—';
    const details = isMaterial 
      ? `<strong>${t.materialQuantity}x ${t.materialItem}</strong><br/><span style="color:#64748b;font-size:11px">${t.description}</span>`
      : t.description;

    return `
      <tr>
        <td style="white-space:nowrap">${t.date}</td>
        <td>${details}</td>
        <td>${t.category}</td>
        <td>${entity}</td>
        <td style="font-size:11px">
          ${isEmenda ? `<span class="badge-emenda">Emenda: ${t.amendmentCode || 'Sim'}</span>` : (t.fundingSource || 'Próprio')}
        </td>
        <td style="text-align:right;font-weight:700">${fmt(t.amount)}</td>
      </tr>
    `;
  }).join('');

  const buildSection = (title, color, items, isMaterial = false) => {
    const total = items.reduce((s, t) => s + (t.amount || 0), 0);
    const rows = items.length > 0
      ? buildRows(items, isMaterial)
      : `<tr><td colspan="6" style="text-align:center;color:#94a3b8;font-style:italic;padding:16px">Nenhum lançamento registrado neste período</td></tr>`;

    return `
      <div class="section">
        <div class="sec-header" style="border-left:4px solid ${color}">
          <span class="sec-title">${title}</span>
          <span class="sec-count">${items.length} registro(s)</span>
          <span class="sec-total" style="color:${color}">${fmt(total)}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:75px">Data</th>
              <th>Descrição / Itens</th>
              <th>Categoria</th>
              <th>Doador / Fornecedor</th>
              <th>Origem Recurso</th>
              <th style="text-align:right;width:110px">Valor Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          ${items.length > 0 ? `
            <tfoot>
              <tr>
                <td colspan="5" style="text-align:right;font-weight:700;color:#475569">Total da Seção</td>
                <td style="text-align:right;font-weight:800;color:${color}">${fmt(total)}</td>
              </tr>
            </tfoot>` : ''}
        </table>
      </div>
    `;
  };

  const buildHtml = () => {
    const monthName = months[month - 1];
    const bColor = balance >= 0 ? '#16a34a' : '#dc2626';

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Demonstrativo Financeiro - ABOA - ${monthName} ${year}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1e293b;background:#f8fafc}
  .page{max-width:960px;margin:0 auto;background:#fff;padding:32px}
  .header{border-bottom:2px solid #0f172a;padding-bottom:16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start}
  .header h1{font-size:18px;font-weight:800;color:#0f172a;text-transform:uppercase}
  .header h2{font-size:13px;font-weight:600;color:#475569;margin-top:2px}
  .header p{font-size:11px;color:#64748b;margin-top:4px}
  .period-box{text-align:right}
  .period-box .period{font-size:14px;font-weight:800;color:#0f172a}
  .period-box .date{font-size:10px;color:#64748b;margin-top:4px}

  .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px}
  .card{border-radius:6px;padding:12px;text-align:center;border:1px solid #e2e8f0;background:#fff}
  .card .lbl{font-size:9px;color:#64748b;margin-bottom:4px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
  .card .val{font-size:15px;font-weight:800}
  .card .sub{font-size:10px;color:#64748b;margin-top:2px}

  .section{margin-bottom:24px;page-break-inside:avoid}
  .sec-header{display:flex;align-items:center;gap:10px;padding:8px 12px;background:#f1f5f9;border-radius:4px 4px 0 0;border:1px solid #cbd5e1;border-left-width:4px}
  .sec-title{font-size:13px;font-weight:700;flex:1}
  .sec-count{font-size:10px;color:#475569;background:#e2e8f0;padding:2px 6px;border-radius:8px}
  .sec-total{font-size:13px;font-weight:800}

  table{width:100%;border-collapse:collapse;border:1px solid #cbd5e1;border-top:none;margin-bottom:8px}
  th{background:#f8fafc;padding:6px 8px;text-align:left;font-size:10px;color:#475569;font-weight:700;text-transform:uppercase;border-bottom:1px solid #cbd5e1}
  td{padding:6px 8px;font-size:11px;border-bottom:1px solid #e2e8f0;color:#334155;vertical-align:top}
  tbody tr:nth-child(even) td{background:#fcfcfc}
  tfoot td{background:#f8fafc;border-top:1px solid #cbd5e1;padding:8px}

  .badge-emenda{background:#fef3c7;color:#92400e;padding:2px 4px;border-radius:3px;font-weight:600;font-size:10px;border:1px solid #fde68a}

  .signatures{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px;padding-top:20px;page-break-inside:avoid}
  .sig-line{border-top:1px solid #475569;text-align:center;padding-top:6px;font-size:11px;font-weight:600;color:#334155}

  .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8}

  @media print{
    body{background:#fff}
    .page{padding:0}
    @page{size:landscape;margin:15mm}
  }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div>
      <h1>ABOA — Associação Ombro Amigo</h1>
      <h2>Demonstrativo de Execução Financeira e Prestação de Contas</h2>
      <p>Operador / Responsável: ${userName || 'Gestão ABOA'}</p>
    </div>
    <div class="period-box">
      <div class="period">${monthName} de ${year}</div>
      <div class="date">Emissão em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  </div>

  <div class="cards">
    <div class="card">
      <div class="lbl">Entradas Financeiras</div>
      <div class="val" style="color:#16a34a">${fmt(totalIncomes)}</div>
      <div class="sub">${incomes.length} lançamento(s)</div>
    </div>
    <div class="card">
      <div class="lbl">Doações em Produtos</div>
      <div class="val" style="color:#0284c7">${fmt(totalMaterials)}</div>
      <div class="sub">${materials.length} lote(s) estimado(s)</div>
    </div>
    <div class="card">
      <div class="lbl">Despesas Totais</div>
      <div class="val" style="color:#dc2626">${fmt(totalExpenses)}</div>
      <div class="sub">${expenses.length} comprovante(s)</div>
    </div>
    <div class="card" style="border-color:${bColor};background:${balance >= 0 ? '#f0fdf4' : '#fef2f2'}">
      <div class="lbl">Saldo Operacional</div>
      <div class="val" style="color:${bColor}">${fmt(balance)}</div>
      <div class="sub" style="color:${bColor};font-weight:700">${balance >= 0 ? 'Superávit' : 'Déficit'}</div>
    </div>
  </div>

  ${emendaExpenses > 0 ? `
    <div style="background:#fffbeb;border:1px solid #fef3c7;border-left:4px solid #f59e0b;padding:8px 12px;margin-bottom:20px;border-radius:4px;font-size:11px;color:#92400e">
      <strong>Atenção de Conformidade (Emenda Governamental):</strong> 
      Foram executados <strong>${fmt(emendaExpenses)}</strong> vinculados a recursos de emendas/fomento público neste mês de apuração.
    </div>
  ` : ''}

  ${buildSection('1. Entradas Financeiras e Repasses', '#16a34a', incomes)}
  ${buildSection('2. Doações de Produtos e Insumos Físicos', '#0284c7', materials, true)}
  ${buildSection('3. Saídas, Pagamentos e Despesas Executadas', '#dc2626', expenses)}

  <div class="signatures">
    <div class="sig-line">
      Diretoria Executiva / Representante Legal<br/>
      Associação Ombro Amigo (ABOA)
    </div>
    <div class="sig-line">
      Responsável pela Prestação de Contas<br/>
      Controle Financeiro / Projeto de Extensão
    </div>
  </div>

  <div class="footer">
    <div>Sistema Integrado de Gestão ABOA — Desenvolvido em Parceria Acadêmica</div>
    <div>Página 1 de 1</div>
  </div>

</div>
<script>window.onload=function(){window.print()}</script>
</body>
</html>`;
  };

  const exportPDF = () => {
    const html = buildHtml();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } else {
      const win = window.open('', '_blank');
      if (!win) { alert('Permita pop-ups no navegador para gerar o PDF.'); return; }
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <button 
      onClick={exportPDF} 
      className="btn" 
      style={{ 
        background: '#0284c7', 
        color: '#ffffff', 
        border: 'none', 
        padding: '8px 14px',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6
      }}
    >
      📄 Gerar Prestação de Contas (PDF)
    </button>
  );
}