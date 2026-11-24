'use client';
import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function ProfileModal({ user, onClose, onUpdate }) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data } = await api.get('/auth/profile');
        if (data.name) setName(data.name);
        if (data.email) setEmail(data.email);
        if (data.phone !== undefined) setPhone(data.phone || '');
      } catch {}
    };
    loadProfile();
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    setLoading(true);
    try {
      const { data } = await api.put('/auth/profile', {
        name,
        email,
        phone,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined
      });
      setMsg('✓ Dados atualizados com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      if (onUpdate) onUpdate(data.name || name, data.email || email);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#f8fafc',
    fontSize: 13
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 6, 23, 0.82)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 14,
          padding: 24,
          boxShadow: '0 20px 50px rgba(0,0,0,0.7)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
            borderBottom: '1px solid #334155',
            paddingBottom: 12
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            👤 Perfil da Diretoria — ABOA
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 6,
              color: '#94a3b8',
              fontSize: 14,
              padding: '4px 10px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
              Nome do Responsável
            </label>
            <input value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
              E-mail de Acesso (Login)
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
              Telefone (WhatsApp)
            </label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5511999999999" style={inputStyle} />
          </div>

          <div style={{ borderTop: '1px solid #334155', paddingTop: 12, marginTop: 4 }}>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 8 }}>
              Alterar senha (opcional)
            </label>
            <input
              type="password"
              placeholder="Senha atual"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={{ ...inputStyle, marginBottom: 8 }}
            />
            <input
              type="password"
              placeholder="Nova senha (mín. 6 caracteres)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          {msg && <p style={{ fontSize: 12, color: '#22c55e', margin: 0, fontWeight: 600 }}>{msg}</p>}
          {error && <p style={{ fontSize: 12, color: '#ef4444', margin: 0, fontWeight: 600 }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px',
              background: '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              marginTop: 6
            }}
          >
            {loading ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      </div>
    </div>
  );
}