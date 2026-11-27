'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import AuthScreen from '../components/AuthScreen';
import SummaryCards from '../components/SummaryCards';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';
import Charts from '../components/Charts';
import Bills from '../components/Bills';
import HistoryChart from '../components/HistoryChart';
import UpcomingBills from '../components/UpcomingBills';
import ExportPDF from '../components/ExportPDF';
import WhatsAppShare from '../components/WhatsAppShare';
import AppBackground from '../components/AppBackground';

import { SkeletonDashboard } from '../components/Skeleton';
import BudgetLimits from '../components/BudgetLimits';
import ProfileModal from '../components/ProfileModal';

const DEFAULT_BLOCK_ORDER = [
  'summary',
  'form',
  'list',
  'limits',
  'bills',
  'charts',
  'history'
];

const STORAGE_LAYOUT_KEY = 'aboa_dashboard_layout_order';

export default function Home() {
  const { user, logout, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(null);
  const [responsibleName, setResponsibleName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ 
    income: 0, 
    expense: 0, 
    investment: 0, 
    balance: 0, 
    salary: 0, 
    byCategory: [], 
    history: [],
    projection: []
  });
  const [filter, setFilter] = useState({ 
    month: new Date().getMonth() + 1, 
    year: new Date().getFullYear() 
  });

  const [dataLoading, setDataLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showRetentionNotice, setShowRetentionNotice] = useState(true);

  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [blockOrder, setBlockOrder] = useState(DEFAULT_BLOCK_ORDER);
  const [draggedBlock, setDraggedBlock] = useState(null);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);

    try {
      const savedOrder = localStorage.getItem(STORAGE_LAYOUT_KEY);
      if (savedOrder) {
        const parsed = JSON.parse(savedOrder);
        const merged = [...parsed, ...DEFAULT_BLOCK_ORDER.filter(b => !parsed.includes(b))];
        setBlockOrder(merged);
      }
    } catch (e) {
      console.error('Erro ao ler layout salvo:', e);
    }

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user?.name) {
      setResponsibleName(user.name);
    }
  }, [user]);

  const load = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const params = { month: filter.month, year: filter.year };
      const [t, s] = await Promise.all([
        api.get('/transactions', { params }),
        api.get('/transactions/summary', { params }),
      ]);
      setTransactions(t.data);
      setSummary(s.data);
    } catch (e) {
      console.error('Erro ao carregar dados:', e.message);
    } finally {
      setDataLoading(false);
    }
  }, [filter, user]);

  useEffect(() => { 
    if (mounted && user) {
      load(); 
    }
  }, [load, mounted, user]);

  const saveLayoutOrder = (newOrder) => {
    setBlockOrder(newOrder);
    localStorage.setItem(STORAGE_LAYOUT_KEY, JSON.stringify(newOrder));
  };

  const moveBlock = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= blockOrder.length) return;
    const newOrder = [...blockOrder];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);
    saveLayoutOrder(newOrder);
  };

  const handleDragStart = (id) => setDraggedBlock(id);
  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (targetId) => {
    if (!draggedBlock || draggedBlock === targetId) return;
    const fromIndex = blockOrder.indexOf(draggedBlock);
    const toIndex = blockOrder.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const newOrder = [...blockOrder];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);
    saveLayoutOrder(newOrder);
    setDraggedBlock(null);
  };

  const resetLayout = () => saveLayoutOrder(DEFAULT_BLOCK_ORDER);

  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  if (!mounted) return null;

  if (loading) {
    return (
      <div 
        suppressHydrationWarning
        style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#94a3b8' }}
      >
        Carregando sistema ABOA...
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  const activeName = responsibleName || user.name || 'Simone';

  const renderBlock = (blockId) => {
    switch (blockId) {
      case 'summary':
        return <SummaryCards summary={summary} month={filter.month} year={filter.year} />;
      case 'form':
        return <TransactionForm onAdd={load} />;
      case 'list':
        return <TransactionList transactions={transactions} onDelete={load} />;
      case 'limits':
        return <BudgetLimits summary={summary} />;
      case 'bills':
        return <Bills onUpdate={load} />;
      case 'charts':
        return <Charts summary={summary} />;
      case 'history':
        return <HistoryChart history={summary.history} projection={summary.projection} />;
      default:
        return null;
    }
  };

  const blockLabels = {
    summary: 'Indicadores e Balanço Geral',
    form: 'Registrar Movimentação (Entrada / Saída / Doações)',
    list: 'Livro Caixa e Prestação de Contas',
    limits: 'Gastos por Categoria (Limites Mensais)',
    bills: 'Contas a Pagar e Compromissos Fixos',
    charts: 'Gráficos de Despesas por Categoria e Balanço',
    history: 'Quadro Financeiro — ABOA'
  };

  return (
    <>
      <AppBackground />
      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Cabeçalho Principal Limpo */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid #1e293b',
            borderRadius: 14,
            padding: '16px 20px',
            marginBottom: 16,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            {/* Identidade + Responsável + Relógio em Tempo Real */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src="/logo.svg" alt="Logo ABOA" style={{ width: 42, height: 42 }} />
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px', color: '#f8fafc', margin: 0 }}>
                  ABOA — Gestão & Prestação de Contas
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    Responsável: <strong style={{ color: '#e2e8f0' }}>{activeName}</strong>
                  </span>
                  {now && (
                    <span
                      style={{
                        fontSize: 11,
                        color: '#38bdf8',
                        background: '#0f172a',
                        border: '1px solid #1e293b',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 600
                      }}
                    >
                      🕒 {now.toLocaleDateString('pt-BR')} • {now.toLocaleTimeString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Controles Principais + Botão de Menu */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <select
                value={filter.month}
                onChange={e => setFilter({ ...filter, month: +e.target.value })}
                style={{ width: 'auto', fontSize: 13, padding: '8px 28px 8px 10px' }}
              >
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>

              <select
                value={filter.year}
                onChange={e => setFilter({ ...filter, year: +e.target.value })}
                style={{ width: 'auto', fontSize: 13, padding: '8px 28px 8px 10px' }}
              >
                {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - 4 + i).map(y => <option key={y}>{y}</option>)}
              </select>

              <ExportPDF
                transactions={transactions}
                summary={summary}
                month={filter.month}
                year={filter.year}
                userName={activeName}
              />

              <button
                type="button"
                className="btn"
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  background: menuOpen ? '#6366f1' : '#1e293b',
                  color: '#f8fafc',
                  border: `1px solid ${menuOpen ? '#6366f1' : '#334155'}`,
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '8px 14px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {menuOpen ? '✕ Fechar Menu' : '☰ Menu'}
              </button>
            </div>
          </div>

          {/* Barra Retrátil de Ferramentas */}
          <div
            style={{
              display: menuOpen ? 'flex' : 'none',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px solid #1e293b'
            }}
          >
            <button
              type="button"
              className="btn"
              onClick={() => setIsEditingLayout(!isEditingLayout)}
              style={{
                background: isEditingLayout ? '#f59e0b' : '#0f172a',
                color: isEditingLayout ? '#0f172a' : '#f59e0b',
                border: '1px solid #f59e0b',
                fontSize: 13,
                fontWeight: 600
              }}
            >
              {isEditingLayout ? '✓ Concluir Layout' : '🎨 Personalizar Layout'}
            </button>

            <WhatsAppShare
              summary={summary}
              month={filter.month}
              year={filter.year}
              userName={activeName}
              transactions={transactions}
            />

            <UpcomingBills />

            <button
              type="button"
              className="btn"
              onClick={() => setShowProfile(true)}
              style={{
                background: '#0f172a',
                color: '#cbd5e1',
                border: '1px solid #334155',
                fontSize: 13
              }}
            >
              👤 Perfil
            </button>

            <button
              type="button"
              className="btn"
              onClick={logout}
              style={{
                background: '#2d0a0a',
                color: '#ef4444',
                border: '1px solid #991b1b',
                fontSize: 13
              }}
            >
              🚪 Sair
            </button>
          </div>
        </div>

        {/* Aviso de Política de Armazenamento e Retenção de Dados */}
        {showRetentionNotice && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid #334155',
            borderLeft: '4px solid #38bdf8',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 18,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12
          }}>
            <p style={{ fontSize: 12, color: '#cbd5e1', margin: 0, lineHeight: 1.45 }}>
              ℹ️ <strong>Política de Armazenamento:</strong> Os comprovantes anexados (PDF/Fotos) ficam salvos no servidor por <strong>6 meses</strong> e são apagados automaticamente após esse período para otimizar o banco de dados. Os lançamentos financeiros permanecem disponíveis por <strong>4 anos</strong>. Gere e salve o <strong>Relatório PDF</strong> mensalmente para arquivo permanente da ONG.
            </p>
            <button
              type="button"
              onClick={() => setShowRetentionNotice(false)}
              style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14, padding: '2px 6px' }}
              title="Ocultar aviso"
            >
              ✕
            </button>
          </div>
        )}

        {/* Faixa Informativa do Modo de Edição de Layout */}
        {isEditingLayout && (
          <div style={{
            background: '#1e293b',
            border: '1px dashed #f59e0b',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', margin: 0 }}>
                Modo de Reorganização de Blocos Ativo
              </p>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0 0' }}>
                Arraste os blocos pela barra superior ou use as setas para definir a ordem ideal para a diretoria.
              </p>
            </div>
            <button
              type="button"
              onClick={resetLayout}
              style={{
                background: 'transparent',
                border: '1px solid #64748b',
                color: '#94a3b8',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              Restaurar Padrão
            </button>
          </div>
        )}

        {showProfile && (
          <ProfileModal 
            user={{ ...user, name: activeName }} 
            onClose={() => setShowProfile(false)} 
            onUpdate={(newName, newEmail) => {
              setResponsibleName(newName);
              const u = { ...user, name: newName, email: newEmail || user.email };
              localStorage.setItem('user', JSON.stringify(u));
              load();
            }} 
          />
        )}

        {dataLoading ? (
          <SkeletonDashboard />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {blockOrder.map((blockId, index) => (
              <div
                key={blockId}
                draggable={isEditingLayout}
                onDragStart={() => handleDragStart(blockId)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(blockId)}
                style={{
                  position: 'relative',
                  marginBottom: isEditingLayout ? 24 : 0,
                  border: isEditingLayout ? '2px dashed #38bdf8' : 'none',
                  borderRadius: isEditingLayout ? 12 : 0,
                  padding: isEditingLayout ? 12 : 0,
                  background: isEditingLayout ? 'rgba(15, 23, 42, 0.4)' : 'transparent',
                  transition: 'all 0.2s ease',
                  cursor: isEditingLayout ? 'grab' : 'default'
                }}
              >
                {isEditingLayout && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#0f172a',
                    padding: '8px 12px',
                    borderRadius: 8,
                    marginBottom: 12,
                    border: '1px solid #334155'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16, color: '#38bdf8', cursor: 'grab' }}>⠿</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>
                        {blockLabels[blockId] || blockId}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveBlock(index, -1)}
                        style={{
                          background: '#1e293b',
                          color: index === 0 ? '#475569' : '#fff',
                          border: '1px solid #334155',
                          borderRadius: 6,
                          padding: '4px 8px',
                          cursor: index === 0 ? 'not-allowed' : 'pointer'
                        }}
                        title="Mover para cima"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={index === blockOrder.length - 1}
                        onClick={() => moveBlock(index, 1)}
                        style={{
                          background: '#1e293b',
                          color: index === blockOrder.length - 1 ? '#475569' : '#fff',
                          border: '1px solid #334155',
                          borderRadius: 6,
                          padding: '4px 8px',
                          cursor: index === blockOrder.length - 1 ? 'not-allowed' : 'pointer'
                        }}
                        title="Mover para baixo"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                )}

                {renderBlock(blockId)}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}