/**
 * ============================================================
 * MIDDLEWARE: validateRequest.js
 * ============================================================
 * Fungsi   : Memvalidasi input request sebelum mencapai controller.
 *            Memisahkan logika validasi dari controller sesuai
 *            prinsip Separation of Concerns.
 * Posisi   : Dipasang pada route yang membutuhkan validasi input,
 *            SEBELUM controller dieksekusi.
 *
 * Instalasi:
 *   npm install express-validator
 *
 * Cara pakai di route:
 *   const { validateLogin, validate } = require('../middleware/validateRequest');
 *   router.post('/login', validateLogin, validate, controller.login);
 *
 * Cara menambah skema validasi baru:
 *   1. Buat fungsi validasi baru di bagian bawah file ini
 *   2. Tambahkan ke module.exports
 *   3. Gunakan di route yang sesuai
 *
 * Format respons error (400):
 *   {
 *     "success": false,
 *     "errors": [
 *       { "field": "email", "message": "Invalid email format" }
 *     ]
 *   }
 * ============================================================
 */

const { body, validationResult } = require('express-validator');

// ── Handler: Jalankan setelah skema validasi ─────────────────
// Selalu sertakan `validate` setelah skema validasi di route.
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

// ── Skema Validasi: Register / Sign Up ───────────────────────
const validateRegister = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .isAlphanumeric().withMessage('Username can only contain letters and numbers'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),

  body('confirmPassword')
    .notEmpty().withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

// ── Skema Validasi: Login ─────────────────────────────────────
const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

// ── Skema Validasi: Update Profile ───────────────────────────
const validateUpdateProfile = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .isAlphanumeric().withMessage('Username can only contain letters and numbers'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
];

// ── Skema Validasi: Change Password ──────────────────────────
const validateChangePassword = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),

  body('confirmNewPassword')
    .notEmpty().withMessage('Confirm new password is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('New passwords do not match');
      }
      return true;
    }),
];

// ── Skema Validasi: Generic Resource (contoh) ────────────────
// Gunakan pola ini sebagai template untuk resource lain
const validateCreateResource = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 3, max: 100 }).withMessage('Name must be 3-100 characters'),

  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isNumeric().withMessage('Amount must be a number')
    .custom((value) => {
      if (parseFloat(value) <= 0) throw new Error('Amount must be greater than 0');
      return true;
    }),
];

module.exports = {
  validate,
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
  validateCreateResource,
};
