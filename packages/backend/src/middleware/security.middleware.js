import rateLimit from "express-rate-limit";

const limitExceededResponse = {
  message: "Too many requests, please try again later.",
  code: "RATE_LIMIT_EXCEEDED",
};

const loginLimitExceededResponse = {
  message: "Đăng nhập thất bại quá nhiều lần. Vui lòng thử lại sau 15 phút.",
  code: "RATE_LIMIT_EXCEEDED",
};

const noopLimiter = (_req, _res, next) => next();

const buildLimiter = ({ windowMs, max }) => {
  if (process.env.NODE_ENV === "test") return noopLimiter;
  // In development, allow 10× the limit so E2E test suites don't hit rate caps.
  const effectiveMax = process.env.NODE_ENV === "development" ? max * 10 : max;
  return rateLimit({
    windowMs,
    max: effectiveMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json(limitExceededResponse);
    },
  });
};

// Global limiter: protects all routes from basic burst traffic/DoS.
export const globalRateLimiter = buildLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 150,
});

// Auth limiter: stricter to reduce brute-force and OTP abuse.
export const authRateLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 40,
});

// Login limiter: chỉ đếm lần đăng nhập thất bại (401/403/5xx), không đếm 400 validation.
const loginRateLimitMax =
  process.env.NODE_ENV === "development"
    ? 100
    : Number(process.env.LOGIN_RATE_LIMIT_MAX || 30);

export const loginRateLimiter =
  process.env.NODE_ENV === "test"
    ? noopLimiter
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: loginRateLimitMax,
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true,
        skip: (_req, res) => res.statusCode === 400,
        // Primary key is email; IP is only a fallback for unauthenticated/bodyless requests.
        validate: { keyGeneratorIpFallback: false },
        keyGenerator: (req) => {
          const email =
            typeof req.body?.email === "string"
              ? req.body.email.trim().toLowerCase()
              : "";
          return email ? `login:${email}` : `login:ip:${req.ip}`;
        },
        handler: (_req, res) => {
          res.status(429).json(loginLimitExceededResponse);
        },
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
  max: 40,
});

// Refresh token limiter: prevent token farming / refresh flooding.
export const refreshRateLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
});

// Per-user check-in limiter. Keyed by userId; IP is only a fallback.
export const checkinRateLimiter = process.env.NODE_ENV === "test" ? noopLimiter : rateLimit({
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
