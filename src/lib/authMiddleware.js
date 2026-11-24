import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('JWT_SECRET não configurado nas variáveis de ambiente');

export function verifyToken(req) {
  const auth = req.headers.get('authorization');
  if (!auth) throw new Error('Token não fornecido');
  const token = auth.split(' ')[1];
  return jwt.verify(token, SECRET);
}

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}
