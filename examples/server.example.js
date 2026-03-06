/**
 * ============================================================
 * server.example.js
 * ============================================================
 * Contoh implementasi lengkap middleware modular pada server
 * Express.js. File ini mendemonstrasikan urutan pemasangan
 * yang benar dan cara konfigurasi per endpoint.
 *
 * Salin pola ini ke server.js proyek Anda.
 * ============================================================
 */

require('dotenv').config();
const express = require('express');
const app = express();

// ── Import Middleware ─────────────────────────────────────────
const { requestLogger }     = require('./middleware/requestLogger');
const { globalLimiter,
        loginLimiter,
        authLimiter }       = require('./middleware/rateLimiter');
const { authenticateToken } = require('./middleware/authenticateToken');
const { checkRole }         = require('./middleware/checkRole');
const { errorHandler }      = require('./middleware/errorHandler');
const {
  validate,
  validateRegister,
  validateLogin,
  validateChangePassword,
  validateUpdateProfile,
}                           = require('./middleware/validateRequest');

// ── Konfirmasi Middleware Aktif ───────────────────────────────
console.log('Middleware aktif:');
console.log('  ✅ requestLogger     — audit trail');
console.log('  ✅ globalLimiter     — proteksi brute force global');
console.log('  ✅ authenticateToken — verifikasi JWT');
console.log('  ✅ checkRole         — kontrol akses RBAC');
console.log('  ✅ validateRequest   — validasi input');
console.log('  ✅ errorHandler      — penanganan error terpusat');

// ── Middleware Global (urutan penting) ────────────────────────
app.use(requestLogger);           // 1. Catat semua request (paling atas)
app.use(globalLimiter);           // 2. Batasi request global
app.use(express.json());          // 3. Parse JSON body
app.use(express.urlencoded({ extended: true }));

// ── Contoh Route: Publik (tanpa autentikasi) ─────────────────
app.post(
  '/api/auth/register',
  authLimiter,          // Batasi percobaan registrasi
  validateRegister,     // Validasi input
  validate,             // Jalankan validasi
  (req, res) => {
    // Logika register ada di sini (atau di controller terpisah)
    res.status(201).json({ success: true, message: 'User registered successfully' });
  }
);

app.post(
  '/api/auth/login',
  loginLimiter,         // Batasi percobaan login (maks 5x/15 menit)
  validateLogin,        // Validasi input
  validate,
  (req, res) => {
    // Logika login ada di sini
    // Pastikan JWT payload memuat { userId, username, role }
    res.status(200).json({ success: true, token: '<jwt_token>' });
  }
);

// ── Contoh Route: Terproteksi (perlu token) ──────────────────
app.get(
  '/api/profile',
  authenticateToken,    // Verifikasi JWT
  (req, res) => {
    res.status(200).json({ success: true, user: req.user });
  }
);

app.put(
  '/api/profile/change-password',
  authenticateToken,
  validateChangePassword,
  validate,
  (req, res) => {
    res.status(200).json({ success: true, message: 'Password updated' });
  }
);

// ── Contoh Route: Hanya Admin ─────────────────────────────────
app.get(
  '/api/admin/users',
  authenticateToken,    // 1. Verifikasi token
  checkRole('admin'),   // 2. Pastikan role admin
  (req, res) => {
    res.status(200).json({ success: true, users: [] });
  }
);

// ── Contoh Route: Multi-Role ──────────────────────────────────
app.get(
  '/api/dashboard',
  authenticateToken,
  checkRole('user', 'admin', 'moderator'), // Semua role yang login
  (req, res) => {
    res.status(200).json({ success: true, data: {} });
  }
);

// ── Error Handler (harus paling bawah) ───────────────────────
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\nServer running on port ${PORT}`);
});

module.exports = app;
