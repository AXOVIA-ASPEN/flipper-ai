/**
 * file: src/__tests__/lib/posting-queue-image-status.test.ts
 * author: Stephen Boyett
 * company: Axovia AI
 * date: 2026-04-08
 * version: 1.0
 * brief: Tests for the posting-queue computed imageStatus helper.
 *
 * description:
 *     Exercises every state transition of computeImageStatus() so the API
 *     response field driven by this function has predictable semantics:
 *     'available' when the ListingImage relation is populated,
 *     'legacy-fallback' when only the pre-Epic-3 imageUrls JSON is present,
 *     and 'manual-upload-required' when neither source has any URLs.
 */

import { computeImageStatus } from '@/lib/posting-queue-image-status';

describe('computeImageStatus', () => {
  it("returns 'available' when the listing has Firebase Storage images", () => {
    const status = computeImageStatus({
      images: [{ id: 'img-1' }],
      imageUrls: null,
    });
    expect(status).toBe('available');
  });

  it("returns 'available' even when imageUrls is also populated (modern wins)", () => {
    const status = computeImageStatus({
      images: [{ id: 'img-1' }],
      imageUrls: JSON.stringify(['https://legacy.example/a.jpg']),
    });
    expect(status).toBe('available');
  });

  it("returns 'legacy-fallback' when only the legacy imageUrls column is set", () => {
    const status = computeImageStatus({
      images: [],
      imageUrls: JSON.stringify(['https://legacy.example/a.jpg']),
    });
    expect(status).toBe('legacy-fallback');
  });

  it("returns 'legacy-fallback' when images is null/undefined but imageUrls exists", () => {
    const status = computeImageStatus({
      imageUrls: JSON.stringify(['https://legacy.example/a.jpg']),
    });
    expect(status).toBe('legacy-fallback');
  });

  it("returns 'manual-upload-required' when neither source has URLs", () => {
    expect(computeImageStatus({ images: [], imageUrls: null })).toBe(
      'manual-upload-required'
    );
    expect(computeImageStatus({ images: [], imageUrls: '' })).toBe(
      'manual-upload-required'
    );
    expect(computeImageStatus({})).toBe('manual-upload-required');
  });

  it("returns 'manual-upload-required' for empty JSON array imageUrls ('[]')", () => {
    expect(computeImageStatus({ images: [], imageUrls: '[]' })).toBe(
      'manual-upload-required'
    );
  });

  it("returns 'manual-upload-required' for non-array JSON imageUrls ('{}')", () => {
    expect(computeImageStatus({ images: [], imageUrls: '{}' })).toBe(
      'manual-upload-required'
    );
  });

  it("returns 'manual-upload-required' for malformed JSON imageUrls", () => {
    expect(
      computeImageStatus({ images: [], imageUrls: '{not valid json' })
    ).toBe('manual-upload-required');
  });

  it("returns 'manual-upload-required' for array of only non-string items", () => {
    expect(
      computeImageStatus({ images: [], imageUrls: '[42, null, true]' })
    ).toBe('manual-upload-required');
  });

  it('returns null when the listing itself is missing', () => {
    expect(computeImageStatus(null)).toBeNull();
    expect(computeImageStatus(undefined)).toBeNull();
  });
});
