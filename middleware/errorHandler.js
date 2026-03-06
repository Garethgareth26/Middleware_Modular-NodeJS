/**
 * ============================================================
 * MIDDLEWARE: errorHandler.js
 * ============================================================
 * Fungsi   : Menangani seluruh error yang terjadi di aplikasi
 *            secara terpusat dengan format respons yang konsisten.
 *            Mencegah kebocoran stack trace ke client.
 * Posisi   : Dipasang PALING AKHIR di server.js, setelah semua
 *            route dan middleware lainnya didefinisikan.
 *
 * Cara pakai di server.js:
 *   const { errorHandler } = require('./middleware/errorHandler');
 *   // ... semua route ...
 *   app.use(errorHandler); // <-- harus paling bawah
 *
 * Cara melempar error dari controller/middleware:
 *   next(error);                    // error apapun
 *   const err = new Error('msg');
 *   err.statusCode = 404;
 *   next(err);                      // error dengan status custom
 * ============================================================
 */

const errorHandler = (err, req, res, next) => {
  // Log error di server (tidak dikirim ke client)
  console.error(`[ERROR] ${new Date().toISOString()} | ${err.name}: ${err.message}`);

  // ── JWT Errors ────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    return res.status(403).json({
      success: false,
      error: 'Invalid token',
      message: 'Token is not valid or has been tampered with',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(403).json({
      success: false,
      error: 'Token expired',
      message: 'Token has expired, please login again',
    });
  }

  // ── Sequelize Errors (ORM MySQL/PostgreSQL) ───────────────
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: err.errors.map((e) => e.message),
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      error: 'Duplicate entry',
      message: err.errors.map((e) => e.message),
    });
  }

  // ── Mongoose Errors (ORM MongoDB) ────────────────────────
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: Object.values(err.errors).map((e) => e.message),
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID format',
      message: `Invalid value for field: ${err.path}`,
    });
  }

  // ── Custom Error dengan statusCode ───────────────────────
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.name || 'Error',
      message: err.message,
    });
  }

  // ── Default: Internal Server Error ───────────────────────
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: 'Something went wrong on the server',
  });
};

module.exports = { errorHandler };
