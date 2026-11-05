'use client';

export default function AppBackground() {
  // Candlesticks data
  const candles = [
    { x: 5,  open: 60, close: 40, high: 30, low: 75, bull: false },
    { x: 9,  open: 40, close: 25, high: 18, low: 55, bull: true  },
    { x: 13, open: 25, close: 45, high: 15, low: 55, bull: true  },
    { x: 17, open: 45, close: 30, high: 22, low: 58, bull: false },
    { x: 21, open: 30, close: 15, high: 8,  low: 42, bull: true  },
    { x: 25, open: 15, close: 35, high: 5,  low: 45, bull: true  },
    { x: 29, open: 35, close: 20, high: 12, low: 48, bull: false },
    { x: 33, open: 20, close: 38, high: 10, low: 50, bull: true  },
    { x: 37, open: 38, close: 22, high: 14, low: 52, bull: false },
    { x: 41, open: 22, close: 42, high: 12, low: 55, bull: true  },
    { x: 55, open: 55, close: 35, high: 25, low: 68, bull: false },
    { x: 59, open: 35, close: 20, high: 12, low: 48, bull: true  },
    { x: 63, open: 20, close: 40, high: 10, low: 52, bull: true  },
    { x: 67, open: 40, close: 25, high: 16, low: 55, bull: false },
    { x: 71, open: 25, close: 45, high: 14, low: 58, bull: true  },
    { x: 75, open: 45, close: 28, high: 18, low: 60, bull: false },
    { x: 79, open: 28, close: 48, high: 16, low: 62, bull: true  },
    { x: 83, open: 48, close: 30, high: 20, low: 65, bull: false },
    { x: 87, open: 30, close: 50, high: 18, low: 65, bull: true  },
    { x: 91, open: 50, close: 32, high: 22, low: 68, bull: false },
  ];

  const numbers = [
    { val: '+2.4%', x: 3,  y: 8,  color: '#22c55e' },
    { val: 'R$1.2k', x: 15, y: 92, color: '#94a3b8' },
    { val: '-0.8%', x: 28, y: 5,  color: '#ef4444' },
    { val: '+5.1%', x: 45, y: 95, color: '#22c55e' },
    { val: 'IBOV',  x: 60, y: 6,  color: '#6366f1' },
    { val: '+1.3%', x: 72, y: 93, color: '#22c55e' },
    { val: 'BTC',   x: 85, y: 7,  color: '#f59e0b' },
    { val: '-2.1%', x: 93, y: 90, color: '#ef4444' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', background: 'linear-gradient(160deg, #060d1f 0%, #0a1628 35%, #0d1f3c 65%, #071020 100%)' }}>

      {/* Grade */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.03 }}>
        <defs>
          <pattern id="appgrid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#6366f1" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#appgrid)"/>
      </svg>

      {/* Candlesticks SVG — topo */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '180px', opacity: 0.07 }} viewBox="0 0 100 100" preserveAspectRatio="none">
        {candles.map((c, i) => (
          <g key={i}>
            {/* Pavio */}
            <line x1={c.x} y1={c.high} x2={c.x} y2={c.low} stroke={c.bull ? '#22c55e' : '#ef4444'} strokeWidth="0.3"/>
            {/* Corpo */}
            <rect x={c.x - 1.2} y={Math.min(c.open, c.close)} width="2.4" height={Math.abs(c.open - c.close)} fill={c.bull ? '#22c55e' : '#ef4444'}/>
          </g>
        ))}
      </svg>

      {/* Candlesticks SVG — base */}
      <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '180px', opacity: 0.05 }} viewBox="0 0 100 100" preserveAspectRatio="none">
        {candles.map((c, i) => (
          <g key={i}>
            <line x1={c.x} y1={c.high} x2={c.x} y2={c.low} stroke={c.bull ? '#22c55e' : '#ef4444'} strokeWidth="0.3"/>
            <rect x={c.x - 1.2} y={Math.min(c.open, c.close)} width="2.4" height={Math.abs(c.open - c.close)} fill={c.bull ? '#22c55e' : '#ef4444'}/>
          </g>
        ))}
      </svg>

      {/* Linha de mercado animada */}
      <svg style={{ position: 'absolute', top: '30%', left: 0, width: '100%', height: '120px', opacity: 0.08 }}>
        <polyline points="0,80 80,65 160,72 240,45 320,58 400,30 480,48 560,22 640,38 720,15 800,28 880,10 960,20 1040,8 1200,15 1400,5"
          fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="2000" strokeDashoffset="2000"
          style={{ animation: 'dashDraw 6s ease-in-out forwards, dashPulse 4s ease-in-out 6s infinite' }}/>
        <polyline points="0,95 100,85 200,90 300,70 400,80 500,55 600,68 700,42 800,55 900,35 1000,48 1100,28 1200,40 1400,20"
          fill="none" stroke="#6366f1" strokeWidth="1" strokeDasharray="2000" strokeDashoffset="2000"
          style={{ animation: 'dashDraw 8s ease-in-out 1s forwards' }}/>
      </svg>

      {/* Números flutuantes */}
      {numbers.map((n, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${n.x}%`, top: `${n.y}%`,
          color: n.color, fontSize: 11, fontWeight: 700, opacity: 0.12,
          fontFamily: 'monospace', letterSpacing: 1,
          animation: `floatNum ${14 + i * 2}s ease-in-out ${i * 1.5}s infinite alternate`,
        }}>{n.val}</div>
      ))}

      {/* Brilhos radiais */}
      <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 65%)', animation: 'glow 8s ease-in-out infinite' }}/>
      <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.05) 0%, transparent 65%)', animation: 'glow 10s ease-in-out 3s infinite' }}/>
      <div style={{ position: 'absolute', top: '40%', right: '20%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 65%)', animation: 'glow 12s ease-in-out 6s infinite' }}/>

      <style>{`
        @keyframes dashDraw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes dashPulse {
          0%, 100% { opacity: 0.08; }
          50% { opacity: 0.14; }
        }
        @keyframes floatNum {
          0% { transform: translateY(0px); opacity: 0.08; }
          100% { transform: translateY(-20px); opacity: 0.18; }
        }
        @keyframes glow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
