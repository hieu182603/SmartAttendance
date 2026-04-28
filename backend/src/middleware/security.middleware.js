import rateLimit from "express-rate-limit";

const limitExceededResponse = {
  message: "Too many requests, please try again later.",
  code: "RATE_LIMIT_EXCEEDED",
};

const buildLimiter = ({ windowMs, max }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    // Keep responses consistent and easy to parse on frontend/monitoring.
    handler: (_req, res) => {
      res.status(429).json(limitExceededResponse);
    },
  });

// Global limiter: protects all routes from basic burst traffic/DoS.
export const globalRateLimiter = buildLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 150,
});

// Auth limiter: stricter to reduce brute-force and OTP abuse.
export const authRateLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
});


// Attendance limiter: protect frequent scan/check-in flood attempts.
export const attendanceRateLimiter = buildLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 120,
});

// Trial registration limiter: stricter anti-spam for account creation.
export const trialRegisterRateLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 8,
});

// OTP limiter: prevent brute-force and resend flooding.
export const otpRateLimiter = buildLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
});

// Per-user check-in limiter (kehoach.md Phase 3.4).
// Keyed by userId (from authMiddleware) so one misbehaving user can't burn
// through the shared attendance IP bucket. Also catches a stuck client
// auto-capturing in a loop.
export const checkinRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  // Primary key is userId (set by authMiddleware), IP is only a fallback.
  // Disable the IPv6 key-generator validation since we rarely use req.ip.
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    // req.user is populated by authMiddleware. Fall back to IP if the
    // limiter is ever mounted before auth (defense in depth).
    return req.user?.userId
      ? `uid:${req.user.userId}`
      : `ip:${req.ip}`;
  },
  handler: (_req, res) => {
    res.status(429).json({
      message: "Bạn đang thao tác chấm công quá nhanh. Vui lòng thử lại sau ít phút.",
      code: "CHECKIN_RATE_LIMIT",
    });
  },
});
