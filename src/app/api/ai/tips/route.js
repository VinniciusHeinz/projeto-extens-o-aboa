import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Transaction } from '@/lib/models';
import { verifyToken } from '@/lib/authMiddleware';

export async function PATCH(req, { params }) {
  try {
    const user = verifyToken(req);
    const { id } = params;
    const body = await req.json();

    await connectDB();

    const existing = await Transaction.findOne({ _id: id, userId: user.id });
    if (!existing) {
      return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 });
    }

    // Lista de campos permitidos para edição (o campo 'type' é estritamente proibido de mudar)
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

    editableKeys.forEach((key) => {
      if (body[key] !== undefined) {
        const newVal = key === 'amount' || key === 'materialQuantity'
          ? Number(body[key]) || 0
          : body[key] === null ? null : String(body[key]).trim();

        const oldVal = existing[key] === null || existing[key] === undefined
          ? (key === 'amount' || key === 'materialQuantity' ? 0 : '')
          : existing[key];

        if (newVal !== oldVal) {
          editedSet.add(key);
          existing[key] = newVal;
        }
      }
    });

    // Validação se for Emenda Governamental
    if (String(existing.fundingSource).includes('Emenda Governamental') && !String(existing.amendmentCode).trim()) {
      return NextResponse.json(
        { error: 'O número da emenda ou processo é obrigatório para recursos governamentais.' },
        { status: 400 }
      );
    }

    existing.editedFields = Array.from(editedSet);
    existing.updatedAt = new Date();

    await existing.save();

    return NextResponse.json({ ...existing.toObject(), id: existing._id }, { status: 200 });
  } catch (e) {
    console.error('Erro ao atualizar lançamento:', e);
    return NextResponse.json({ error: 'Erro ao atualizar lançamento' }, { status: 500 });
  }
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