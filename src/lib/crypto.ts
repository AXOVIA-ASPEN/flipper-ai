/**
 * Encryption utilities for storing sensitive data like API keys
 * Uses AES-256-GCM for authenticated encryption
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get the encryption secret from environment variables
 * Falls back to a development-only default (NOT for production use)
 */
function getEncryptionSecret(): string {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_SECRET environment variable is required in production');
    }
    // Development fallback - DO NOT use in production
    return 'dev-only-encryption-secret-do-not-use-in-production';
  }
  return secret;
}

/**
 * Derive a 256-bit encryption key from the secret using scrypt
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LENGTH);
}

/**
 * Encrypt a plaintext string
 * Returns a base64-encoded string containing salt, IV, auth tag, and ciphertext
 */
export function encrypt(plaintext: string): string {
  const secret = getEncryptionSecret();
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(secret, salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine: salt (16) + iv (16) + authTag (16) + ciphertext
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypt a base64-encoded encrypted string
 * Returns the original plaintext
 */
export function decrypt(encryptedBase64: string): string {
  const secret = getEncryptionSecret();
  const combined = Buffer.from(encryptedBase64, 'base64');

  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  );
  const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  const key = deriveKey(secret, salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Mask an API key for display, showing only the last 4 characters
 * e.g., "sk-abc123xyz789" -> "••••••••••••789"
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 4) {
    return '••••';
  }
  const visiblePart = apiKey.slice(-4);
  const maskedLength = apiKey.length - 4;
  return '•'.repeat(Math.min(maskedLength, 12)) + visiblePart;
}

/**
 * Check if a string looks like an encrypted value (base64 with expected length)
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  try {
    const decoded = Buffer.from(value, 'base64');
    // Minimum length: salt (16) + iv (16) + authTag (16) + at least 1 byte ciphertext
    return decoded.length >= SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH + 1;
  } catch {
    return false;
  }
}
