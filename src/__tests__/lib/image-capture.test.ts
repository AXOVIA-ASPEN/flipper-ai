import {
  captureListingImages,
  saveImageMetadata,
  hasExistingImages,
  type ListingImageData,
} from '@/lib/image-capture';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockUploadImageFromUrl = jest.fn();
const mockBuildStoragePath = jest.fn();

jest.mock('@/lib/firebase/storage', () => ({
  uploadImageFromUrl: (...args: unknown[]) => mockUploadImageFromUrl(...args),
  buildStoragePath: (...args: unknown[]) => mockBuildStoragePath(...args),
}));

const mockListingImageCreateMany = jest.fn();
const mockListingImageCount = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    listingImage: {
      createMany: (...args: unknown[]) => mockListingImageCreateMany(...args),
      count: (...args: unknown[]) => mockListingImageCount(...args),
    },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUploadResult(url: string, index: number) {
  return {
    originalUrl: url,
    storagePath: `user1/CRAIGSLIST/listing1/${index}.jpg`,
    storageUrl: `https://storage.googleapis.com/bucket/user1/CRAIGSLIST/listing1/${index}.jpg`,
    fileSize: 12345,
    contentType: 'image/jpeg',
  };
}

// ---------------------------------------------------------------------------
// captureListingImages
// ---------------------------------------------------------------------------

describe('captureListingImages', () => {
  const LISTING_ID = 'listing1';
  const USER_ID = 'user1';
  const PLATFORM = 'CRAIGSLIST';

  beforeEach(() => {
    mockBuildStoragePath.mockImplementation(
      (userId: string, platform: string, listingId: string, index: number, ext: string) =>
        `${userId}/${platform}/${listingId}/${index}.${ext}`
    );
  });

  it('calls uploadImageFromUrl for each URL', async () => {
    const urls = ['https://img.cl.org/a.jpg', 'https://img.cl.org/b.jpg'];
    mockUploadImageFromUrl
      .mockResolvedValueOnce(makeUploadResult(urls[0], 0))
      .mockResolvedValueOnce(makeUploadResult(urls[1], 1));

    const result = await captureListingImages(LISTING_ID, USER_ID, PLATFORM, urls);

    expect(mockUploadImageFromUrl).toHaveBeenCalledTimes(2);
    expect(result.captured).toHaveLength(2);
    expect(result.failed).toHaveLength(0);
  });

  it('returns captured array on success', async () => {
    const url = 'https://img.cl.org/a.jpg';
    mockUploadImageFromUrl.mockResolvedValueOnce(makeUploadResult(url, 0));

    const result = await captureListingImages(LISTING_ID, USER_ID, PLATFORM, [url]);

    expect(result.captured[0]).toMatchObject<Partial<ListingImageData>>({
      originalUrl: url,
      imageIndex: 0,
      fileSize: 12345,
      contentType: 'image/jpeg',
    });
  });

  it('handles partial failure — captured + failed arrays (AC #4)', async () => {
    const urls = ['https://img.cl.org/good.jpg', 'https://img.cl.org/bad.jpg'];
    mockUploadImageFromUrl
      .mockResolvedValueOnce(makeUploadResult(urls[0], 0))
      .mockRejectedValueOnce(new Error('Network timeout'));

    const result = await captureListingImages(LISTING_ID, USER_ID, PLATFORM, urls);

    expect(result.captured).toHaveLength(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]).toEqual({ url: urls[1], error: 'Network timeout' });
  });

  it('handles all failures — empty captured, all in failed', async () => {
    const urls = ['https://img.cl.org/a.jpg', 'https://img.cl.org/b.jpg'];
    mockUploadImageFromUrl
      .mockRejectedValueOnce(new Error('Error A'))
      .mockRejectedValueOnce(new Error('Error B'));

    const result = await captureListingImages(LISTING_ID, USER_ID, PLATFORM, urls);

    expect(result.captured).toHaveLength(0);
    expect(result.failed).toHaveLength(2);
  });

  it('handles empty imageUrls — returns empty arrays', async () => {
    const result = await captureListingImages(LISTING_ID, USER_ID, PLATFORM, []);

    expect(result.captured).toHaveLength(0);
    expect(result.failed).toHaveLength(0);
    expect(mockUploadImageFromUrl).not.toHaveBeenCalled();
  });

  it('extracts file extension from URL pathname', async () => {
    const url = 'https://img.cl.org/photo.png';
    mockUploadImageFromUrl.mockResolvedValueOnce(makeUploadResult(url, 0));

    await captureListingImages(LISTING_ID, USER_ID, PLATFORM, [url]);

    expect(mockBuildStoragePath).toHaveBeenCalledWith(
      USER_ID,
      PLATFORM,
      LISTING_ID,
      0,
      'png'
    );
  });

  it('defaults extension to jpg for URLs without recognised extension', async () => {
    const url = 'https://img.cl.org/photo';
    mockUploadImageFromUrl.mockResolvedValueOnce(makeUploadResult(url, 0));

    await captureListingImages(LISTING_ID, USER_ID, PLATFORM, [url]);

    expect(mockBuildStoragePath).toHaveBeenCalledWith(
      USER_ID,
      PLATFORM,
      LISTING_ID,
      0,
      'jpg'
    );
  });

  it('normalises jpeg to jpg', async () => {
    const url = 'https://img.cl.org/photo.jpeg';
    mockUploadImageFromUrl.mockResolvedValueOnce(makeUploadResult(url, 0));

    await captureListingImages(LISTING_ID, USER_ID, PLATFORM, [url]);

    expect(mockBuildStoragePath).toHaveBeenCalledWith(
      USER_ID,
      PLATFORM,
      LISTING_ID,
      0,
      'jpg'
    );
  });

  it('handles URLs with query strings', async () => {
    const url = 'https://img.cl.org/photo.webp?w=600&h=400';
    mockUploadImageFromUrl.mockResolvedValueOnce(makeUploadResult(url, 0));

    await captureListingImages(LISTING_ID, USER_ID, PLATFORM, [url]);

    expect(mockBuildStoragePath).toHaveBeenCalledWith(
      USER_ID,
      PLATFORM,
      LISTING_ID,
      0,
      'webp'
    );
  });

  it('preserves imageIndex in captured data', async () => {
    const urls = ['https://a.com/1.jpg', 'https://a.com/2.jpg', 'https://a.com/3.jpg'];
    mockUploadImageFromUrl
      .mockResolvedValueOnce(makeUploadResult(urls[0], 0))
      .mockResolvedValueOnce(makeUploadResult(urls[1], 1))
      .mockResolvedValueOnce(makeUploadResult(urls[2], 2));

    const result = await captureListingImages(LISTING_ID, USER_ID, PLATFORM, urls);

    expect(result.captured[0].imageIndex).toBe(0);
    expect(result.captured[1].imageIndex).toBe(1);
    expect(result.captured[2].imageIndex).toBe(2);
  });

  it('stores non-Error rejection reasons as strings in failed', async () => {
    const url = 'https://img.cl.org/a.jpg';
    mockUploadImageFromUrl.mockRejectedValueOnce('string error');

    const result = await captureListingImages(LISTING_ID, USER_ID, PLATFORM, [url]);

    expect(result.failed[0].error).toBe('string error');
  });
});

