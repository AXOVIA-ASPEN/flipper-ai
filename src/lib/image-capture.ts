/**
 * Image Capture Service
 *
 * Orchestrates downloading listing images from external URLs and uploading
 * them to Firebase Storage. Called by scraper routes after a listing is saved.
 *
 * Design principles:
 * - Each image is independent: failures don't block other images or the listing save
 * - Uses Promise.allSettled() for parallel processing
 * - Dedup guard: hasExistingImages() prevents re-downloading for existing listings
 */

import { uploadImageFromUrl, buildStoragePath } from '@/lib/firebase/storage';
import prisma from '@/lib/db';

export interface ImageCaptureResult {
  captured: ListingImageData[];
  failed: { url: string; error: string }[];
}

export interface ListingImageData {
  originalUrl: string;
  storagePath: string;
  storageUrl: string;
  fileSize: number;
  contentType: string;
  imageIndex: number;
}

/**
 * Extract file extension from a URL pathname.
 * Defaults to 'jpg' for unrecognised or missing extensions.
 */
function getExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop()?.toLowerCase();
    if (ext && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      return ext === 'jpeg' ? 'jpg' : ext;
    }
  } catch {
    // Invalid URL — fall through to default
  }
  return 'jpg';
}

/**
 * Download and upload listing images to Firebase Storage in parallel.
 *
 * Each image is processed independently — a failure on one does not affect
 * the others (Promise.allSettled). Failures are collected in the `failed`
 * array and should be logged by the caller; they must NOT block the listing save.
 */
export async function captureListingImages(
  listingId: string,
  userId: string,
  platform: string,
  imageUrls: string[]
): Promise<ImageCaptureResult> {
  if (!imageUrls.length) {
    return { captured: [], failed: [] };
  }

  const results = await Promise.allSettled(
    imageUrls.map(async (url, index) => {
      const ext = getExtensionFromUrl(url);
      const storagePath = buildStoragePath(userId, platform, listingId, index, ext);
      const uploadResult = await uploadImageFromUrl(url, storagePath);
      return {
        originalUrl: uploadResult.originalUrl,
        storagePath: uploadResult.storagePath,
        storageUrl: uploadResult.storageUrl,
        fileSize: uploadResult.fileSize,
        contentType: uploadResult.contentType,
        imageIndex: index,
      } satisfies ListingImageData;
    })
  );

  const captured: ListingImageData[] = [];
  const failed: { url: string; error: string }[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      captured.push(result.value);
    } else {
      const reason = result.reason;
      failed.push({
        url: imageUrls[i],
        error: reason instanceof Error ? reason.message : String(reason),
      });
    }
  }

  return { captured, failed };
}

/**
 * Persist ListingImage records for all successfully uploaded images.
 * No-op when capturedImages is empty.
 */
export async function saveImageMetadata(
  listingId: string,
  capturedImages: ListingImageData[]
): Promise<void> {
  if (!capturedImages.length) return;

  await prisma.listingImage.createMany({
    data: capturedImages.map((img) => ({
      listingId,
      imageIndex: img.imageIndex,
      originalUrl: img.originalUrl,
      storagePath: img.storagePath,
      storageUrl: img.storageUrl,
      fileSize: img.fileSize,
      contentType: img.contentType,
      width: null,
      height: null,
    })),
  });
}

/**
 * Returns true when the listing already has at least one ListingImage record.
 * Used to skip re-downloading images for duplicate listings.
 */
export async function hasExistingImages(listingId: string): Promise<boolean> {
  const count = await prisma.listingImage.count({ where: { listingId } });
  return count > 0;
}
