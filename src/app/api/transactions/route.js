import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Transaction, User } from '@/lib/models';
import { verifyToken } from '@/lib/authMiddleware';

const MAX_AMOUNT = 50_000_000;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_TYPES = ['income', 'expense', 'material_donation'];

const VALID_FUNDING_SOURCES = [
  'Doações Gerais',
  'Recursos Próprios / Doações Gerais',
  'Recursos Próprios / Doações',
  'Emenda Governamental / Fomento',
  'Emenda Governamental / Termo de Fomento',
  'Eventos / Bazares',
  'Eventos / Bazares Beneficentes'
];

// Política de Retenção ABOA: 180 dias (6 meses) para anexos e 1461 dias (4 anos) para lançamentos
async function enforceDataRetention() {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const fourYearsAgo = new Date(now.getTime() - 1461 * 24 * 60 * 60 * 1000);

    const sixMonthsStr = sixMonthsAgo.toISOString().split('T')[0];
    const fourYearsStr = fourYearsAgo.toISOString().split('T')[0];

    await Promise.all([
      // 1. Remove anexos com mais de 6 meses para otimizar o armazenamento
      Transaction.updateMany(
        {
          receiptUrl: { $ne: null, $ne: '' },$or: [
            { createdAt: { $lt: sixMonthsAgo } },
            { createdAt: { $exists: false }, date: {$lt: sixMonthsStr } }
          ]
        },
        { $set: { receiptUrl: null, receiptExpired: true } }
      ),
      // 2. Remove lançamentos com mais de 4 anos
      Transaction.deleteMany({
        $or: [
          { createdAt: { $lt: fourYearsAgo } },
          { createdAt: { $exists: false }, date: {$lt: fourYearsStr } }
        ]
      })
    ]);
  } catch (err) {
    console.error('Aviso na rotina de retenção:', err.message);
  }
}

export async function GET(req) {
  try {
    verifyToken(req);
    await connectDB();

    await enforceDataRetention();

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const fundingSource = searchParams.get('fundingSource');

    const query = {};
    if (fundingSource) {
      query.fundingSource = fundingSource;
    }

    const [rows, users] = await Promise.all([
      Transaction.find(query).lean(),
      User.find({}, 'name').lean()
    ]);

    const userMap = {};
    users.forEach(u => {
      userMap[String(u._id)] = u.name;
    });

    let filteredRows = rows;
    if (month && year) {
      filteredRows = rows.filter(t => {
        const [y, m] = t.date.split('-').map(Number);
        return m === +month && y === +year;
      });
    }

    filteredRows.sort((a, b) => new Date(b.date) - new Date(a.date));

    return NextResponse.json(
      filteredRows.map(t => ({
        ...t,
        id: t._id,
        createdByName: t.createdByName || userMap[String(t.userId)] || 'Diretoria ABOA'
      }))
    );
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
      fundingSource = 'Recursos Próprios / Doações',
      amendmentCode = '',
      entityName = '',
      entityDoc = '',
      materialItem = '',
      materialQuantity = 0,
      receiptUrl = null
    } = body;

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

    const isAmendment = fundingSource.includes('Emenda Governamental');
    if (isAmendment && !String(amendmentCode).trim()) {
      return NextResponse.json({ error: 'O código ou identificador da emenda é obrigatório para recursos de fomento' }, { status: 400 });
    }

    if (type === 'material_donation') {
      if (!String(materialItem).trim() || Number(materialQuantity) <= 0) {
        return NextResponse.json({ error: 'Para doações de produtos, informe a descrição do item e quantidade maior que zero' }, { status: 400 });
      }
    }

    await connectDB();

    const dbUser = await User.findById(user.id).lean();
    const operatorName = dbUser?.name || user.name || 'Diretoria ABOA';

    const t = await Transaction.create({
      userId: user.id,
      createdByName: operatorName,
      type,
      description: String(description).trim().slice(0, 200),
      amount: parsedAmount,
      category: String(category).trim().slice(0, 100),
      date,
      fundingSource,
      amendmentCode: String(amendmentCode).trim().slice(0, 100),
      entityName: String(entityName).trim().slice(0, 150),
      entityDoc: String(entityDoc).trim().slice(0, 30),
      materialItem: String(materialItem).trim().slice(0, 150),
      materialQuantity: parseFloat(materialQuantity) || 0,
      receiptUrl,
      receiptExpired: false
    });

    return NextResponse.json({ ...t.toObject(), id: t._id }, { status: 201 });
  } catch (e) {
    console.error('Erro ao salvar transação:', e);
    return NextResponse.json({ error: 'Erro interno ao processar lançamento' }, { status: 500 });
  }
}