# 🔐 Middleware Modular — Node.js RESTful API

> Kumpulan middleware modular siap pakai untuk autentikasi dan otorisasi pada RESTful API berbasis Node.js dan Express.js.  
> Dikembangkan sebagai luaran penelitian skripsi dengan studi kasus aplikasi **Insightku** — Bangkit Academy.

---

## 📋 Daftar Isi

- [Tentang Proyek](#-tentang-proyek)
- [Middleware yang Tersedia](#-middleware-yang-tersedia)
- [Arsitektur](#-arsitektur)
- [Persyaratan](#-persyaratan)
- [Instalasi](#-instalasi)
- [Konfigurasi](#-konfigurasi)
- [Cara Penggunaan](#-cara-penggunaan)
- [Referensi API](#-referensi-api)
- [Respons Error](#-respons-error)
- [Pemetaan OWASP](#-pemetaan-owasp-api-security-top-10)
- [Lisensi](#-lisensi)

---

## 🧩 Tentang Proyek

Repository ini berisi **6 middleware modular** yang dapat digunakan sebagai fondasi sistem keamanan pada RESTful API Node.js. Setiap middleware memiliki **satu tanggung jawab tunggal** (Single Responsibility Principle) dan dapat dipasang, dilepas, atau dikombinasikan secara independen tanpa mempengaruhi komponen lain.

### Masalah yang Diselesaikan

| Masalah Umum | Solusi |
|---|---|
| Token JWT tidak diverifikasi dengan benar | `authenticateToken` |
| Semua user authenticated bisa akses semua endpoint | `checkRole` |
| Endpoint login rentan brute force | `rateLimiter` |
| Validasi input tersebar di dalam controller | `validateRequest` |
| Format error tidak konsisten antar endpoint | `errorHandler` |
| Tidak ada jejak aktivitas request | `requestLogger` |

---

## 📦 Middleware yang Tersedia

| Middleware | Fungsi | Posisi |
|---|---|---|
| `requestLogger` | Audit trail semua HTTP request & response | Paling awal |
| `globalLimiter` | Proteksi DoS — batasi request per IP | Setelah logger |
| `authenticateToken` | Verifikasi JWT Bearer token | Sebelum checkRole |
| `checkRole` | RBAC — kontrol akses berdasarkan role | Setelah auth |
| `validateRequest` | Validasi input body request | Sebelum controller |
| `errorHandler` | Penanganan error terpusat | Paling akhir |

---

## 🏗 Arsitektur

```
Client Request
      │
      ▼
┌─────────────────┐
│  requestLogger  │  ← Catat semua request
└────────┬────────┘
         │
┌────────▼────────┐
│  globalLimiter  │  ← Tolak jika over limit → 429
└────────┬────────┘
         │
┌────────▼──────────┐
│ authenticateToken │  ← Tolak jika token invalid → 401/403
└────────┬──────────┘
         │
┌────────▼────────┐
│   checkRole     │  ← Tolak jika role tidak sesuai → 403
└────────┬────────┘
         │
┌────────▼──────────┐
│ validateRequest   │  ← Tolak jika input tidak valid → 400
└────────┬──────────┘
         │
┌────────▼────────┐
│   Controller    │  ← Proses logika bisnis
└────────┬────────┘
         │
┌────────▼────────┐
│  errorHandler   │  ← Tangkap semua error → format konsisten
└────────┬────────┘
         │
      Response
```

---

## ✅ Persyaratan

- Node.js >= 14.x
- Express.js >= 4.x
- npm atau yarn

---

## 🚀 Instalasi

**1. Clone repository**
```bash
git clone https://github.com/username/middleware-modular-nodejs.git
cd middleware-modular-nodejs
```

**2. Install dependensi**
```bash
npm install
```

**3. Buat file `.env`**
```bash
cp .env.example .env
```

**4. Isi nilai pada `.env`**
```env
PORT=3000
JWT_SECRET=your_very_strong_secret_key
```

**5. Jalankan server contoh**
```bash
npm run dev
```

---

## ⚙️ Konfigurasi

Salin `.env.example` menjadi `.env` dan sesuaikan nilainya:

```env
PORT=3000
NODE_ENV=development

JWT_SECRET=your_very_strong_jwt_secret_key
JWT_EXPIRES_IN=1h

DB_HOST=localhost
DB_NAME=your_db
DB_USER=root
DB_PASSWORD=your_password
```

> ⚠️ **Jangan pernah commit file `.env` ke repository.**  
> Pastikan `.env` sudah masuk ke `.gitignore`.

---

## 📖 Cara Penggunaan

### Integrasi di `server.js`

```javascript
require('dotenv').config();
const express = require('express');
const app = express();

// Import semua middleware
const { requestLogger }     = require('./middleware/requestLogger');
const { globalLimiter,
        loginLimiter }      = require('./middleware/rateLimiter');
const { authenticateToken } = require('./middleware/authenticateToken');
const { checkRole }         = require('./middleware/checkRole');
const { errorHandler }      = require('./middleware/errorHandler');
const { validateLogin,
        validateRegister,
        validate }          = require('./middleware/validateRequest');

app.use(express.json());

// Urutan pemasangan global middleware (PENTING)
app.use(requestLogger);   // 1. Logger — paling atas
app.use(globalLimiter);   // 2. Rate limiter global

// Route publik
app.post('/api/auth/login',    loginLimiter, validateLogin, validate, loginController);
app.post('/api/auth/register', validateRegister, validate, registerController);

// Route terproteksi
app.get('/api/profile',        authenticateToken, profileController);
app.get('/api/dashboard',      authenticateToken, checkRole('user', 'admin'), dashboardController);

// Route khusus admin
app.get('/api/admin/users',    authenticateToken, checkRole('admin'), adminController);

// Error handler — harus paling bawah
app.use(errorHandler);

app.listen(3000);
```

---

## 📚 Referensi API

### `authenticateToken`

Memverifikasi JWT dari header `Authorization: Bearer <token>`.

```javascript
const { authenticateToken } = require('./middleware/authenticateToken');

// Pasang pada route terproteksi
router.get('/profile', authenticateToken, controller);
```

**Syarat JWT Payload:**
```json
{
  "userId": 1,
  "username": "johndoe",
  "role": "user"
}
```

| Kondisi | Status | Pesan |
|---|---|---|
| Tidak ada token | 401 | Access token required |
| Token tidak valid | 403 | Invalid or expired token |
| Token kadaluarsa | 403 | Invalid or expired token |
| Token valid | Lanjut ke next() | — |

---

### `checkRole(...roles)`

Membatasi akses endpoint berdasarkan role pengguna.  
Harus dipasang **setelah** `authenticateToken`.

```javascript
const { checkRole } = require('./middleware/checkRole');

// Hanya admin
router.get('/admin', authenticateToken, checkRole('admin'), controller);

// Admin dan moderator
router.get('/manage', authenticateToken, checkRole('admin', 'moderator'), controller);

// Semua role yang sudah login
router.get('/feed', authenticateToken, checkRole('user', 'admin'), controller);
```

| Kondisi | Status | Pesan |
|---|---|---|
| Role tidak sesuai | 403 | Forbidden: requires role [admin] |
| Role sesuai | Lanjut ke next() | — |

---

### `rateLimiter`

Tiga level pembatasan request:

```javascript
const { loginLimiter, authLimiter, globalLimiter } = require('./middleware/rateLimiter');

app.use(globalLimiter);                               // Global — 100 req/15 menit
app.post('/auth/login',    loginLimiter, controller); // Login — 5 req/15 menit
app.post('/auth/register', authLimiter, controller);  // Register — 10 req/15 menit
```

| Limiter | Batas | Window | Endpoint |
|---|---|---|---|
| `loginLimiter` | 5 req | 15 menit | POST /login |
| `authLimiter` | 10 req | 15 menit | POST /register, /verify-otp |
| `globalLimiter` | 100 req | 15 menit | Semua endpoint |

---

### `validateRequest`

Validasi input menggunakan `express-validator`.  
**Selalu sertakan `validate` setelah skema validasi.**

```javascript
const { validateLogin, validateRegister, validate } = require('./middleware/validateRequest');

router.post('/login',    validateLogin,    validate, controller);
router.post('/register', validateRegister, validate, controller);
```

**Menambah skema validasi baru:**
```javascript
// Di validateRequest.js
const validateCreatePost = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('content').trim().isLength({ min: 10 }).withMessage('Content too short'),
];

module.exports = { ..., validateCreatePost };
```

---

### `errorHandler`

Dipasang **satu kali** di paling bawah `server.js`.

```javascript
app.use(errorHandler); // setelah semua route
```

**Melempar error dari controller:**
```javascript
// Error sederhana
next(new Error('Something went wrong'));

// Error dengan status custom
const err = new Error('User not found');
err.statusCode = 404;
next(err);
```

---

### `requestLogger`

```javascript
app.use(requestLogger); // harus paling atas
```

**Contoh output di terminal:**
```
[2026-03-05T12:56:57.725Z] → INCOMING GET /api/dashboard from IP: ::1
[2026-03-05T12:56:57.732Z] ← RESPONSE GET /api/dashboard 200 | user: johndoe | 7ms

[2026-03-05T12:59:25.380Z] → INCOMING GET /api/admin/users from IP: ::1
[2026-03-05T12:59:25.383Z] ← RESPONSE GET /api/admin/users 403 | user: johndoe | 3ms
[SECURITY LOG] 403 on GET /api/admin/users — IP: ::1 — user: johndoe
```

---

## ⚠️ Respons Error

Seluruh respons error menggunakan format JSON yang konsisten:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable description"
}
```

**Respons validasi (400):**
```json
{
  "success": false,
  "errors": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "password", "message": "Password must be at least 8 characters" }
  ]
}
```

---

## 🛡 Pemetaan OWASP API Security Top 10

| Kode | Ancaman | Middleware |
|---|---|---|
| API1 | Broken Object Level Authorization | `checkRole` |
| API2 | Broken Authentication | `authenticateToken` + `rateLimiter` |
| API4 | Unrestricted Resource Consumption | `rateLimiter` |
| API5 | Broken Function Level Authorization | `checkRole` |
| API7 | Server Side Request Forgery | `validateRequest` |
| API8 | Security Misconfiguration | `errorHandler` |
| API9 | Improper Inventory Management | `requestLogger` |
| API10 | Unsafe Consumption of APIs | `validateRequest` + `errorHandler` |

---

## 📁 Struktur Proyek

```
middleware-modular-nodejs/
├── middleware/
│   ├── authenticateToken.js   ← Verifikasi JWT
│   ├── checkRole.js           ← Kontrol akses RBAC
│   ├── errorHandler.js        ← Penanganan error terpusat
│   ├── rateLimiter.js         ← Proteksi brute force & DoS
│   ├── validateRequest.js     ← Validasi input
│   └── requestLogger.js       ← Audit trail
├── examples/
│   └── server.example.js      ← Contoh implementasi lengkap
├── .env.example               ← Template environment variable
├── package.json
└── README.md
```

---

## 📄 Lisensi

MIT License — bebas digunakan, dimodifikasi, dan didistribusikan dengan menyertakan atribusi.

---

> Dikembangkan sebagai luaran penelitian skripsi  
> **"Implementasi Middleware Modular untuk Autentikasi dan Hak Akses pada RESTful API Node.js"**  
> Universitas Singaperbangsa Karawang
