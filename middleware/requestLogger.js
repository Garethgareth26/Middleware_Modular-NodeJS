/**
 * ============================================================
 * MIDDLEWARE: requestLogger.js
 * ============================================================
 * Fungsi   : Mencatat seluruh aktivitas HTTP request dan response
 *            sebagai audit trail sistem keamanan.
 *            Setiap entri log memuat: timestamp, method, URL,
 *            IP address, user identity, status kode, dan durasi.
 * Posisi   : Dipasang PALING AWAL di server.js sebelum middleware
 *            lainnya agar semua request — termasuk yang ditolak —
 *            tercatat dalam log.
 *
 * Cara pakai di server.js:
 *   const { requestLogger } = require('./middleware/requestLogger');
 *   app.use(requestLogger); // <-- harus paling atas
 *
 * Format log:
 *   INCOMING : [timestamp] → INCOMING METHOD /url from IP: x.x.x.x
 *   RESPONSE : [timestamp] ← RESPONSE METHOD /url STATUS | user: x | Xms
 *   SECURITY : [SECURITY LOG] STATUS on METHOD /url — IP: x — user: x
 *   RATELIMIT: [RATE LIMIT] Login blocked — IP: x
 *
 * Catatan   : Untuk produksi, ganti console.log dengan library
 *             logging yang persisten seperti Winston atau Pino.
 * ============================================================
 */

const requestLogger = (req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  // Catat request masuk
  console.log(`[${timestamp}] \x1b[32m→ INCOMING\x1b[0m ${req.method} ${req.originalUrl} from IP: ${req.ip}`);

  // Catat response setelah selesai dikirim
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const user = req.user ? req.user.username || req.user.userId : 'anonymous';

    // Tentukan warna status untuk terminal
    const statusColor =
      status >= 500 ? '\x1b[31m' :  // merah
      status >= 400 ? '\x1b[33m' :  // kuning
      status >= 300 ? '\x1b[36m' :  // cyan
                      '\x1b[32m';   // hijau

    console.log(
      `[${new Date().toISOString()}] \x1b[34m← RESPONSE\x1b[0m ${req.method} ${req.originalUrl} ` +
      `${statusColor}${status}\x1b[0m | user: ${user} | ${duration}ms`
    );

    // Tandai sebagai security log jika status 4xx atau 5xx
    if (status >= 400) {
      console.log(
        `\x1b[31m[SECURITY LOG]\x1b[0m ${status} on ${req.method} ${req.originalUrl}` +
        ` — IP: ${req.ip} — user: ${user} — ${new Date().toISOString()}`
      );
    }
  });

  next();
};

module.exports = { requestLogger };
