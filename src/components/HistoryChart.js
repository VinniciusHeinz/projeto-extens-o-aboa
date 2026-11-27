'use client';
import { useState } from 'react';

function InfoBadge({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 6, cursor: 'help' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{ color: '#38bdf8', fontSize: 13, fontWeight: 700, lineHeight: 1 }}>ⓘ</span>
      {show && (
        <span style={{
          position: 'absolute',
          bottom: '135%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#0f172a',
          color: '#f8fafc',
          border: '1px solid #38bdf8',
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 11,
          fontWeight: 400,
          width: 275,
          zIndex: 999,
          boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
          lineHeight: 1.4,
          pointerEvents: 'none',
          textAlign: 'left'
        }}>
          {text}
        </span>
      )}
    </span>
  );
}

export default function HistoryChart({ history = [], projection = [] }) {
  const [viewMode, setViewMode] = useState('history'); // 'history' | 'projection'
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const dataset = viewMode === 'projection' && projection.length > 0 ? projection : history;

  const fmtFull = (v) =>
    `R$ ${(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fmtAxis = (v) => {
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (abs >= 1000) {
      const k = abs / 1000;
      return `${sign}R$ ${Number.isInteger(k) ? k : k.toFixed(1)}k`;
    }
    return `${sign}R$ ${Math.round(abs)}`;
  };

  const formatMonthLabel = (ym) => {
    if (!ym || !ym.includes('-')) return ym;
    const [y, m] = ym.split('-');
    return `${m}/${y}`;
  };

  if (!dataset || dataset.length === 0) {
    return (
      <div className="card" style={{ marginBottom: 24, background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
          📊 Quadro Financeiro — ABOA
        </h2>
        <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '24px 0', margin: 0 }}>
          Sem movimentações suficientes para exibir o comparativo mensal.
        </p>
      </div>
    );
  }

  // Dimensões do SVG responsivo
  const width = 760;
  const height = 255;
  const padLeft = 68;
  const padRight = 24;
  const padTop = 22;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Escala vertical considerando entradas, saídas, compras parceladas e saldos negativos
  const allValues = dataset.flatMap(d => [
    Number(d.income) || 0,
    Number(d.expense) || 0,
    Number(d.installments) || 0,
    Number(d.balance) || 0,
    0
  ]);

  const rawMax = Math.max(...allValues);
  const rawMin = Math.min(...allValues);
  const maxVal = rawMax <= 0 ? 100 : rawMax * 1.12;
  const minVal = rawMin >= 0 ? 0 : rawMin * 1.15;
  const span = maxVal - minVal || 1;

  const yPos = (val) => padTop + ((maxVal - val) / span) * plotH;
  const zeroY = yPos(0);

  const colWidth = plotW / dataset.length;
  const barWidth = Math.min(18, colWidth * 0.22);

  const linePoints = dataset
    .map((d, idx) => {
      const cx = padLeft + colWidth * idx + colWidth / 2;
      const cy = yPos(Number(d.balance) || 0);
      return `${cx},${cy}`;
    })
    .join(' ');

  const gridSteps = 4;
  const gridTicks = Array.from({ length: gridSteps + 1 }, (_, i) => minVal + (span / gridSteps) * i);

  return (
    <div className="card" style={{ marginBottom: 24, background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20 }}>
      {/* Cabeçalho com Seletor Histórico vs Projeção */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center' }}>
            📊 Quadro Financeiro — ABOA
            <InfoBadge text="Acompanhe mês a mês as Entradas, o total de Saídas/Despesas, o volume de Compras Parceladas e o Resultado Líquido da entidade. Alterne entre o histórico realizado e a projeção futura de parcelas." />
          </h2>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            {viewMode === 'history'
              ? 'Demonstrativo realizado dos últimos 6 meses (Entradas, Saídas e Parcelamentos)'
              : 'Projeção de compromissos e compras parceladas agendadas para os próximos 6 meses'}
          </p>
        </div>

        {/* Alternador de Visão */}
        <div style={{ display: 'flex', background: '#0f172a', padding: 4, borderRadius: 8, border: '1px solid #334155', gap: 4 }}>
          <button
            type="button"
            onClick={() => { setViewMode('history'); setHoveredIdx(null); }}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              background: viewMode === 'history' ? '#38bdf8' : 'transparent',
              color: viewMode === 'history' ? '#0f172a' : '#94a3b8'
            }}
          >
            📊 Histórico (6 meses)
          </button>
          <button
            type="button"
            onClick={() => { setViewMode('projection'); setHoveredIdx(null); }}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              background: viewMode === 'projection' ? '#f59e0b' : 'transparent',
              color: viewMode === 'projection' ? '#0f172a' : '#94a3b8'
            }}
          >
            📅 Projeção (Parcelas)
          </button>
        </div>
      </div>

      {/* Área do Gráfico */}
      <div style={{ position: 'relative', background: '#0f172a', borderRadius: 10, padding: '14px 10px 8px 10px', border: '1px solid #1e293b' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
          {/* Linhas de grade horizontais */}
          {gridTicks.map((val, i) => {
            const y = yPos(val);
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                >
                  {fmtAxis(val)}
                </text>
              </g>
            );
          })}

          {/* Linha de base R$ 0 */}
          <line
            x1={padLeft}
            y1={zeroY}
            x2={width - padRight}
            y2={zeroY}
            stroke="#334155"
            strokeWidth="1.2"
          />

          {/* 3 Colunas por mês: Entradas (Verde), Saídas (Vermelho) e Compras Parceladas (Amarelo/Âmbar) */}
          {dataset.map((d, idx) => {
            const cx = padLeft + colWidth * idx + colWidth / 2;
            const inc = Number(d.income) || 0;
            const exp = Number(d.expense) || 0;
            const inst = Number(d.installments) || 0;

            const incTop = yPos(inc);
            const incH = Math.max(zeroY - incTop, inc > 0 ? 3 : 0);

            const expTop = yPos(exp);
            const expH = Math.max(zeroY - expTop, exp > 0 ? 3 : 0);

            const instTop = yPos(inst);
            const instH = Math.max(zeroY - instTop, inst > 0 ? 3 : 0);

            const isHovered = hoveredIdx === idx;

            return (
              <g
                key={d.month}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Faixa de destaque no hover */}
                <rect
                  x={padLeft + colWidth * idx + 4}
                  y={padTop}
                  width={colWidth - 8}
                  height={plotH}
                  rx="6"
                  fill={isHovered ? 'rgba(56, 189, 248, 0.08)' : 'transparent'}
                />

                {/* Barra 1: Entradas */}
                <rect
                  x={cx - barWidth * 1.5 - 3}
                  y={incTop}
                  width={barWidth}
                  height={incH}
                  rx="3"
                  fill="#22c55e"
                  opacity={isHovered ? 1 : 0.88}
                />

                {/* Barra 2: Saídas / Despesas */}
                <rect
                  x={cx - barWidth * 0.5}
                  y={expTop}
                  width={barWidth}
                  height={expH}
                  rx="3"
                  fill="#ef4444"
                  opacity={isHovered ? 1 : 0.88}
                />

                {/* Barra 3: Compras Parceladas */}
                <rect
                  x={cx + barWidth * 0.5 + 3}
                  y={instTop}
                  width={barWidth}
                  height={instH}
                  rx="3"
                  fill="#f59e0b"
                  opacity={isHovered ? 1 : 0.9}
                />

                {/* Rótulo MM/AAAA no eixo X */}
                <text
                  x={cx}
                  y={height - 10}
                  textAnchor="middle"
                  fill={isHovered ? '#f8fafc' : '#94a3b8'}
                  fontWeight={isHovered ? '700' : '500'}
                  fontSize="11"
                >
                  {formatMonthLabel(d.month)}
                </text>
              </g>
            );
          })}

          {/* Linha de Tendência do Resultado Líquido */}
          <polyline
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            points={linePoints}
            style={{ pointerEvents: 'none' }}
          />

          {/* Pontos da Linha de Resultado */}
          {dataset.map((d, idx) => {
            const cx = padLeft + colWidth * idx + colWidth / 2;
            const cy = yPos(Number(d.balance) || 0);
            const isHovered = hoveredIdx === idx;
            return (
              <circle
                key={`pt-${d.month}`}
                cx={cx}
                cy={cy}
                r={isHovered ? 5.5 : 4}
                fill="#0f172a"
                stroke="#38bdf8"
                strokeWidth="2.5"
                style={{ pointerEvents: 'none' }}
              />
            );
          })}
        </svg>

        {/* Card Flutuante ao Passar o Mouse */}
        {hoveredIdx !== null && dataset[hoveredIdx] && (() => {
          const item = dataset[hoveredIdx];
          const bal = Number(item.balance) || 0;
          const leftPct = ((hoveredIdx + 0.5) / dataset.length) * 100;
          const clampedLeft = Math.min(Math.max(leftPct, 20), 80);

          return (
            <div
              style={{
                position: 'absolute',
                top: 14,
                left: `${clampedLeft}%`,
                transform: 'translateX(-50%)',
                background: '#1e293b',
                border: '1px solid #38bdf8',
                borderRadius: 10,
                padding: '10px 14px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.75)',
                pointerEvents: 'none',
                zIndex: 20,
                minWidth: 215
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', margin: '0 0 6px 0', borderBottom: '1px solid #334155', paddingBottom: 4 }}>
                📅 {formatMonthLabel(item.month)}
              </p>
              <p style={{ fontSize: 12, color: '#22c55e', margin: '3px 0', fontWeight: 600 }}>
                Entradas: {fmtFull(item.income)}
              </p>
              <p style={{ fontSize: 12, color: '#ef4444', margin: '3px 0', fontWeight: 600 }}>
                Saídas / Despesas: {fmtFull(item.expense)}
              </p>
              <p style={{ fontSize: 12, color: '#f59e0b', margin: '3px 0', fontWeight: 600 }}>
                Compras Parceladas: {fmtFull(item.installments)}
              </p>
              <p style={{ fontSize: 12, color: bal >= 0 ? '#38bdf8' : '#f87171', margin: '5px 0 0 0', paddingTop: 4, borderTop: '1px solid #334155', fontWeight: 700 }}>
                Resultado: {bal < 0 ? `- ${fmtFull(Math.abs(bal))}` : fmtFull(bal)}
              </p>
            </div>
          );
        })()}
      </div>

      {/* Legenda Completa */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 14, flexWrap: 'wrap', fontSize: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#cbd5e1' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e', display: 'inline-block' }} />
          Entradas (R$)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#cbd5e1' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#ef4444', display: 'inline-block' }} />
          Saídas / Despesas (R$)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#cbd5e1' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#f59e0b', display: 'inline-block' }} />
          Compras Parceladas (R$)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#cbd5e1' }}>
          <span style={{ width: 12, height: 3, borderRadius: 2, background: '#38bdf8', display: 'inline-block' }} />
          Resultado Líquido do Mês
        </span>
      </div>
    </div>
  );
}