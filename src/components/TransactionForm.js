'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export const STORAGE_KEYS = {
  expense: 'aboa_cats_expense_v2',
  income: 'aboa_cats_income_v2',
  material_donation: 'aboa_cats_material_v2'
};

export const DEFAULT_EXPENSE_CATS = [
  'Alimentação / Cestas Básicas',
  'Materiais de Consumo',
  'Serviços de Terceiros',
  'Despesas com Pessoal',
  'Contas Fixas (Água / Luz / Internet)',
  'Despesas de Emenda',
  'Outros'
];

export const DEFAULT_INCOME_CATS = [
  'Doação via PIX / Transferência',
  'Doação em Espécie',
  'Repasse de Emenda',
  'Eventos / Bazares',
  'Termo de Fomento',
  'Outros'
];

export const DEFAULT_MATERIAL_CATS = [
  'Alimentos Não Perecíveis',
  'Higiene e Limpeza',
  'Roupas e Cobertores',
  'Móveis e Utensílios',
  'Equipamentos',
  'Outros'
];

function InfoBadge({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 5, cursor: 'help' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{ color: '#38bdf8', fontSize: 13, fontWeight: 700, lineHeight: 1 }}>ⓘ</span>
      {show && (
        <span style={{
          position: 'absolute',
          bottom: '135%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#0f172a',
          color: '#f8fafc',
          border: '1px solid #38bdf8',
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 11,
          fontWeight: 400,
          width: 230,
          zIndex: 999,
          boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
          lineHeight: 1.4,
          pointerEvents: 'none',
          textAlign: 'left'
        }}>
          {text}
        </span>
      )}
    </span>
  );
}

