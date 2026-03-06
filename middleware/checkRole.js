/**
 * ============================================================
 * MIDDLEWARE: checkRole.js
 * ============================================================
 * Fungsi   : Mengontrol akses endpoint berdasarkan peran
 *            pengguna (Role-Based Access Control / RBAC).
 *            Menggunakan pola higher-order function sehingga
 *            role yang diizinkan dapat dikonfigurasi per endpoint.
 * Posisi   : Dipasang SETELAH authenticateToken.
 *
 * Cara pakai:
 *   const { checkRole } = require('../middleware/checkRole');
 *
 *   // Hanya admin
 *   router.get('/admin/users', authenticateToken, checkRole('admin'), controller.getAllUsers);
 *
 *   // Admin dan moderator
 *   router.get('/dashboard', authenticateToken, checkRole('admin', 'moderator'), controller.getDashboard);
 *
 *   // Semua role yang sudah login
 *   router.get('/profile', authenticateToken, checkRole('user', 'admin'), controller.getProfile);
 *
 * Syarat   : req.user harus sudah tersedia (authenticateToken harus
 *            dijalankan sebelum checkRole).
 *            JWT payload harus memuat field { role }.
 * ============================================================
 */

const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    // 1. Pastikan req.user tersedia (authenticateToken sudah dijalankan)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: no user context found',
      });
    }

    // 2. Periksa apakah role pengguna ada dalam daftar role yang diizinkan
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: requires role [${allowedRoles.join(', ')}]`,
        yourRole: req.user.role,
      });
    }

    // 3. Role sesuai, lanjutkan ke handler berikutnya
    next();
  };
};

module.exports = { checkRole };
