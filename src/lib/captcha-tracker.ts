/**
 * Failed Login Attempt Tracker
 * Tracks failed login attempts to trigger CAPTCHA after threshold
 */

interface FailedAttempt {
  count: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
}

// In-memory store (in production, use Redis or database)
const failedAttempts = new Map<string, FailedAttempt>();

const MAX_FAILED_ATTEMPTS = 3;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Record a failed login attempt
 * @param identifier - Email or IP address
 * @returns Number of failed attempts
 */
export function recordFailedAttempt(identifier: string): number {
  const now = Date.now();
  const normalizedId = identifier.toLowerCase();
  const existing = failedAttempts.get(normalizedId);

  if (existing) {
    // Check if attempts are within the time window
    if (now - existing.firstAttemptAt > ATTEMPT_WINDOW_MS) {
      // Reset if window expired
      failedAttempts.set(normalizedId, {
        count: 1,
        firstAttemptAt: now,
        lastAttemptAt: now,
      });
      return 1;
    } else {
      // Increment count
      const updated = {
        ...existing,
        count: existing.count + 1,
        lastAttemptAt: now,
      };
      failedAttempts.set(normalizedId, updated);
      return updated.count;
    }
  } else {
    // First failed attempt
    failedAttempts.set(normalizedId, {
      count: 1,
      firstAttemptAt: now,
      lastAttemptAt: now,
    });
    return 1;
  }
}

/**
 * Check if CAPTCHA is required based on failed attempts
 * @param identifier - Email or IP address
 * @returns true if CAPTCHA should be shown
 */
export function requiresCaptcha(identifier: string): boolean {
  const normalizedId = identifier.toLowerCase();
  const attempt = failedAttempts.get(normalizedId);
  if (!attempt) return false;

  const now = Date.now();
  
  // Reset if window expired
  if (now - attempt.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    failedAttempts.delete(normalizedId);
    return false;
  }

  return attempt.count >= MAX_FAILED_ATTEMPTS;
}

/**
 * Clear failed attempts for an identifier (after successful login)
 * @param identifier - Email or IP address
 */
export function clearFailedAttempts(identifier: string): void {
  failedAttempts.delete(identifier.toLowerCase());
}

/**
 * Get current failed attempt count
 * @param identifier - Email or IP address
 * @returns Number of failed attempts or 0
 */
export function getFailedAttemptCount(identifier: string): number {
  const normalizedId = identifier.toLowerCase();
  const attempt = failedAttempts.get(normalizedId);
  if (!attempt) return 0;

  const now = Date.now();
  
  // Check if expired
  if (now - attempt.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    failedAttempts.delete(normalizedId);
    return 0;
  }

  return attempt.count;
}

/**
 * Verify hCaptcha token with hCaptcha API
 * @param token - hCaptcha response token
 * @returns true if valid
 */
export async function verifyHCaptcha(token: string): Promise<boolean> {
  const secretKey = process.env.HCAPTCHA_SECRET_KEY;
  
  if (!secretKey) {
    console.error('HCAPTCHA_SECRET_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `response=${token}&secret=${secretKey}`,
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('hCaptcha verification failed:', error);
    return false;
  }
}
