import { validateCredentials, generateToken } from '../utils/auth.js';

export function login(req, res) {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Por favor ingresa usuario y contraseña.' });
  }

  if (!validateCredentials(username.trim(), password)) {
    return res.status(401).json({ error: 'Credenciales incorrectas. Verifica usuario o contraseña.' });
  }

  const token = generateToken({ username: 'admin', role: 'administrator' });
  return res.json({
    token,
    user: {
      username: 'admin',
      name: 'Administrador de Sala',
      role: 'Administrador'
    },
    message: 'Sesión iniciada correctamente.'
  });
}

export function me(req, res) {
  return res.json({
    user: req.user,
    message: 'Sesión activa'
  });
}
