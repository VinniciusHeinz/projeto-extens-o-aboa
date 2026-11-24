'use client';
import { useState, useRef } from 'react';
import api from '@/lib/api';
import ConfirmModal from './ConfirmModal';

export default function BackupExport({ onRestore }) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(null); // { title, message, onConfirm, danger, info }
  const [pendingFile, setPendingFile] = useState(null);
  const fileRef = useRef();

  const exportBackup = async () => {
    setLoading(true);
    setOpen(false);
    try {
      const [transactions, bills, goals] = await Promise.all([
        api.get('/transactions').then(r => r.data),
        api.get('/bills').then(r => r.data),
        api.get('/goals').then(r => r.data),
      ]);
      const backup = { exportedAt: new Date().toISOString(), version: '1.0', data: { transactions, bills, goals } };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-financeiro-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch {
      setModal({ title: 'Erro', message: 'Não foi possível gerar o backup.', info: true });
    }
    setLoading(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setModal({
      title: 'Restaurar backup?',
      message: 'Os dados existentes serão mantidos — apenas itens novos serão adicionados, sem duplicatas.',
      danger: false,
      onConfirm: () => doRestore(file),
    });
    fileRef.current.value = '';
  };

  const doRestore = async (file) => {
    setModal(null);
    setLoading(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      if (!backup?.data) {
        setModal({ title: 'Arquivo inválido', message: 'O arquivo selecionado não é um backup válido deste app.', info: true });
        setLoading(false);
        return;
      }
      const { data: result } = await api.post('/backup/restore', { data: backup.data });
      const { transactions, bills, goals } = result.imported;
      setModal({
        title: 'Backup restaurado!',
        message: `✅ ${transactions} transações\n✅ ${bills} contas\n✅ ${goals} metas\n\nforam importadas com sucesso.`,
        info: true,
      });
      if (onRestore) onRestore();
    } catch {
      setModal({ title: 'Erro ao restaurar', message: 'Verifique se o arquivo é válido e tente novamente.', info: true });
    }
    setLoading(false);
    setPendingFile(null);
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Modal customizado */}
      {modal && (
        <ConfirmModal
          open={true}
          title={modal.title}
          message={modal.message}
          danger={modal.danger !== false && !modal.info}
          onConfirm={modal.info ? () => setModal(null) : modal.onConfirm}
          onCancel={modal.info ? null : () => { setModal(null); setPendingFile(null); }}
          confirmLabel={modal.info ? 'OK' : undefined}
          hideCancel={!!modal.info}
        />
      )}

      <button
        onClick={() => setOpen(v => !v)}
        disabled={loading}
        className="btn"
        style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', fontSize: 13 }}
      >
        {loading ? '...' : '💾 Backup'}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, zIndex: 100,
          background: '#1e293b', border: '1px solid #334155', borderRadius: 10,
          padding: 14, width: 220, boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 10 }}>💾 Backup de Dados</p>
          <button onClick={exportBackup} className="btn"
            style={{ width: '100%', marginBottom: 8, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', fontSize: 12, justifyContent: 'center' }}>
            ⬇️ Exportar backup
          </button>
          <button onClick={() => fileRef.current.click()} className="btn"
            style={{ width: '100%', background: '#1e3a5f', color: '#93c5fd', border: '1px solid #1d4ed8', fontSize: 12, justifyContent: 'center' }}>
            ⬆️ Restaurar backup
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleFileSelect} style={{ display: 'none' }} />
          <p style={{ fontSize: 10, color: '#475569', marginTop: 8, textAlign: 'center' }}>Arquivo .json gerado por este app</p>
        </div>
      )}

      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />}
    </div>
  );
}
