'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import AuthScreen from '../components/AuthScreen';
import SummaryCards from '../components/SummaryCards';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';
import Charts from '../components/Charts';
import AITips from '../components/AITips';
import Bills from '../components/Bills';
import Goals from '../components/Goals';
import HistoryChart from '../components/HistoryChart';
import UpcomingBills from '../components/UpcomingBills';import ExportPDF from '../components/ExportPDF';
import WhatsAppShare from '../components/WhatsAppShare';
import BackupExport from '../components/BackupExport';
import AppBackground from '../components/AppBackground';

import { SkeletonDashboard } from '../components/Skeleton';
import BudgetLimits from '../components/BudgetLimits';
import ProfileModal from '../components/ProfileModal';

export default function Home() {
  const { user, logout, loading } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, investment: 0, balance: 0, salary: 0, byCategory: [], history: [] });
  const [filter, setFilter] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });

  const [dataLoading, setDataLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

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

  useEffect(() => { load(); }, [load]);

  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#475569' }}>Carregando...</div>;
  if (!user) return <AuthScreen />;

  return (
    <>
    <AppBackground />
    <div className="container" style={{ position: 'relative', zIndex: 1 }}>
      {/* Header */}
      <div className="app-header">
        <div className="app-header-left">
          <img src="/logo.svg" alt="Logo" style={{ width: 38, height: 38 }} />
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' }}>Gerenciador de Gastos</h1>
            <p style={{ fontSize: 12, color: '#475569', marginTop: 1 }}>Olá, {user.name} 👋</p>
          </div>
        </div>
        <div className="app-header-right">
          <select value={filter.month} onChange={e => setFilter({ ...filter, month: +e.target.value })} style={{ width: 'auto', fontSize: 13, padding: '8px 28px 8px 10px' }}>
            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={filter.year} onChange={e => setFilter({ ...filter, year: +e.target.value })} style={{ width: 'auto', fontSize: 13, padding: '8px 28px 8px 10px' }}>
            {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y}>{y}</option>)}
          </select>
          <ExportPDF transactions={transactions} summary={summary} month={filter.month} year={filter.year} userName={user.name} />
          <WhatsAppShare summary={summary} month={filter.month} year={filter.year} userName={user.name} transactions={transactions} />
          <BackupExport onRestore={load} />
          <UpcomingBills />
          <button className="btn" onClick={() => setShowProfile(true)} style={{ background: '#0f172a', color: '#64748b', border: '1px solid #273548', fontSize: 13 }}>👤 Perfil</button>
          <button className="btn" onClick={logout} style={{ background: '#0f172a', color: '#64748b', border: '1px solid #273548', fontSize: 13 }}>Sair</button>
        </div>
      </div>

      {showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} onUpdate={name => { const u = {...user, name}; localStorage.setItem('user', JSON.stringify(u)); }} />}
      {dataLoading ? <SkeletonDashboard /> : <>
        <SummaryCards summary={summary} month={filter.month} year={filter.year} />
        <BudgetLimits summary={summary} />
        <HistoryChart history={summary.history} />
        <Charts summary={summary} />
        <Goals />
        <AITips />
        <Bills onUpdate={load} />
        <TransactionForm onAdd={load} />
        <TransactionList transactions={transactions} onDelete={load} />
      </>}
    </div>
    </>
  );
}
