'use client';

export default function ConfirmModal({ open, title, message, onConfirm, onCancel, danger = true, confirmLabel, hideCancel = false }) {
  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: '#1e293b', border: '1px solid #334155', borderRadius: 14,
        padding: 28, width: '100%', maxWidth: 400,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        animation: 'fadeIn .15s ease',
      }}>
        {/* Ícone */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 36 }}>{danger ? '🗑️' : hideCancel ? '✅' : '❓'}</span>
        </div>

        {/* Título */}
        <p style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', textAlign: 'center', marginBottom: 8 }}>
          {title}
        </p>

        {/* Mensagem */}
        <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 24, lineHeight: 1.5 }}>
          {message}
        </p>

        {/* Botões */}
        <div style={{ display: 'flex', gap: 10 }}>
          {!hideCancel && (
            <button onClick={onCancel}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Cancelar
            </button>
          )}
          <button onClick={onConfirm}
            style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: danger ? '#dc2626' : hideCancel ? '#16a34a' : '#6366f1', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {confirmLabel || (danger ? 'Excluir' : 'Confirmar')}
          </button>
        </div>
      </div>

      <style>{`@keyframes fadeIn { from { opacity:0; transform:scale(.95) } to { opacity:1; transform:scale(1) } }`}</style>
    </div>
  );
}
