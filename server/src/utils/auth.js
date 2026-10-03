import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'web-blocker-secret-key-2026-v1lla-security';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'V1ll@uPc';

export function validateCredentials(username, password) {
  return username === ADMIN_USER && password === ADMIN_PASS;
}

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso no autorizado. Por favor inicia sesión.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Sesión expirada o token inválido.' });
  }

  req.user = decoded;
  next();
}
