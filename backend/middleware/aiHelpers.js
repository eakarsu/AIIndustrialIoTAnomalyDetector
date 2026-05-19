// In-memory rate limiter: 20 AI calls per hour, keyed by user id or IP
const rateLimitMap = new Map();

const AI_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const AI_MAX_CALLS = 20;

function aiRateLimiter(req, res, next) {
  const key = (req.user && req.user.id) ? String(req.user.id) : (req.ip || 'unknown');
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now - entry.windowStart > AI_WINDOW_MS) {
    rateLimitMap.set(key, { windowStart: now, count: 1 });
    return next();
  }

  if (entry.count >= AI_MAX_CALLS) {
    return res.status(429).json({ error: 'AI rate limit exceeded. Maximum 20 requests per hour.' });
  }

  entry.count++;
  next();
}

async function callWithRetry(fn, maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === maxAttempts - 1) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

module.exports = { aiRateLimiter, callWithRetry };
