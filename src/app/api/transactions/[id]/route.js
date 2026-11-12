import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Transaction } from '@/lib/models';
import { verifyToken } from '@/lib/authMiddleware';

async function handleUpdate(req, { params }) {
  try {
    const user = verifyToken(req);
    const { id } = params;
    const body = await req.json();

    await connectDB();

    const existing = await Transaction.findOne({ _id: id, userId: user.id }).lean();
    if (!existing) {
      return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 });
    }

    const editableKeys = [
      'description',
      'amount',
      'category',
      'date',
      'fundingSource',
      'amendmentCode',
      'entityName',
      'entityDoc',
      'materialItem',
      'materialQuantity',
      'receiptUrl'
    ];

    const editedSet = new Set(existing.editedFields || []);
    const updateData = {};

    editableKeys.forEach((key) => {
      if (body[key] !== undefined) {
        const newVal =
          key === 'amount' || key === 'materialQuantity'
            ? Number(body[key]) || 0
            : body[key] === null
            ? null
            : String(body[key]).trim();

        const oldVal =
          existing[key] === null || existing[key] === undefined
            ? key === 'amount' || key === 'materialQuantity'
              ? 0
              : ''
            : existing[key];

        if (newVal !== oldVal) {
          editedSet.add(key);
        }
        updateData[key] = newVal;
      }
    });

    const finalFunding = updateData.fundingSource ?? existing.fundingSource;
    const finalAmendment = updateData.amendmentCode ?? existing.amendmentCode;

    if (String(finalFunding).includes('Emenda Governamental') && !String(finalAmendment).trim()) {
      return NextResponse.json(
        { error: 'O número da emenda ou processo é obrigatório para recursos governamentais.' },
        { status: 400 }
      );
    }

    updateData.editedFields = Array.from(editedSet);
    updateData.updatedAt = new Date();

    const updated = await Transaction.findOneAndUpdate(
      { _id: id, userId: user.id },
      { $set: updateData },
      { new: true, strict: false }
    ).lean();

    return NextResponse.json({ ...updated, id: updated._id }, { status: 200 });
  } catch (e) {
    console.error('Erro ao atualizar lançamento:', e);
    return NextResponse.json({ error: 'Erro ao atualizar lançamento' }, { status: 500 });
  }
}

export async function PATCH(req, context) {
  return handleUpdate(req, context);
}

export async function PUT(req, context) {
  return handleUpdate(req, context);
}

export async function DELETE(req, { params }) {
  try {
    const user = verifyToken(req);
    const { id } = params;
    await connectDB();

    const deleted = await Transaction.findOneAndDelete({ _id: id, userId: user.id });
    if (!deleted) {
      return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Excluído com sucesso' }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao excluir registro' }, { status: 500 });
  }
}