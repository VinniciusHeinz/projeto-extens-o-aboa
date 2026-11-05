'use client';
import { useState } from 'react';
import api from '../lib/api';

const CATEGORIES_EXPENSE = [
  'Custos com Pessoal', 
  'Alimentação / Cestas', 
  'Material de Consumo', 
  'Serviços de Terceiros', 
  'Água / Luz / Internet', 
  'Despesas da Emenda', 
  'Outros'
];

const CATEGORIES_INCOME = [
  'Doação Física / Dinheiro', 
  'Doação via PIX', 
  'Repasse de Emenda Governamental', 
  'Bazar / Evento', 
  'Outros'
];

const CATEGORIES_MATERIAL = [
  'Alimentos Não Perecíveis', 
  'Higiene e Limpeza', 
  'Roupas e Cobertores', 
  'Móveis / Equipamentos', 
  'Outros'
];

export default function TransactionForm({ onAdd }) {
  const [form, setForm] = useState({
    type: 'expense',
    description: '',
    amount: '',
    category: 'Alimentação / Cestas',
    date: new Date().toISOString().split('T')[0],
    fundingSource: 'Doações Gerais',
    amendmentCode: '',
    entityName: '',
    entityDoc: '',
    materialItem: '',
    materialQuantity: '',
    receiptUrl: ''
  });

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const setType = (type) => setForm({
    ...form,
    type,
    category: type === 'income' 
      ? 'Doação via PIX' 
      : type === 'material_donation' 
      ? 'Alimentos Não Perecíveis' 
      : 'Material de Consumo'
  });

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Exemplo de conversão de comprovante escaneado para Base64 leve ou upload direto
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('O arquivo deve ter no máximo 3MB.');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, receiptUrl: reader.result }));
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/transactions', {
        ...form,
        amount: parseFloat(form.amount) || 0,
        materialQuantity: form.materialQuantity ? parseFloat(form.materialQuantity) : 0
      });
      setForm({
        ...form,
        description: '',
        amount: '',
        entityName: '',
        entityDoc: '',
        materialItem: '',
        materialQuantity: '',
        amendmentCode: '',
        receiptUrl: ''
      });
      setError('');
      onAdd();
    } catch (e) {
      setError('Erro ao registrar lançamento. Verifique os dados e tente novamente.');
    }
  };

  const isIncome = form.type === 'income';
  const isMaterial = form.type === 'material_donation';
  const categories = isIncome ? CATEGORIES_INCOME : isMaterial ? CATEGORIES_MATERIAL : CATEGORIES_EXPENSE;
  const typeColor = isIncome ? '#22c55e' : isMaterial ? '#3b82f6' : '#ef4444';

  return (
    <div className="card" style={{ marginBottom: 24, padding: 20, background: '#1e293b', borderRadius: 12 }}>
      <p style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 16 }}>
        Registrar Movimentação — ABOA
      </p>

      {/* Seletor de Tipo */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 10, overflow: 'hidden', border: '1px solid #334155' }}>
        <button type="button" onClick={() => setType('expense')} style={{
          flex: 1, padding: '12px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
          background: form.type === 'expense' ? '#ef4444' : '#0f172a',
          color: form.type === 'expense' ? '#fff' : '#94a3b8'
        }}>
          ↑ Saída / Pagamento
        </button>
        <button type="button" onClick={() => setType('income')} style={{
          flex: 1, padding: '12px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
          background: form.type === 'income' ? '#22c55e' : '#0f172a',
          color: form.type === 'income' ? '#fff' : '#94a3b8'
        }}>
          ↓ Entrada Financeira
        </button>
        <button type="button" onClick={() => setType('material_donation')} style={{
          flex: 1, padding: '12px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
          background: form.type === 'material_donation' ? '#3b82f6' : '#0f172a',
          color: form.type === 'material_donation' ? '#fff' : '#94a3b8'
        }}>
          📦 Doação de Produtos
        </button>
      </div>

      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        
        {/* Descrição geral */}
        <input 
          name="description" 
          placeholder={isMaterial ? "Ex: Doação de cestas básicas" : "Descrição da movimentação"} 
          value={form.description} 
          onChange={handle} 
          required 
        />

        {/* Categoria */}
        <select name="category" value={form.category} onChange={handle}>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Data */}
        <input name="date" type="date" value={form.date} onChange={handle} required />

        {/* Origem do Recurso (Crucial para Emenda Governamental) */}
        <select name="fundingSource" value={form.fundingSource} onChange={handle} required>
          <option value="Doações Gerais">Recursos Próprios / Doações</option>
          <option value="Emenda Governamental / Fomento">Emenda Governamental / Termo de Fomento</option>
          <option value="Eventos / Bazares">Eventos / Bazares</option>
        </select>

        {/* Código da Emenda se selecionado */}
        {form.fundingSource === 'Emenda Governamental / Fomento' && (
          <input 
            name="amendmentCode" 
            placeholder="Nº da Emenda ou Processo Administrativo" 
            value={form.amendmentCode} 
            onChange={handle} 
            required 
            style={{ borderColor: '#f59e0b' }}
          />
        )}

        {/* Dados da Contraparte (Doador ou Fornecedor) */}
        <input 
          name="entityName" 
          placeholder={isIncome || isMaterial ? "Nome do Doador" : "Razão Social / Nome do Fornecedor"} 
          value={form.entityName} 
          onChange={handle} 
        />
        <input 
          name="entityDoc" 
          placeholder="CPF ou CNPJ (Opcional p/ doador pequeno)" 
          value={form.entityDoc} 
          onChange={handle} 
        />

        {/* Campos exclusivos para Doação de Produtos */}
        {isMaterial && (
          <>
            <input 
              name="materialItem" 
              placeholder="Item doado (ex: Pacote de Feijão 1kg)" 
              value={form.materialItem} 
              onChange={handle} 
              required 
            />
            <input 
              name="materialQuantity" 
              type="number" 
              min="1" 
              placeholder="Quantidade de itens" 
              value={form.materialQuantity} 
              onChange={handle} 
              required 
            />
          </>
        )}

        {/* Valor Total ou Valor Estimado dos produtos */}
        <input 
          name="amount" 
          type="number" 
          step="0.01" 
          min="0.01" 
          placeholder={isMaterial ? "Valor Total Estimado (R$)" : "Valor (R$)"} 
          value={form.amount} 
          onChange={handle} 
          required 
          style={{ borderColor: typeColor }}
        />

        {/* Upload de Comprovante Fiscal / Recibo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 12, color: '#94a3b8' }}>
            {isIncome || isMaterial ? 'Comprovante / Termo (PDF/Foto):' : 'Nota Fiscal / Recibo Obrigatório:'}
          </label>
          <input 
            type="file" 
            accept="image/*,application/pdf" 
            onChange={handleFileUpload} 
            style={{ fontSize: 12 }}
          />
          {uploading && <span style={{ fontSize: 11, color: '#38bdf8' }}>Carregando anexo...</span>}
          {form.receiptUrl && <span style={{ fontSize: 11, color: '#22c55e' }}>✓ Documento anexado com sucesso</span>}
        </div>

        {/* Botão de Envio */}
        <button 
          type="submit" 
          className="btn" 
          style={{ 
            background: typeColor, 
            color: '#fff', 
            fontWeight: 600, 
            gridColumn: '1 / -1', 
            padding: '12px', 
            marginTop: 8,
            cursor: 'pointer' 
          }}
        >
          {isIncome 
            ? '+ Registrar Entrada Financeira' 
            : isMaterial 
            ? '📦 Salvar Doação de Produtos' 
            : '+ Registrar Despesa / Saída'}
        </button>
      </form>

      {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 10 }}>{error}</p>}
    </div>
  );
}