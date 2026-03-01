/**
 * Firebase Storage Helper Utilities (Server-side only)
 *
 * Provides structured image upload, download, and deletion for listing images.
 * Uses Firebase Admin SDK (@google-cloud/storage) — bypasses security rules.
 * Application-layer validation enforces content-type and size limits.
 *
 * Path convention: /{userId}/{platform}/{listingId}/{imageIndex}.{ext}
 */

import { adminStorage } from './admin';
import { ValidationError, ConfigurationError, ExternalServiceError } from '@/lib/errors';
import { logger } from '@/lib/logger';

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Magic bytes for image format validation
const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF header
  'image/gif': [0x47, 0x49, 0x46],
};

export type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

export interface UploadResult {
  storageUrl: string;
  storagePath: string;
  fileSize: number;
  contentType: string;
}

export interface UploadFromUrlResult extends UploadResult {
  originalUrl: string;
}

/**
 * Get the initialized Storage bucket reference.
 * Throws if the storage bucket is not configured.
 */
export function getStorageBucket() {
  if (!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
    throw new ConfigurationError(
      'Firebase Storage bucket not configured. Set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET environment variable.'
    );
  }
  return adminStorage.bucket();
}

/**
 * Build a structured storage path for a listing image.
 */
export function buildStoragePath(
  userId: string,
  platform: string,
  listingId: string,
  imageIndex: number,
  ext: string
): string {
  return `${userId}/${platform}/${listingId}/${imageIndex}.${ext}`;
}

/**
 * Validate that the content type is an allowed image type.
 */
function validateContentType(contentType: string): asserts contentType is AllowedContentType {
  if (!ALLOWED_CONTENT_TYPES.includes(contentType as AllowedContentType)) {
    throw new ValidationError(`Invalid image content type: ${contentType}. Allowed: ${ALLOWED_CONTENT_TYPES.join(', ')}`);
  }
}

/**
 * Validate that the file size is within the allowed limit.
 */
function validateFileSize(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new ValidationError(`Image exceeds 5MB limit (${(size / 1024 / 1024).toFixed(2)}MB)`);
  }
  if (size === 0) {
    throw new ValidationError('Image file is empty');
  }
}

/**
 * Validate that the file's magic bytes match the declared content type.
 */
function validateMagicBytes(data: Buffer, contentType: string): void {
  const expected = MAGIC_BYTES[contentType];
  if (!expected) return;

  if (data.length < expected.length) {
    throw new ValidationError('Image file is too small to be valid');
  }

  const matches = expected.every((byte, i) => data[i] === byte);
  if (!matches) {
    throw new ValidationError(`Image content does not match declared type ${contentType}`);
  }
}

/**
 * Upload an image buffer to Firebase Storage.
 *
 * @param data - Image data as a Buffer
 * @param storagePath - Structured path (use buildStoragePath)
 * @param contentType - MIME type (must be image/*)
 * @returns Upload result with public URL, path, and file size
 */
export async function uploadImage(
  data: Buffer,
  storagePath: string,
  contentType: string
): Promise<UploadResult> {
  validateContentType(contentType);
  validateFileSize(data.length);
  validateMagicBytes(data, contentType);

  const bucket = getStorageBucket();
  const file = bucket.file(storagePath);

  await file.save(data, {
    metadata: { contentType },
    public: true,
  });

  const storageUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

  return { storageUrl, storagePath, fileSize: data.length, contentType };
}

/**
 * Download an image from a URL and upload it to Firebase Storage.
 *
 * @param sourceUrl - URL to download the image from
 * @param storagePath - Structured path (use buildStoragePath)
 * @returns Upload result with original URL, public URL, path, size, and content type
 */
export async function uploadImageFromUrl(
  sourceUrl: string,
  storagePath: string
): Promise<UploadFromUrlResult> {
  let response: Response;
  try {
    response = await fetch(sourceUrl);
  } catch (error: unknown) {
    throw new ExternalServiceError(
      'Image Download',
      `Network error downloading image from ${sourceUrl}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!response.ok) {
    throw new ExternalServiceError(
      'Image Download',
      `Failed to download image from ${sourceUrl}: ${response.status} ${response.statusText}`
    );
  }

  const contentType = response.headers.get('content-type')?.split(';')[0] || 'application/octet-stream';
  validateContentType(contentType);

  const arrayBuffer = await response.arrayBuffer();
  const data = Buffer.from(arrayBuffer);

  validateFileSize(data.length);
  validateMagicBytes(data, contentType);

  const bucket = getStorageBucket();
  const file = bucket.file(storagePath);

  await file.save(data, {
    metadata: { contentType },
    public: true,
  });

  const storageUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

  return {
    storageUrl,
    storagePath,
    fileSize: data.length,
    contentType,
    originalUrl: sourceUrl,
  };
}

/**
 * Generate the public download URL for a stored file.
 */
export function getPublicUrl(storagePath: string): string {
  const bucket = getStorageBucket();
  return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

/**
 * Check if a GCP Storage error is a "not found" error.
 */
function isNotFoundError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('No such object') ||
      (error as unknown as Record<string, unknown>).code === 404
    );
  }
  return false;
}

/**
 * Delete a single file from Firebase Storage.
 *
 * @param storagePath - Path of the file to delete
 * @param options.ignoreNotFound - If true, silently ignore 404 errors
 */
export async function deleteImage(
  storagePath: string,
  options?: { ignoreNotFound?: boolean }
): Promise<void> {
  const bucket = getStorageBucket();
  const file = bucket.file(storagePath);
  try {
    await file.delete();
  } catch (error: unknown) {
    if (options?.ignoreNotFound && isNotFoundError(error)) {
      return;
    }
    throw new ExternalServiceError(
      'Firebase Storage',
      `Failed to delete image at ${storagePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Delete all images for a specific listing.
 * Uses Promise.allSettled to ensure all deletions are attempted even if some fail.
 */
export async function deleteListingImages(
  userId: string,
  platform: string,
  listingId: string
): Promise<{ deleted: number; failed: number }> {
  const bucket = getStorageBucket();
  const prefix = `${userId}/${platform}/${listingId}/`;
  const [files] = await bucket.getFiles({ prefix });

  if (files.length === 0) return { deleted: 0, failed: 0 };

  const results = await Promise.allSettled(files.map((file) => file.delete()));
  const failed = results.filter((r) => r.status === 'rejected').length;

  if (failed > 0) {
    logger.error(
      `Failed to delete ${failed}/${files.length} images for listing ${listingId}`,
      { userId, platform, listingId, deleted: files.length - failed, failed }
    );
  }

  return { deleted: files.length - failed, failed };
}
