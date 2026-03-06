/**
 * ============================================================
 * MIDDLEWARE: rateLimiter.js
 * ============================================================
 * Fungsi   : Membatasi jumlah request per IP address dalam
 *            jendela waktu tertentu untuk mencegah serangan
 *            brute force dan Denial of Service (DoS).
 * Posisi   : globalLimiter dipasang PALING AWAL di server.js.
 *            loginLimiter / authLimiter dipasang pada route
 *            autentikasi yang spesifik.
 *
 * Instalasi:
 *   npm install express-rate-limit
 *
 * Cara pakai di server.js (global):
 *   const { globalLimiter } = require('./middleware/rateLimiter');
 *   app.use(globalLimiter);
 *
 * Cara pakai di route (spesifik):
 *   const { loginLimiter } = require('../middleware/rateLimiter');
 *   router.post('/login', loginLimiter, controller.login);
 *
 * Konfigurasi (sesuaikan dengan kebutuhan sistem):
 *   loginLimiter  → 5 req / 15 menit  (endpoint login)
 *   authLimiter   → 10 req / 15 menit (endpoint register, otp)
 *   globalLimiter → 100 req / 15 menit (semua endpoint)
 * ============================================================
 */

const rateLimit = require('express-rate-limit');

// ── 1. Login Limiter ──────────────────────────────────────────
// Melindungi endpoint login dari serangan brute force.
// Sesuaikan windowMs dan max sesuai kebijakan keamanan sistem.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5,                    // Maksimal 5 percobaan per IP
  standardHeaders: true,     // Kirim info limit di header RateLimit-*
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts',
    message: 'You have exceeded the login attempt limit. Please try again after 15 minutes.',
  },
  handler: (req, res, next, options) => {
    console.log(`[RATE LIMIT] Login blocked — IP: ${req.ip} — ${new Date().toISOString()}`);
    res.status(options.statusCode).json(options.message);
  },
});

// ── 2. Auth Limiter ───────────────────────────────────────────
// Melindungi endpoint registrasi dan OTP dari penyalahgunaan.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10,                   // Maksimal 10 request per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
  handler: (req, res, next, options) => {
    console.log(`[RATE LIMIT] Auth blocked — IP: ${req.ip} — ${new Date().toISOString()}`);
    res.status(options.statusCode).json(options.message);
  },
});

// ── 3. Global Limiter ─────────────────────────────────────────
// Melindungi seluruh API dari serangan DoS tingkat aplikasi.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100,                  // Maksimal 100 request per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Too many requests from this IP. Please try again later.',
  },
  handler: (req, res, next, options) => {
    console.log(`[RATE LIMIT] Global blocked — IP: ${req.ip} — ${new Date().toISOString()}`);
    res.status(options.statusCode).json(options.message);
  },
});

module.exports = { loginLimiter, authLimiter, globalLimiter };
