'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const fmt = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function WhatsAppShare({ summary, month, year, userName, transactions = [] }) {
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bills, setBills] = useState([]);
  const [loadingBills, setLoadingBills] = useState(false);

  useEffect(() => {
    api.get('/auth/profile').then(r => {
      if (r.data.phone) setPhone(r.data.phone);
    }).catch(() => {});
  }, []);

  // Carrega contas ao abrir o painel — dados já prontos quando clicar em enviar
  useEffect(() => {
    if (!open) return;
    setLoadingBills(true);
    api.get('/bills')
      .then(r => setBills(r.data || []))
      .catch(() => {})
      .finally(() => setLoadingBills(false));
  }, [open]);

  const savePhone = async () => {
    setSaving(true);
    try {
      await api.patch('/auth/profile', { phone });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const calcPending = (allBills) =>
    allBills.filter(b => (b.paidInstallments || 0) < (b.installments || 1));

  const calcTotal = (pendingBills) =>
    pendingBills.reduce((s, b) => {
      const remaining = (b.installments || 1) - (b.paidInstallments || 0);
      return s + (b.installmentAmount || b.totalAmount) * remaining;
    }, 0);

  // Síncrono — usa bills já carregado, sem await (evita bloqueio de popup no mobile)
  const sendWhatsApp = () => {
    const balance = summary.balance || 0;
    const lastDay = new Date(year, month, 0).getDate();
    const pendingBills = calcPending(bills);
    const totalPending = calcTotal(pendingBills);
    const saldoAposContas = balance - totalPending;

    const billLines = pendingBills.length > 0
      ? pendingBills.map(b => {
          const paid = b.paidInstallments || 0;
          const total = b.installments || 1;
          const valor = (b.installmentAmount || b.totalAmount) * (total - paid);
          return `  • ${b.name}: ${fmt(valor)} (${paid}/${total} pagas)`;
        })
      : ['  Nenhuma conta pendente'];

    const typeEmoji = { income: '📥', expense: '📤', investment: '📈' };
    const txLines = transactions.length > 0
      ? transactions.map(t => `  ${typeEmoji[t.type] || '•'} ${t.description}: ${fmt(t.amount)}`)
      : ['  Nenhuma transação no período'];

    const emoji = saldoAposContas >= 0 ? '✅' : '⚠️';

    const msg = [
      `💰 *Relatório Financeiro — ${months[month - 1]}/${year}*`,
      `👤 ${userName}`,
      ``,
      `📊 *Resumo do mês:*`,
      `📥 Entradas:      ${fmt(summary.income)}`,
      `📤 Saídas:        ${fmt(summary.expense)}`,
      `📈 Investimentos: ${fmt(summary.investment || 0)}`,
      `💵 Saldo atual:   ${fmt(balance)}`,
      ``,
      `📋 *Extrato de Transações (${transactions.length}):*`,
      ...txLines,
      ``,
      `🗓️ *Contas pendentes até ${String(lastDay).padStart(2,'0')}/${String(month).padStart(2,'0')}:*`,
      ...billLines,
      ``,
      `💳 *Total a pagar:  ${fmt(totalPending)}*`,
      `💰 *Saldo após contas: ${fmt(saldoAposContas)}*`,
      ``,
      `${emoji} ${saldoAposContas >= 0 ? 'Saldo positivo após contas — bom trabalho!' : 'Atenção: saldo ficará negativo após as contas!'}`,
      ``,
      `_Gerado em ${new Date().toLocaleDateString('pt-BR')} — Gerenciador de Gastos_`,
    ].join('\n');

    const cleaned = phone.replace(/\D/g, '');
    const url = cleaned
      ? `https://wa.me/${cleaned}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    // Mobile: abre o app do WhatsApp direto via location.href (evita bloqueio de popup)
    // Desktop: abre nova aba com WhatsApp Web
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = url;
    } else {
      window.open(url, '_blank');
    }
  };

  // Prévia no painel
  const lastDay = new Date(year, month, 0).getDate();
  const pendingBills = calcPending(bills);
  const totalPending = calcTotal(pendingBills);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="btn"
        style={{ background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
      >
        📲 WhatsApp
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, zIndex: 100,
          background: '#1e293b', border: '1px solid #334155', borderRadius: 12,
          padding: 16, width: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>📲 Enviar Resumo no WhatsApp</p>
          <p style={{ fontSize: 11, color: '#475569', marginBottom: 12 }}>Salve seu número para enviar com 1 clique</p>

          <div style={{ background: '#0f172a', borderRadius: 8, padding: 10, marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>
              🗓️ Contas pendentes até {String(lastDay).padStart(2,'0')}/{String(month).padStart(2,'0')}:
            </p>
            {loadingBills
              ? <p style={{ fontSize: 11, color: '#475569' }}>Carregando...</p>
              : pendingBills.length === 0
                ? <p style={{ fontSize: 11, color: '#475569' }}>Nenhuma conta pendente</p>
                : pendingBills.map((b, i) => {
                    const paid = b.paidInstallments || 0;
                    const total = b.installments || 1;
                    const valor = (b.installmentAmount || b.totalAmount) * (total - paid);
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#e2e8f0', marginBottom: 3 }}>
                        <span>• {b.name} ({paid}/{total} pagas)</span>
                        <span style={{ color: '#f87171' }}>{fmt(valor)}</span>
                      </div>
                    );
                  })
            }
            <div style={{ borderTop: '1px solid #334155', marginTop: 8, paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>Total a pagar:</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>{fmt(totalPending)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>Saldo após contas:</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: (summary.balance - totalPending) >= 0 ? '#22c55e' : '#f87171' }}>
                {fmt(summary.balance - totalPending)}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="tel"
              placeholder="55119XXXXXXXX"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              style={{ flex: 1, fontSize: 13, padding: '8px 10px' }}
            />
            <button onClick={savePhone} disabled={saving} className="btn btn-primary" style={{ padding: '8px 12px', fontSize: 12, whiteSpace: 'nowrap' }}>
              {saved ? '✓' : saving ? '...' : 'Salvar'}
            </button>
          </div>

          <p style={{ fontSize: 11, color: '#475569', marginBottom: 12 }}>
            Formato: 55 + DDD + número (ex: 5511999998888)
          </p>

          <button
            onClick={sendWhatsApp}
            disabled={loadingBills}
            style={{ width: '100%', padding: '10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            {loadingBills ? 'Carregando...' : `📤 Enviar Resumo de ${months[month - 1]}`}
          </button>
        </div>
      )}

      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />}
    </div>
  );
}
