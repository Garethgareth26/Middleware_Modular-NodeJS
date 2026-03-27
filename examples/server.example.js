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
const { requestLogger }       = require('../middleware/requestLogger');
const { globalLimiter,
        loginLimiter,
        authLimiter }         = require('../middleware/rateLimiter');
const { authenticateToken }   = require('../middleware/authenticateToken');
const { checkRole }           = require('../middleware/checkRole');
const { errorHandler }        = require('../middleware/errorHandler');
const {
  validate,
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
  validateCreateResource,
}                             = require('../middleware/validateRequest');

// ── Konfirmasi Middleware Aktif ───────────────────────────────
console.log('Middleware aktif:');
console.log('  \u2705 requestLogger     \u2014 audit trail');
console.log('  \u2705 globalLimiter     \u2014 proteksi brute force global');
console.log('  \u2705 authenticateToken \u2014 verifikasi JWT');
console.log('  \u2705 checkRole         \u2014 kontrol akses RBAC');
console.log('  \u2705 validateRequest   \u2014 validasi input');
console.log('  \u2705 errorHandler      \u2014 penanganan error terpusat');

// ── Middleware Global (urutan penting) ────────────────────────
app.use(requestLogger);           // 1. Catat semua request (paling atas)
app.use(globalLimiter);           // 2. Batasi request global
app.use(express.json());          // 3. Parse JSON body
app.use(express.urlencoded({ extended: true }));

// ── Route: Publik ─────────────────────────────────────────────
app.post(
  '/api/auth/register',
  authLimiter,
  validateRegister,
  validate,
  (req, res) => {
    res.status(201).json({ success: true, message: 'User registered successfully' });
  }
);

app.post(
  '/api/auth/login',
  loginLimiter,
  validateLogin,
  validate,
  (req, res) => {
    res.status(200).json({ success: true, token: '<jwt_token>' });
  }
);

// ── Route: Terproteksi ────────────────────────────────────────
app.get(
  '/api/profile',
  authenticateToken,
  (req, res) => {
    res.status(200).json({ success: true, user: req.user });
  }
);

app.put(
  '/api/profile/update',
  authenticateToken,
  validateUpdateProfile,
  validate,
  (req, res) => {
    res.status(200).json({ success: true, message: 'Profile updated' });
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

// ── Route: Hanya Admin ────────────────────────────────────────
app.get(
  '/api/admin/users',
  authenticateToken,
  checkRole('admin'),
  (req, res) => {
    res.status(200).json({ success: true, users: [] });
  }
);

// ── Route: Multi-Role ─────────────────────────────────────────
app.get(
  '/api/dashboard',
  authenticateToken,
  checkRole('user', 'admin'),
  (req, res) => {
    res.status(200).json({ success: true, data: {} });
  }
);

// ── Route: Resource Generic ───────────────────────────────────
app.post(
  '/api/resource',
  authenticateToken,
  validateCreateResource,
  validate,
  (req, res) => {
    res.status(201).json({ success: true, message: 'Resource created' });
  }
);

// ── Error Handler (harus paling bawah) ───────────────────────
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\nServer running on http://localhost:${PORT}`);
});

module.exports = app;
