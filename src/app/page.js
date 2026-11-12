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
import BackupExport from '../components/BackupExport';
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
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ 
    income: 0, 
    expense: 0, 
    investment: 0, 
    balance: 0, 
    salary: 0, 
    byCategory: [], 
    history: [] 
  });
  const [filter, setFilter] = useState({ 
    month: new Date().getMonth() + 1, 
    year: new Date().getFullYear() 
  });

  const [dataLoading, setDataLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  // Estados de Personalização de Layout
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [blockOrder, setBlockOrder] = useState(DEFAULT_BLOCK_ORDER);
  const [draggedBlock, setDraggedBlock] = useState(null);

  useEffect(() => {
    setMounted(true);
    try {
      const savedOrder = localStorage.getItem(STORAGE_LAYOUT_KEY);
      if (savedOrder) {
        const parsed = JSON.parse(savedOrder);
        // Garante que todos os blocos padrão continuem existindo
        const merged = [...parsed, ...DEFAULT_BLOCK_ORDER.filter(b => !parsed.includes(b))];
        setBlockOrder(merged);
      }
    } catch (e) {
      console.error('Erro ao ler layout salvo:', e);
    }
  }, []);

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

  // Manipulação de Ordem (Drag and Drop nativo e Setas)
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

  const handleDragStart = (id) => {
    setDraggedBlock(id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

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

  const resetLayout = () => {
    saveLayoutOrder(DEFAULT_BLOCK_ORDER);
  };

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

  // Dicionário de renderização dos blocos
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
        return <HistoryChart history={summary.history} />;
      default:
        return null;
    }
  };

  const blockLabels = {
    summary: 'Indicadores e Balanço Geral',
    form: 'Formulário de Movimentações (Entrada / Saída / Doações)',
    list: 'Livro Caixa e Prestação de Contas (Transações)',
    limits: 'Tetos Orçamentários por Rubrica (Plano de Trabalho)',
    bills: 'Contas a Pagar e Compromissos Fixos',
    charts: 'Gráficos de Despesas por Categoria e Balanço',
    history: 'Evolução Histórica das Contas'
  };

  return (
    <>
      <AppBackground />
      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="app-header">
          <div className="app-header-left">
            <img src="/logo.svg" alt="Logo ABOA" style={{ width: 38, height: 38 }} />
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' }}>ABOA — Gestão & Prestação de Contas</h1>
              <p style={{ fontSize: 12, color: '#475569', marginTop: 1 }}>Operador: {user.name} 👋</p>
            </div>
          </div>
          <div className="app-header-right">
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
              {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y}>{y}</option>)}
            </select>

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

            <ExportPDF transactions={transactions} summary={summary} month={filter.month} year={filter.year} userName={user.name} />
            <WhatsAppShare summary={summary} month={filter.month} year={filter.year} userName={user.name} transactions={transactions} />
            <BackupExport onRestore={load} />
            <UpcomingBills />
            <button className="btn" onClick={() => setShowProfile(true)} style={{ background: '#0f172a', color: '#64748b', border: '1px solid #273548', fontSize: 13 }}>👤 Perfil</button>
            <button className="btn" onClick={logout} style={{ background: '#0f172a', color: '#64748b', border: '1px solid #273548', fontSize: 13 }}>Sair</button>
          </div>
        </div>

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
            user={user} 
            onClose={() => setShowProfile(false)} 
            onUpdate={name => { 
              const u = {...user, name}; 
              localStorage.setItem('user', JSON.stringify(u)); 
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
                {/* Barra de Controle do Bloco em Modo de Edição */}
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