// ---------------------------------------------------------------------------
// saveImageMetadata
// ---------------------------------------------------------------------------

describe('saveImageMetadata', () => {
  const LISTING_ID = 'listing1';

  const makeCapture = (index: number): ListingImageData => ({
    originalUrl: `https://img.cl.org/${index}.jpg`,
    storagePath: `user1/CRAIGSLIST/listing1/${index}.jpg`,
    storageUrl: `https://storage.googleapis.com/bucket/user1/CRAIGSLIST/listing1/${index}.jpg`,
    fileSize: 5000,
    contentType: 'image/jpeg',
    imageIndex: index,
  });

  it('calls prisma.listingImage.createMany with correct data', async () => {
    mockListingImageCreateMany.mockResolvedValueOnce({ count: 2 });

    const captured = [makeCapture(0), makeCapture(1)];
    await saveImageMetadata(LISTING_ID, captured);

    expect(mockListingImageCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          listingId: LISTING_ID,
          imageIndex: 0,
          originalUrl: captured[0].originalUrl,
          storagePath: captured[0].storagePath,
          storageUrl: captured[0].storageUrl,
          fileSize: 5000,
          contentType: 'image/jpeg',
          width: null,
          height: null,
        }),
        expect.objectContaining({
          listingId: LISTING_ID,
          imageIndex: 1,
        }),
      ],
    });
  });

  it('handles empty captured array — no-op, does not call createMany', async () => {
    await saveImageMetadata(LISTING_ID, []);
    expect(mockListingImageCreateMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// hasExistingImages
// ---------------------------------------------------------------------------

describe('hasExistingImages', () => {
  it('returns true when images exist', async () => {
    mockListingImageCount.mockResolvedValueOnce(3);
    expect(await hasExistingImages('listing1')).toBe(true);
    expect(mockListingImageCount).toHaveBeenCalledWith({ where: { listingId: 'listing1' } });
  });

  it('returns false when no images', async () => {
    mockListingImageCount.mockResolvedValueOnce(0);
    expect(await hasExistingImages('listing1')).toBe(false);
  });
});
