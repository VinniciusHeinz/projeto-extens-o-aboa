import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Transaction } from '@/lib/models';
import { verifyToken } from '@/lib/authMiddleware';

const MAX_AMOUNT = 50_000_000;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_TYPES = ['income', 'expense', 'material_donation'];

// Aceita tanto as strings reduzidas quanto as completas enviadas pelo TransactionForm
const VALID_FUNDING_SOURCES = [
  'Doações Gerais',
  'Recursos Próprios / Doações Gerais',
  'Recursos Próprios / Doações',
  'Emenda Governamental / Fomento',
  'Emenda Governamental / Termo de Fomento',
  'Eventos / Bazares',
  'Eventos / Bazares Beneficentes'
];

export async function GET(req) {
  try {
    const user = verifyToken(req);
    await connectDB();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const fundingSource = searchParams.get('fundingSource');

    const query = { userId: user.id };
    if (fundingSource) {
      query.fundingSource = fundingSource;
    }

    let rows = await Transaction.find(query).lean();

    if (month && year) {
      rows = rows.filter(t => {
        const [y, m] = t.date.split('-').map(Number);
        return m === +month && y === +year;
      });
    }

    rows.sort((a, b) => new Date(b.date) - new Date(a.date));
    return NextResponse.json(rows.map(t => ({ ...t, id: t._id })));
  } catch (e) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
}

export async function POST(req) {
  try {
    const user = verifyToken(req);
    const body = await req.json();
    const {
      type,
      description,
      amount,
      category,
      date,
      fundingSource = 'Recursos Próprios / Doações Gerais',
      amendmentCode = '',
      entityName = '',
      entityDoc = '',
      materialItem = '',
      materialQuantity = 0,
      receiptUrl = null
    } = body;

    // 1. Validações básicas de presença
    if (!type || !description || amount === undefined || !category || !date) {
      return NextResponse.json({ error: 'Campos obrigatórios não preenchidos' }, { status: 400 });
    }

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Tipo de movimentação inválido' }, { status: 400 });
    }

    if (!VALID_FUNDING_SOURCES.includes(fundingSource)) {
      return NextResponse.json({ error: 'Origem de recurso inválida' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > MAX_AMOUNT) {
      return NextResponse.json({ error: 'Valor financeiro ou estimado inválido' }, { status: 400 });
    }

    if (!DATE_REGEX.test(date)) {
      return NextResponse.json({ error: 'Formato de data inválido (esperado: AAAA-MM-DD)' }, { status: 400 });
    }

    // 2. Validação de emenda governamental
    const isAmendment = fundingSource.includes('Emenda Governamental');
    if (isAmendment && !String(amendmentCode).trim()) {
      return NextResponse.json({ error: 'O código ou identificador da emenda é obrigatório para recursos de fomento' }, { status: 400 });
    }

    // 3. Validação de doações de materiais
    if (type === 'material_donation') {
      if (!String(materialItem).trim() || Number(materialQuantity) <= 0) {
        return NextResponse.json({ error: 'Para doações de produtos, informe a descrição do item e quantidade maior que zero' }, { status: 400 });
      }
    }

    const cleanDesc = String(description).trim().slice(0, 200);
    const cleanCat = String(category).trim().slice(0, 100);
    const cleanEntityName = String(entityName).trim().slice(0, 150);
    const cleanEntityDoc = String(entityDoc).trim().slice(0, 30);
    const cleanAmendmentCode = String(amendmentCode).trim().slice(0, 100);
    const cleanMaterialItem = String(materialItem).trim().slice(0, 150);
    const parsedQuantity = parseFloat(materialQuantity) || 0;

    await connectDB();

    const t = await Transaction.create({
      userId: user.id,
      type,
      description: cleanDesc,
      amount: parsedAmount,
      category: cleanCat,
      date,
      fundingSource,
      amendmentCode: cleanAmendmentCode,
      entityName: cleanEntityName,
      entityDoc: cleanEntityDoc,
      materialItem: cleanMaterialItem,
      materialQuantity: parsedQuantity,
      receiptUrl
    });

    return NextResponse.json({ ...t.toObject(), id: t._id }, { status: 201 });
  } catch (e) {
    console.error('Erro ao salvar transação:', e);
    return NextResponse.json({ error: 'Erro interno ao processar lançamento' }, { status: 500 });
  }
}