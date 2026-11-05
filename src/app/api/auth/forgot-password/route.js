import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { sendEmail } from '@/lib/mailer';

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'E-mail obrigatório' }, { status: 400 });

    await connectDB();
    const user = await User.findOne({ email });

    // Sempre retorna sucesso para não revelar se o email existe
    if (!user) return NextResponse.json({ message: 'Se o e-mail existir, você receberá as instruções.' });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hora
    await user.save();

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://relatorio-financeiro-five.vercel.app'}/reset-password?token=${token}`;

    await sendEmail({
      to: email,
      subject: 'Redefinição de senha — Gerenciador de Gastos',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px">
          <h2 style="color:#6366f1;margin-bottom:16px">💰 Gerenciador de Gastos</h2>
          <p style="margin-bottom:16px">Olá, <strong>${user.name}</strong>!</p>
          <p style="margin-bottom:24px;color:#94a3b8">Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-bottom:24px">
            Redefinir Senha
          </a>
          <p style="font-size:12px;color:#475569">Este link expira em 1 hora. Se você não solicitou a redefinição, ignore este e-mail.</p>
        </div>
      `,
    });

    return NextResponse.json({ message: 'Se o e-mail existir, você receberá as instruções.' });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
