import { getListingImageUrl, getAllListingImageUrls } from '@/lib/image-helpers';
import type { ListingWithImages } from '@/lib/image-helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeImages(storageUrls: string[]) {
  return storageUrls.map((storageUrl, imageIndex) => ({
    id: `img-${imageIndex}`,
    listingId: 'listing1',
    imageIndex,
    originalUrl: `https://img.source.com/${imageIndex}.jpg`,
    storagePath: `user1/CL/listing1/${imageIndex}.jpg`,
    storageUrl,
    fileSize: 5000,
    contentType: 'image/jpeg',
    width: null,
    height: null,
    uploadedAt: new Date(),
  }));
}

function makeListing(
  imageUrls: string | null,
  images: ReturnType<typeof makeImages>
): ListingWithImages {
  return {
    id: 'listing1',
    imageUrls,
    images,
  } as unknown as ListingWithImages;
}

// ---------------------------------------------------------------------------
// getListingImageUrl
// ---------------------------------------------------------------------------

describe('getListingImageUrl', () => {
  it('returns storageUrl when images relation is populated', () => {
    const listing = makeListing(
      '["https://external.com/old.jpg"]',
      makeImages(['https://storage.googleapis.com/bucket/user1/CL/listing1/0.jpg'])
    );
    expect(getListingImageUrl(listing)).toBe(
      'https://storage.googleapis.com/bucket/user1/CL/listing1/0.jpg'
    );
  });

  it('falls back to parsed imageUrls when images array is empty', () => {
    const listing = makeListing('["https://external.com/fallback.jpg"]', []);
    expect(getListingImageUrl(listing)).toBe('https://external.com/fallback.jpg');
  });

  it('returns null when no images and no imageUrls', () => {
    const listing = makeListing(null, []);
    expect(getListingImageUrl(listing)).toBeNull();
  });

  it('returns null when imageUrls is an empty JSON array', () => {
    const listing = makeListing('[]', []);
    expect(getListingImageUrl(listing)).toBeNull();
  });

  it('returns null when imageUrls is invalid JSON', () => {
    const listing = makeListing('not-json', []);
    expect(getListingImageUrl(listing)).toBeNull();
  });

  it('returns first image storageUrl when multiple images exist', () => {
    const listing = makeListing(null, makeImages([
      'https://storage.googleapis.com/bucket/0.jpg',
      'https://storage.googleapis.com/bucket/1.jpg',
    ]));
    expect(getListingImageUrl(listing)).toBe(
      'https://storage.googleapis.com/bucket/0.jpg'
    );
  });

  it('returns imageIndex=0 URL when images are returned out of order', () => {
    const images = makeImages([
      'https://storage.googleapis.com/bucket/0.jpg',
      'https://storage.googleapis.com/bucket/1.jpg',
      'https://storage.googleapis.com/bucket/2.jpg',
    ]);
    // Shuffle: put index=2 first
    const shuffled = [images[2], images[0], images[1]];
    const listing = makeListing(null, shuffled);
    expect(getListingImageUrl(listing)).toBe(
      'https://storage.googleapis.com/bucket/0.jpg'
    );
  });
});

// ---------------------------------------------------------------------------
// getAllListingImageUrls
// ---------------------------------------------------------------------------

describe('getAllListingImageUrls', () => {
  it('returns ordered array from images relation', () => {
    const images = makeImages([
      'https://storage.googleapis.com/bucket/0.jpg',
      'https://storage.googleapis.com/bucket/1.jpg',
      'https://storage.googleapis.com/bucket/2.jpg',
    ]);
    // Shuffle to verify sort
    const shuffled = [images[2], images[0], images[1]];
    const listing = makeListing(null, shuffled);

    const result = getAllListingImageUrls(listing);
    expect(result).toEqual([
      'https://storage.googleapis.com/bucket/0.jpg',
      'https://storage.googleapis.com/bucket/1.jpg',
      'https://storage.googleapis.com/bucket/2.jpg',
    ]);
  });

  it('falls back to parsed imageUrls when images array is empty', () => {
    const listing = makeListing(
      '["https://external.com/a.jpg","https://external.com/b.jpg"]',
      []
    );
    expect(getAllListingImageUrls(listing)).toEqual([
      'https://external.com/a.jpg',
      'https://external.com/b.jpg',
    ]);
  });

  it('returns empty array when no images and no imageUrls', () => {
    const listing = makeListing(null, []);
    expect(getAllListingImageUrls(listing)).toEqual([]);
  });

  it('returns empty array when imageUrls is invalid JSON', () => {
    const listing = makeListing('bad-json', []);
    expect(getAllListingImageUrls(listing)).toEqual([]);
  });

  it('prefers images relation over imageUrls', () => {
    const images = makeImages(['https://storage.googleapis.com/bucket/0.jpg']);
    const listing = makeListing('["https://external.com/old.jpg"]', images);

    const result = getAllListingImageUrls(listing);
    expect(result).toEqual(['https://storage.googleapis.com/bucket/0.jpg']);
    expect(result).not.toContain('https://external.com/old.jpg');
  });
});
