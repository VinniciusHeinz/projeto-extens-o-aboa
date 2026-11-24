import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'O cadastro de novos usuários está desativado. Acesso exclusivo da diretoria da ABOA.' },
    { status: 403 }
  );
}