/**
 * Unit tests for crypto.ts
 * Author: Stephen Boyett
 * Company: Axovia AI
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('Crypto Module', () => {
  describe('Encryption/Decryption', () => {
    it('should encrypt data with AES-256', async () => {
      const { encrypt } = await import('../../../src/lib/crypto');
      
      const plaintext = 'sensitive_data';
      const key = 'encryption_key_32_bytes_long!!';
      
      const encrypted = await encrypt(plaintext, key);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(typeof encrypted).toBe('string');
    });

    it('should decrypt encrypted data correctly', async () => {
      const { encrypt, decrypt } = await import('../../../src/lib/crypto');
      
      const plaintext = 'sensitive_data';
      const key = 'encryption_key_32_bytes_long!!';
      
      const encrypted = await encrypt(plaintext, key);
      const decrypted = await decrypt(encrypted, key);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should fail to decrypt with wrong key', async () => {
      const { encrypt, decrypt } = await import('../../../src/lib/crypto');
      
      const plaintext = 'sensitive_data';
      const key1 = 'encryption_key_32_bytes_long!!';
      const key2 = 'different_key_32_bytes_long!!';
      
      const encrypted = await encrypt(plaintext, key1);
      
      await expect(decrypt(encrypted, key2)).rejects.toThrow();
    });

    it('should handle empty strings', async () => {
      const { encrypt, decrypt } = await import('../../../src/lib/crypto');
      
      const plaintext = '';
      const key = 'encryption_key_32_bytes_long!!';
      
      const encrypted = await encrypt(plaintext, key);
      const decrypted = await decrypt(encrypted, key);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle large data', async () => {
      const { encrypt, decrypt } = await import('../../../src/lib/crypto');
      
      const plaintext = 'x'.repeat(10000); // 10KB
      const key = 'encryption_key_32_bytes_long!!';
      
      const encrypted = await encrypt(plaintext, key);
      const decrypted = await decrypt(encrypted, key);
      
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Hashing', () => {
    it('should generate SHA-256 hash', async () => {
      const { hash } = await import('../../../src/lib/crypto');
      
      const data = 'test_data';
      const hashed = await hash(data, 'sha256');
      
      expect(hashed).toBeDefined();
      expect(typeof hashed).toBe('string');
      expect(hashed).toHaveLength(64); // SHA-256 = 64 hex chars
    });

    it('should generate consistent hashes for same input', async () => {
      const { hash } = await import('../../../src/lib/crypto');
      
      const data = 'test_data';
      const hash1 = await hash(data, 'sha256');
      const hash2 = await hash(data, 'sha256');
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', async () => {
      const { hash } = await import('../../../src/lib/crypto');
      
      const hash1 = await hash('data1', 'sha256');
      const hash2 = await hash('data2', 'sha256');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should support multiple hash algorithms', async () => {
      const { hash } = await import('../../../src/lib/crypto');
      
      const data = 'test_data';
      
      const sha256 = await hash(data, 'sha256');
      const sha512 = await hash(data, 'sha512');
      const md5 = await hash(data, 'md5');
      
      expect(sha256).toHaveLength(64);
      expect(sha512).toHaveLength(128);
      expect(md5).toHaveLength(32);
    });
  });

  describe('Random Generation', () => {
    it('should generate random bytes', async () => {
      const { randomBytes } = await import('../../../src/lib/crypto');
      
      const bytes = await randomBytes(32);
      
      expect(bytes).toBeDefined();
      expect(bytes.length).toBe(32);
    });

    it('should generate unique random values', async () => {
      const { randomBytes } = await import('../../../src/lib/crypto');
      
      const bytes1 = await randomBytes(32);
      const bytes2 = await randomBytes(32);
      
      expect(bytes1).not.toEqual(bytes2);
    });

    it('should generate random string', async () => {
      const { randomString } = await import('../../../src/lib/crypto');
      
      const str = await randomString(16);
      
      expect(str).toBeDefined();
      expect(typeof str).toBe('string');
      expect(str.length).toBe(16);
    });

    it('should generate URL-safe random string', async () => {
      const { randomString } = await import('../../../src/lib/crypto');
      
      const str = await randomString(32);
      
      expect(str).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe('Key Derivation', () => {
    it('should derive key from password using PBKDF2', async () => {
      const { deriveKey } = await import('../../../src/lib/crypto');
      
      const password = 'user_password';
      const salt = 'random_salt';
      
      const key = await deriveKey(password, salt, 10000);
      
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
    });

    it('should generate consistent keys with same inputs', async () => {
      const { deriveKey } = await import('../../../src/lib/crypto');
      
      const password = 'user_password';
      const salt = 'random_salt';
      
      const key1 = await deriveKey(password, salt, 10000);
      const key2 = await deriveKey(password, salt, 10000);
      
      expect(key1).toBe(key2);
    });

    it('should generate different keys with different salts', async () => {
      const { deriveKey } = await import('../../../src/lib/crypto');
      
      const password = 'user_password';
      
      const key1 = await deriveKey(password, 'salt1', 10000);
      const key2 = await deriveKey(password, 'salt2', 10000);
      
      expect(key1).not.toBe(key2);
    });

    it('should increase difficulty with more iterations', async () => {
      const { deriveKey } = await import('../../../src/lib/crypto');
      
      const password = 'user_password';
      const salt = 'random_salt';
      
      const start1 = Date.now();
      await deriveKey(password, salt, 1000);
      const time1 = Date.now() - start1;
      
      const start2 = Date.now();
      await deriveKey(password, salt, 10000);
      const time2 = Date.now() - start2;
      
      expect(time2).toBeGreaterThan(time1);
    });
  });

  describe('Digital Signatures', () => {
    it('should sign data with private key', async () => {
      const { sign } = await import('../../../src/lib/crypto');
      
      const data = 'important_message';
      const privateKey = 'mock_private_key';
      
      const signature = await sign(data, privateKey);
      
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
    });

    it('should verify signature with public key', async () => {
      const { sign, verify } = await import('../../../src/lib/crypto');
      
      const data = 'important_message';
      const privateKey = 'mock_private_key';
      const publicKey = 'mock_public_key';
      
      const signature = await sign(data, privateKey);
      const isValid = await verify(data, signature, publicKey);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', async () => {
      const { verify } = await import('../../../src/lib/crypto');
      
      const data = 'important_message';
      const signature = 'invalid_signature';
      const publicKey = 'mock_public_key';
      
      const isValid = await verify(data, signature, publicKey);
      
      expect(isValid).toBe(false);
    });

    it('should detect tampered data', async () => {
      const { sign, verify } = await import('../../../src/lib/crypto');
      
      const data = 'important_message';
      const tamperedData = 'tampered_message';
      const privateKey = 'mock_private_key';
      const publicKey = 'mock_public_key';
      
      const signature = await sign(data, privateKey);
      const isValid = await verify(tamperedData, signature, publicKey);
      
      expect(isValid).toBe(false);
    });
  });

  describe('Constant-Time Comparison', () => {
    it('should compare strings in constant time', async () => {
      const { timingSafeEqual } = await import('../../../src/lib/crypto');
      
      const str1 = 'secret_value';
      const str2 = 'secret_value';
      
      const isEqual = await timingSafeEqual(str1, str2);
      
      expect(isEqual).toBe(true);
    });

    it('should detect different strings', async () => {
      const { timingSafeEqual } = await import('../../../src/lib/crypto');
      
      const str1 = 'secret_value';
      const str2 = 'different_value';
      
      const isEqual = await timingSafeEqual(str1, str2);
      
      expect(isEqual).toBe(false);
    });

    it('should prevent timing attacks', async () => {
      const { timingSafeEqual } = await import('../../../src/lib/crypto');
      
      const correct = 'secret';
      const wrong1 = 'secxet';
      const wrong2 = 'xxxxxx';
      
      // Time both comparisons - should take similar time
      const start1 = Date.now();
      await timingSafeEqual(correct, wrong1);
      const time1 = Date.now() - start1;
      
      const start2 = Date.now();
      await timingSafeEqual(correct, wrong2);
      const time2 = Date.now() - start2;
      
      // Timing difference should be minimal (within 5ms tolerance)
      expect(Math.abs(time1 - time2)).toBeLessThan(5);
    });
  });
});
