/**
 * ============================================================
 * MIDDLEWARE: authenticateToken.js
 * ============================================================
 * Fungsi   : Memverifikasi JSON Web Token (JWT) pada setiap
 *            request ke endpoint yang terproteksi.
 * Posisi   : Dipasang SETELAH rateLimiter, SEBELUM checkRole.
 *
 * Cara pakai di route:
 *   const { authenticateToken } = require('../middleware/authenticateToken');
 *   router.get('/profile', authenticateToken, controller.getProfile);
 *
 * Cara pakai global di server.js:
 *   app.use('/api/protected', authenticateToken);
 *
 * Environment variable yang dibutuhkan:
 *   JWT_SECRET = string rahasia untuk sign/verify token
 * ============================================================
 */

const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  // 1. Ambil header Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

  // 2. Jika token tidak ada, tolak dengan 401
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required',
    });
  }

  // 3. Verifikasi token
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      // Token tidak valid atau sudah kadaluarsa
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    // 4. Simpan payload yang sudah didekode ke req.user
    //    Payload harus memuat: { userId, username, role }
    req.user = decoded;
    next();
  });
};

module.exports = { authenticateToken };
