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
