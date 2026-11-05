'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function ProfileModal({ user, onClose, onUpdate }) {
  const [form, setForm] = useState({ name: user?.name || '', phone: '', currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/auth/profile').then(r => {
      setForm(f => ({ ...f, name: r.data.name || '', phone: r.data.phone || '' }));
    }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true); setMsg(''); setErr('');
    try {
      const payload = { name: form.name, phone: form.phone };
      if (form.newPassword) {
        payload.currentPassword = form.currentPassword;
        payload.newPassword = form.newPassword;
      }
      await api.patch('/auth/profile', payload);
      setMsg('Perfil atualizado com sucesso!');
      setForm(f => ({ ...f, currentPassword: '', newPassword: '' }));
      if (onUpdate) onUpdate(form.name);
    } catch (e) {
      setErr(e.response?.data?.error || 'Erro ao salvar.');
    }
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>👤 Meu Perfil</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Nome</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Seu nome" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Telefone (WhatsApp)</label>
            <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="5511999998888" />
          </div>

          <div style={{ borderTop: '1px solid #334155', paddingTop: 12, marginTop: 4 }}>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Alterar senha (opcional)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input type="password" value={form.currentPassword} onChange={e => setForm({ ...form, currentPassword: e.target.value })} placeholder="Senha atual" />
              <input type="password" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} placeholder="Nova senha (mín. 8 caracteres)" />
            </div>
          </div>

          {msg && <p style={{ fontSize: 13, color: '#22c55e', background: '#052e16', padding: '8px 12px', borderRadius: 8 }}>{msg}</p>}
          {err && <p style={{ fontSize: 13, color: '#ef4444', background: '#2d0a0a', padding: '8px 12px', borderRadius: 8 }}>{err}</p>}

          <button className="btn btn-primary" onClick={save} disabled={saving} style={{ width: '100%', marginTop: 4 }}>
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}
