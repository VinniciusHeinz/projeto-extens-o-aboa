import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { User, Transaction, Bill } from '@/lib/models';
import { verifyToken } from '@/lib/authMiddleware';

export async function GET(req) {
  try {
    const authUser = verifyToken(req);
    await connectDB();

    const user = await User.findById(authUser.id).select('-password').lean();
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (e) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
}

async function updateProfile(req) {
  try {
    const authUser = verifyToken(req);
    const { name, email, phone, currentPassword, newPassword } = await req.json();

    await connectDB();
    const user = await User.findById(authUser.id);
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const oldName = user.name;

    if (name) user.name = String(name).trim();
    if (phone !== undefined) user.phone = String(phone || '').trim();

    if (email && String(email).toLowerCase().trim() !== user.email) {
      const cleanEmail = String(email).toLowerCase().trim();
      const exists = await User.findOne({ email: cleanEmail, _id: { $ne: user._id } });
      if (exists) {
        return NextResponse.json({ error: 'Este e-mail já está em uso.' }, { status: 400 });
      }
      user.email = cleanEmail;
    }

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Informe a senha atual para definir uma nova senha.' }, { status: 400 });
      }
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 400 });
      }
      if (String(newPassword).length < 6) {
        return NextResponse.json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();

    if (name && user.name !== oldName) {
      await Promise.all([
        Transaction.updateMany({}, { $set: { createdByName: user.name } }),
        Bill.updateMany({}, { $set: { createdByName: user.name } })
      ]);
    }

    return NextResponse.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone
    });
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
  }
}

export async function PUT(req) {
  return updateProfile(req);
}

export async function PATCH(req) {
  return updateProfile(req);
}