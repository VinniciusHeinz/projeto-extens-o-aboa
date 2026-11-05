'use client';

export function SkeletonCard({ height = 80 }) {
  return (
    <div className="card" style={{ height, background: '#1e293b', overflow: 'hidden', position: 'relative' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, transparent 0%, #273548 50%, transparent 100%)',
        animation: 'shimmer 1.4s infinite',
      }} />
      <style>{`@keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }`}</style>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #1e293b', alignItems: 'center' }}>
      {[40, 120, 80, 60, 70].map((w, i) => (
        <div key={i} style={{ height: 12, width: w, borderRadius: 6, background: '#273548', flexShrink: 0,
          animation: 'shimmer2 1.4s infinite', animationDelay: `${i * 0.1}s` }} />
      ))}
      <style>{`@keyframes shimmer2 { 0%,100%{opacity:.4} 50%{opacity:.8} }`}</style>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {[1,2,3,4].map(i => <SkeletonCard key={i} height={90} />)}
      </div>
      <SkeletonCard height={180} />
      <SkeletonCard height={260} />
      <div className="card">
        {[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}
      </div>
    </div>
  );
}
