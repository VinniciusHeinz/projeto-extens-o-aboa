'use client';

export default function ExportPDF({ transactions = [], summary = {}, month, year, userName }) {
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const fmt = v => `R$ ${(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getExecutedExpense = (t) => {
    if (t.type !== 'expense') return 0;
    const status = t.paymentStatus || 'paid';
    if (status === 'pending') return 0;
    if (status === 'partial') return Number(t.paidAmount) || 0;
    return Number(t.amount) || 0;
  };

  const getPaymentStatusLabel = (t) => {
    if (t.type !== 'expense') return '';
    const status = t.paymentStatus || 'paid';
    if (status === 'pending') {
      return `<span class="badge-pending">🕒 A Pagar (Pendente — Total: ${fmt(t.amount)})</span>`;
    }
    if (status === 'partial') {
      const paid = Number(t.paidAmount) || 0;
      const rem = Math.max(0, (Number(t.amount) || 0) - paid);
      return `<span class="badge-partial">⏳ Parcialmente Pago (Pago: ${fmt(paid)} | Resta: ${fmt(rem)} | Total: ${fmt(t.amount)})</span>`;
    }
    if (t.billId) {
      return `<span class="badge-paid">✓ Quitado</span>`;
    }
    return '';
  };

  const incomes   = (transactions || []).filter(t => t.type === 'income');
  const materials = (transactions || []).filter(t => t.type === 'material_donation');
  const expenses  = (transactions || []).filter(t => t.type === 'expense');

  const totalIncomes   = incomes.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalMaterials = materials.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalExpenses  = expenses.reduce((s, t) => s + getExecutedExpense(t), 0);
  const emendaExpenses = expenses
    .filter(t => (t.fundingSource || '').includes('Emenda Governamental'))
    .reduce((s, t) => s + getExecutedExpense(t), 0);

  const balance = totalIncomes - totalExpenses;

  const buildRows = (items, isMaterial = false, isExpense = false) => items.map(t => {
    const isEmenda = (t.fundingSource || '').includes('Emenda Governamental');
    const entity = t.entityName ? `${t.entityName} ${t.entityDoc ? `(${t.entityDoc})` : ''}` : '—';
    const statusBadge = isExpense ? getPaymentStatusLabel(t) : '';
    const details = isMaterial 
      ? `<strong>${t.materialQuantity}x ${t.materialItem}</strong><br/><span style="color:#64748b;font-size:11px">${t.description}</span>`
      : `<div>${t.description}</div>${statusBadge ? `<div style="margin-top:3px">${statusBadge}</div>` : ''}`;

    const displayAmt = isExpense ? getExecutedExpense(t) : (Number(t.amount) || 0);
    const amtText = isExpense && t.paymentStatus === 'pending'
      ? `<span style="color:#64748b;font-weight:600">${fmt(t.amount)}<br/><small>(Não pago)</small></span>`
      : fmt(displayAmt);

    return `
      <tr>
        <td style="white-space:nowrap">${t.date}</td>
        <td>${details}</td>
        <td>${t.category}</td>
        <td>${entity}</td>
        <td style="font-size:11px">
          ${isEmenda ? `<span class="badge-emenda">Emenda: ${t.amendmentCode || 'Sim'}</span>` : (t.fundingSource || 'Próprio')}
        </td>
        <td style="text-align:right;font-weight:700">${amtText}</td>
      </tr>
    `;
  }).join('');

  const buildSection = (title, color, items, isMaterial = false, isExpense = false) => {
    const total = items.reduce((s, t) => s + (isExpense ? getExecutedExpense(t) : (Number(t.amount) || 0)), 0);
    const rows = items.length > 0
      ? buildRows(items, isMaterial, isExpense)
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
              <th>Descrição / Situação</th>
              <th>Categoria</th>
              <th>Doador / Fornecedor</th>
              <th>Origem Recurso</th>
              <th style="text-align:right;width:115px">Valor Pago</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          ${items.length > 0 ? `
            <tfoot>
              <tr>
                <td colspan="5" style="text-align:right;font-weight:700;color:#475569">Total Efetivado da Seção</td>
                <td style="text-align:right;font-weight:800;color:${color}">${fmt(total)}</td>
              </tr>
            </tfoot>` : ''}
        </table>
      </div>
    `;
  };

  const buildDetailedReceipts = () => {
    if (!transactions || transactions.length === 0) return '';

    const cardsHtml = transactions.map((t, idx) => {
      const isInc = t.type === 'income';
      const isMat = t.type === 'material_donation';
      const isExp = t.type === 'expense';
      const badgeText = isInc ? 'ENTRADA FINANCEIRA' : isMat ? 'DOAÇÃO DE PRODUTOS' : 'SAÍDA / DESPESA';
      const badgeColor = isInc ? '#16a34a' : isMat ? '#0284c7' : '#dc2626';
      const hasEdits = Array.isArray(t.editedFields) && t.editedFields.length > 0;
      const statusBadge = isExp ? getPaymentStatusLabel(t) : '';
      const paidVal = isExp ? getExecutedExpense(t) : (Number(t.amount) || 0);

      let attachmentHtml = `<div class="no-receipt">Nenhum comprovante ou Nota Fiscal anexado a este lançamento.</div>`;
      if (t.receiptExpired) {
        attachmentHtml = `<div class="no-receipt" style="color:#b45309;background:#fffbeb">⏳ Comprovante removido automaticamente após o prazo de retenção de 6 meses.</div>`;
      } else if (t.receiptUrl) {
        if (String(t.receiptUrl).startsWith('data:image/')) {
          attachmentHtml = `
            <div class="receipt-box">
              <div class="receipt-label">Comprovante / Nota Fiscal Anexada:</div>
              <img src="${t.receiptUrl}" alt="Comprovante Lançamento ${idx + 1}" class="receipt-img" />
            </div>
          `;
        } else if (String(t.receiptUrl).startsWith('data:application/pdf')) {
          attachmentHtml = `
            <div class="receipt-box" style="background:#f0f9ff;border-color:#bae6fd">
              <div class="receipt-label" style="color:#0369a1">📄 Documento PDF Anexado ao Registro</div>
              <p style="font-size:11px;color:#334155;margin-top:4px">
                Este lançamento possui um arquivo <strong>PDF</strong> anexado no sistema (disponível para visualização e download direto na opção "Mais Detalhes" da plataforma por até 6 meses).
              </p>
              <a href="${t.receiptUrl}" download="comprovante-${t.date}-${idx + 1}.pdf" class="pdf-link no-print">
                ⬇ Baixar Arquivo PDF Anexado
              </a>
            </div>
          `;
        }
      }

      return `
        <div class="detail-card">
          <div class="detail-top">
            <div>
              <span class="detail-num">Lançamento #${idx + 1}</span>
              <span class="detail-badge" style="color:${badgeColor};border-color:${badgeColor}">${badgeText}</span>
              ${statusBadge}
              ${hasEdits ? `<span class="detail-edited">✏️ Registro editado após lançamento</span>` : ''}
            </div>
            <div class="detail-amount" style="color:${badgeColor}">
              ${isExp && t.paymentStatus === 'pending' ? `${fmt(t.amount)} (A Pagar)` : fmt(paidVal)}
            </div>
          </div>

          <div class="detail-grid">
            <div><strong>Descrição:</strong> ${t.description}</div>
            <div><strong>Data:</strong> ${t.date}</div>
            <div><strong>Categoria:</strong> ${t.category}</div>
            <div><strong>Origem do Recurso:</strong> ${t.fundingSource || 'Recursos Próprios / Doações'}</div>
            ${t.amendmentCode ? `<div><strong>Nº Emenda / Processo:</strong> ${t.amendmentCode}</div>` : ''}
            <div><strong>${isInc || isMat ? 'Doador / Parceiro' : 'Fornecedor'}:</strong> ${t.entityName || 'Não informado'}</div>
            <div><strong>CPF / CNPJ:</strong> ${t.entityDoc || 'Não informado'}</div>
            ${isMat ? `<div><strong>Item / Quantidade:</strong> ${t.materialQuantity}x ${t.materialItem}</div>` : ''}
            ${isExp && t.paymentStatus === 'partial' ? `<div><strong>Detalhe da Parcela:</strong> Pago ${fmt(t.paidAmount)} de ${fmt(t.amount)} (Restam ${fmt(Math.max(0, (t.amount || 0) - (t.paidAmount || 0)))})</div>` : ''}
          </div>

          ${attachmentHtml}
        </div>
      `;
    }).join('');

    return `
      <div class="section" style="margin-top:28px">
        <div class="sec-header" style="border-left:4px solid #0f172a">
          <span class="sec-title">4. Detalhamento dos Lançamentos e Comprovantes Anexados</span>
          <span class="sec-count">${transactions.length} item(ns)</span>
        </div>
        <div style="margin-top:12px">
          ${cardsHtml}
        </div>
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

  .section{margin-bottom:24px}
  .sec-header{display:flex;align-items:center;gap:10px;padding:8px 12px;background:#f1f5f9;border-radius:4px;border:1px solid #cbd5e1;border-left-width:4px}
  .sec-title{font-size:13px;font-weight:700;flex:1}
  .sec-count{font-size:10px;color:#475569;background:#e2e8f0;padding:2px 6px;border-radius:8px}
  .sec-total{font-size:13px;font-weight:800}

  table{width:100%;border-collapse:collapse;border:1px solid #cbd5e1;border-top:none;margin-bottom:8px}
  th{background:#f8fafc;padding:6px 8px;text-align:left;font-size:10px;color:#475569;font-weight:700;text-transform:uppercase;border-bottom:1px solid #cbd5e1}
  td{padding:6px 8px;font-size:11px;border-bottom:1px solid #e2e8f0;color:#334155;vertical-align:top}
  tbody tr:nth-child(even) td{background:#fcfcfc}
  tfoot td{background:#f8fafc;border-top:1px solid #cbd5e1;padding:8px}

  .badge-emenda{background:#fef3c7;color:#92400e;padding:2px 4px;border-radius:3px;font-weight:600;font-size:10px;border:1px solid #fde68a}
  .badge-paid{background:#dcfce7;color:#166534;padding:1px 5px;border-radius:3px;font-weight:700;font-size:9px;border:1px solid #86efac;display:inline-block;margin-left:4px}
  .badge-partial{background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:3px;font-weight:700;font-size:9px;border:1px solid #fcd34d;display:inline-block;margin-left:4px}
  .badge-pending{background:#f1f5f9;color:#475569;padding:1px 5px;border-radius:3px;font-weight:600;font-size:9px;border:1px solid #cbd5e1;display:inline-block;margin-left:4px}

  .detail-card{border:1px solid #cbd5e1;border-radius:8px;padding:14px;margin-bottom:16px;background:#fff;page-break-inside:avoid}
  .detail-top{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:10px;flex-wrap:wrap;gap:6px}
  .detail-num{font-weight:800;font-size:12px;color:#0f172a;margin-right:8px}
  .detail-badge{font-size:9px;font-weight:700;padding:2px 6px;border:1px solid;border-radius:4px}
  .detail-edited{font-size:10px;color:#b45309;background:#fef3c7;padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:600}
  .detail-amount{font-size:14px;font-weight:800}
  .detail-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px 16px;font-size:11px;color:#334155;margin-bottom:10px}
  .receipt-box{border:1px solid #e2e8f0;background:#f8fafc;border-radius:6px;padding:10px;text-align:center}
  .receipt-label{font-size:10px;font-weight:700;color:#475569;margin-bottom:6px;text-align:left}
  .receipt-img{max-width:100%;max-height:360px;border-radius:4px;border:1px solid #cbd5e1;object-fit:contain}
  .no-receipt{font-size:10px;color:#64748b;background:#f8fafc;padding:8px;border-radius:4px;text-align:center;font-style:italic}
  .pdf-link{display:inline-block;margin-top:8px;padding:6px 12px;background:#0284c7;color:#fff;text-decoration:none;border-radius:4px;font-size:11px;font-weight:600}

  .signatures{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:36px;padding-top:20px;page-break-inside:avoid}
  .sig-line{border-top:1px solid #475569;text-align:center;padding-top:6px;font-size:11px;font-weight:600;color:#334155}

  .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#64748b}

  @media print{
    body{background:#fff}
    .page{padding:0}
    .no-print{display:none !important}
    @page{size:portrait;margin:12mm}
  }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div>
      <h1>ABOA — Associação Ombro Amigo</h1>
      <h2>Demonstrativo de Execução Financeira e Prestação de Contas</h2>
      <p>Responsável: ${userName || 'Diretoria ABOA'}</p>
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
      <div class="lbl">Despesas Pagas</div>
      <div class="val" style="color:#dc2626">${fmt(totalExpenses)}</div>
      <div class="sub">${expenses.length} lançamento(s)</div>
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
  ${buildSection('3. Saídas, Pagamentos e Despesas Executadas', '#dc2626', expenses, false, true)}
  ${buildDetailedReceipts()}

  <div class="signatures">
    <div class="sig-line">
      Diretoria Executiva / Representante Legal<br/>
      Associação Ombro Amigo (ABOA)
    </div>
    <div class="sig-line">
      Responsável pela Prestação de Contas<br/>
      Controle Financeiro — ABOA
    </div>
  </div>

  <div class="footer">
    <div>Política de Retenção: Comprovantes digitais permanecem no servidor por 6 meses e registros financeiros por 4 anos.</div>
    <div>ABOA Gestão</div>
  </div>

</div>
<script>window.onload=function(){setTimeout(function(){window.print()}, 400)}</script>
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