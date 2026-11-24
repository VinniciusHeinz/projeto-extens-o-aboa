import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token) return NextResponse.redirect(new URL('/?error=token_invalido', req.url));

    await connectDB();
    const user = await User.findOne({ verifyToken: token });
    if (!user) return NextResponse.redirect(new URL('/?error=token_invalido', req.url));

    user.emailVerified = true;
    user.verifyToken = null;
    await user.save();

    // Redireciona para login sem expor JWT na URL
    return NextResponse.redirect(new URL('/?verified=true', req.url));
  } catch (e) {
    return NextResponse.redirect(new URL('/?error=erro_interno', req.url));
  }
}