function formatCpfCnpj(value) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2') .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export default function TransactionForm({ onAdd }) {
  const [expenseCats, setExpenseCats] = useState(DEFAULT_EXPENSE_CATS);
  const [incomeCats, setIncomeCats] = useState(DEFAULT_INCOME_CATS);
  const [materialCats, setMaterialCats] = useState(DEFAULT_MATERIAL_CATS);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const [form, setForm] = useState({
    type: 'expense',
    description: '',
    rawAmount: 0,
    amountFormatted: '',
    category: DEFAULT_EXPENSE_CATS[0],
    date: new Date().toISOString().split('T')[0],
    fundingSource: 'Recursos Próprios / Doações',
    amendmentCode: '',
    entityName: '',
    entityDoc: '',
    materialItem: '',
    materialQuantity: '',
    receiptUrl: ''
  });

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Sincroniza categorias salvas no localStorage
  const syncCategories = useCallback(() => {
    try {
      const savedExp = localStorage.getItem(STORAGE_KEYS.expense);
      const savedInc = localStorage.getItem(STORAGE_KEYS.income);
      const savedMat = localStorage.getItem(STORAGE_KEYS.material_donation);

      if (savedExp) setExpenseCats(JSON.parse(savedExp));
      else localStorage.setItem(STORAGE_KEYS.expense, JSON.stringify(DEFAULT_EXPENSE_CATS));

      if (savedInc) setIncomeCats(JSON.parse(savedInc));
      else localStorage.setItem(STORAGE_KEYS.income, JSON.stringify(DEFAULT_INCOME_CATS));

      if (savedMat) setMaterialCats(JSON.parse(savedMat));
      else localStorage.setItem(STORAGE_KEYS.material_donation, JSON.stringify(DEFAULT_MATERIAL_CATS));
    } catch (e) {
      console.error('Erro ao sincronizar categorias:', e);
    }
  }, []);

  useEffect(() => {
    syncCategories();
    window.addEventListener('aboa-categories-updated', syncCategories);
    return () => window.removeEventListener('aboa-categories-updated', syncCategories);
  }, [syncCategories]);

  const handleAmountChange = (e) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    if (!rawDigits) {
      setForm(prev => ({ ...prev, rawAmount: 0, amountFormatted: '' }));
      return;
    }
    const numberValue = parseFloat(rawDigits) / 100;
    const formatted = numberValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
    setForm(prev => ({ ...prev, rawAmount: numberValue, amountFormatted: formatted }));
  };

  const handleDocChange = (e) => {
    setForm(prev => ({ ...prev, entityDoc: formatCpfCnpj(e.target.value) }));
  };

  const setType = (type) => {
    let cat = expenseCats[0] || DEFAULT_EXPENSE_CATS[0];
    if (type === 'income') cat = incomeCats[0] || DEFAULT_INCOME_CATS[0];
    if (type === 'material_donation') cat = materialCats[0] || DEFAULT_MATERIAL_CATS[0];

    setForm(prev => ({
      ...prev,
      type,
      category: cat
    }));
  };

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreateCategory = () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    if (form.type === 'income') {
      const updated = incomeCats.includes(trimmed) ? incomeCats : [...incomeCats, trimmed];
      setIncomeCats(updated);
      localStorage.setItem(STORAGE_KEYS.income, JSON.stringify(updated));
    } else if (form.type === 'material_donation') {
      const updated = materialCats.includes(trimmed) ? materialCats : [...materialCats, trimmed];
      setMaterialCats(updated);
      localStorage.setItem(STORAGE_KEYS.material_donation, JSON.stringify(updated));
    } else {
      const updated = expenseCats.includes(trimmed) ? expenseCats : [...expenseCats, trimmed];
      setExpenseCats(updated);
      localStorage.setItem(STORAGE_KEYS.expense, JSON.stringify(updated));
    }

    window.dispatchEvent(new Event('aboa-categories-updated'));
    setForm(prev => ({ ...prev, category: trimmed }));
    setNewCatName('');
    setIsAddingCategory(false);
  };

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
      setForm(prev => ({ ...prev, receiptUrl: reader.result }));
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.rawAmount || form.rawAmount <= 0) {
      setError('Informe um valor maior que zero.');
      return;
    }

    try {
      await api.post('/transactions', {
        ...form,
        amount: form.rawAmount,
        materialQuantity: form.materialQuantity ? parseFloat(form.materialQuantity) : 0
      });

      setForm(prev => ({
        ...prev,
        description: '',
        rawAmount: 0,
        amountFormatted: '',
        entityName: '',
        entityDoc: '',
        materialItem: '',
        materialQuantity: '',
        amendmentCode: '',
        receiptUrl: ''
      }));
      setError('');
      onAdd();
    } catch (err) {
      setError('Erro ao salvar lançamento. Verifique os campos obrigatórios.');
    }
  };

  const isIncome = form.type === 'income';
  const isMaterial = form.type === 'material_donation';
  const categories = isIncome ? incomeCats : isMaterial ? materialCats : expenseCats;
  const typeColor = isIncome ? '#22c55e' : isMaterial ? '#3b82f6' : '#ef4444';

  const inputStyle = {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#fff',
    fontSize: 13,
    width: '100%'
  };

  return (
    <div className="card" style={{ marginBottom: 24, padding: 22, background: '#1e293b', borderRadius: 12, border: '1px solid #334155' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center' }}>
          Registrar Movimentação
          <InfoBadge text="Utilize este painel para lançar todas as saídas financeiras, entradas de recursos e doações físicas recebidas pela ABOA." />
        </h2>
      </div>

      {/* Seletor de Tipo */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderRadius: 10, overflow: 'hidden', border: '1px solid #334155' }}>
        <button
          type="button"
          onClick={() => setType('expense')}
          style={{
            flex: 1, padding: '11px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
            background: form.type === 'expense' ? '#ef4444' : '#0f172a',
            color: form.type === 'expense' ? '#fff' : '#94a3b8'
          }}
        >
          ↑ Saída
        </button>
        <button
          type="button"
          onClick={() => setType('income')}
          style={{
            flex: 1, padding: '11px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
            background: form.type === 'income' ? '#22c55e' : '#0f172a',
            color: form.type === 'income' ? '#fff' : '#94a3b8'
          }}
        >
          ↓ Entrada
        </button>
        <button
          type="button"
          onClick={() => setType('material_donation')}
          style={{
            flex: 1, padding: '11px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
            background: form.type === 'material_donation' ? '#3b82f6' : '#0f172a',
            color: form.type === 'material_donation' ? '#fff' : '#94a3b8'
          }}
        >
          📦 Doação de Produtos
        </button>
      </div>

      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        
        {/* 1. Descrição */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
            Descrição *
            <InfoBadge text="Resumo da movimentação para o livro caixa. Exemplo: Compra de cestas básicas, Pagamento de energia elétrica ou Doação recebida." />
          </label>
          <input
            name="description"
            value={form.description}
            onChange={handle}
            required
            style={inputStyle}
          />
        </div>

        {/* 2. Categoria */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
              Categoria *
              <InfoBadge text="Classificação contábil da movimentação. Exemplo: Alimentação, Materiais de Consumo ou Serviços de Terceiros." />
            </label>
            <button
              type="button"
              onClick={() => setIsAddingCategory(!isAddingCategory)}
              style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: 11, cursor: 'pointer', padding: 0 }}
            >
              {isAddingCategory ? 'Cancelar' : '+ Nova'}
            </button>
          </div>

          {isAddingCategory ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Nome da categoria"
                style={{ ...inputStyle, borderColor: '#38bdf8', padding: '8px 10px' }}
              />
              <button
                type="button"
                onClick={handleCreateCategory}
                style={{ background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: 8, padding: '0 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
              >
                OK
              </button>
            </div>
          ) : (
            <select name="category" value={form.category} onChange={handle} style={inputStyle}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>

        {/* 3. Data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
            Data *
            <InfoBadge text="Data efetiva em que o pagamento, recebimento ou entrega de produtos foi realizado." />
          </label>
          <input
            name="date"
            type="date"
            value={form.date}
            onChange={handle}
            required
            style={inputStyle}
          />
        </div>

        {/* 4. Origem do Recurso */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
            Origem do Recurso *
            <InfoBadge text="Indica qual fundo custeou a operação. Selecione 'Emenda Governamental' quando envolver verba pública sujeita a prestação de contas." />
          </label>
          <select name="fundingSource" value={form.fundingSource} onChange={handle} required style={inputStyle}>
            <option value="Recursos Próprios / Doações">Recursos Próprios / Doações</option>
            <option value="Emenda Governamental / Termo de Fomento">Emenda Governamental</option>
            <option value="Eventos / Bazares Beneficentes">Eventos / Bazares</option>
          </select>
        </div>

        {/* 5. Código da Emenda (Condicional) */}
        {form.fundingSource.includes('Emenda Governamental') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b', display: 'flex', alignItems: 'center' }}>
              Nº da Emenda / Processo *
              <InfoBadge text="Identificador oficial do termo de fomento ou processo administrativo. Exemplo: Processo nº 2026/0042." />
            </label>
            <input
              name="amendmentCode"
              value={form.amendmentCode}
              onChange={handle}
              required
              style={{ ...inputStyle, borderColor: '#f59e0b' }}
            />
          </div>
        )}

        {/* 6. Fornecedor ou Doador */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
            {isIncome || isMaterial ? 'Doador' : 'Fornecedor'}
          </label>
          <input
            name="entityName"
            placeholder={isIncome || isMaterial ? "Nome do doador ou parceiro" : "Razão Social ou Nome"}
            value={form.entityName}
            onChange={handle}
            style={inputStyle}
          />
        </div>

        {/* 7. CPF ou CNPJ com Máscara */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
            CPF / CNPJ
          </label>
          <input
            name="entityDoc"
            inputMode="numeric"
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
            value={form.entityDoc}
            onChange={handleDocChange}
            style={inputStyle}
          />
        </div>

        {/* 8. Campos Exclusivos para Doação de Produtos */}
        {isMaterial && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#38bdf8', display: 'flex', alignItems: 'center' }}>
                Item Doado *
                <InfoBadge text="Especifique o produto recebido pela ONG. Exemplo: Pacote de Arroz 5kg, Cobertor de Casal, Fralda Infantil." />
              </label>
              <input
                name="materialItem"
                value={form.materialItem}
                onChange={handle}
                required
                style={{ ...inputStyle, borderColor: '#38bdf8' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#38bdf8', display: 'flex', alignItems: 'center' }}>
                Quantidade *
                <InfoBadge text="Total de unidades, pacotes ou quilos recebidos deste item. Exemplo: 50." />
              </label>
              <input
                name="materialQuantity"
                type="number"
                min="1"
                value={form.materialQuantity}
                onChange={handle}
                required
                style={{ ...inputStyle, borderColor: '#38bdf8' }}
              />
            </div>
          </>
        )}

        {/* 9. Valor em Reais */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
            {isMaterial ? 'Valor Estimado (R$) *' : 'Valor (R$) *'}
            <InfoBadge text={isMaterial ? "Valor financeiro estimado dos produtos recebidos para contabilização no balanço." : "Valor total pago ou recebido na operação."} />
          </label>
          <input
            name="amount"
            type="text"
            inputMode="numeric"
            placeholder="R$ 0,00"
            value={form.amountFormatted}
            onChange={handleAmountChange}
            required
            style={{ ...inputStyle, borderColor: typeColor, fontWeight: 600 }}
          />
        </div>

        {/* 10. Anexo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
            {isIncome || isMaterial ? 'Comprovante / Recibo' : 'Nota Fiscal / Recibo'}
            <InfoBadge text="Anexe a digitalização (PDF ou imagem de até 3MB) da Nota Fiscal, cupom ou recibo assinado para auditoria." />
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
            style={{ fontSize: 12, color: '#94a3b8', padding: '7px 0' }}
          />
          {uploading && <span style={{ fontSize: 11, color: '#38bdf8' }}>Anexando arquivo...</span>}
          {form.receiptUrl && <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>✓ Documento anexado</span>}
        </div>

        {/* Botão de Envio Direto */}
        <button
          type="submit"
          className="btn"
          style={{
            background: typeColor,
            color: '#fff',
            fontWeight: 700,
            gridColumn: '1 / -1',
            padding: '12px',
            marginTop: 6,
            cursor: 'pointer',
            borderRadius: 8,
            border: 'none',
            fontSize: 14
          }}
        >
          {isIncome 
            ? '+ Registrar Entrada' 
            : isMaterial 
            ? '📦 Registrar Doação' 
            : '+ Registrar Saída'}
        </button>
      </form>

      {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12, fontWeight: 500 }}>{error}</p>}
    </div>
  );
}