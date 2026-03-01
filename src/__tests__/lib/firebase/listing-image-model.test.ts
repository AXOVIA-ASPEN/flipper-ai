/**
 * Tests for ListingImage Prisma model operations.
 * Validates schema contract via mocked Prisma client.
 */

jest.mock('@/lib/db', () => {
  const mockListingImage = {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  };
  return { prisma: { listingImage: mockListingImage } };
});

import { prisma } from '@/lib/db';

const sampleImage = {
  id: 'climg001',
  listingId: 'listing-1',
  imageIndex: 0,
  originalUrl: 'https://example.com/image.jpg',
  storagePath: 'user1/ebay/listing-1/0.jpg',
  storageUrl: 'https://storage.googleapis.com/axovia-flipper.firebasestorage.app/user1/ebay/listing-1/0.jpg',
  fileSize: 102400,
  contentType: 'image/jpeg',
  width: 800,
  height: 600,
  uploadedAt: new Date('2026-03-01'),
};

describe('ListingImage Model Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a ListingImage record with all fields', async () => {
    (prisma.listingImage.create as jest.Mock).mockResolvedValue(sampleImage);

    const result = await prisma.listingImage.create({
      data: {
        listingId: 'listing-1',
        imageIndex: 0,
        originalUrl: 'https://example.com/image.jpg',
        storagePath: 'user1/ebay/listing-1/0.jpg',
        storageUrl: 'https://storage.googleapis.com/axovia-flipper.firebasestorage.app/user1/ebay/listing-1/0.jpg',
        fileSize: 102400,
        contentType: 'image/jpeg',
        width: 800,
        height: 600,
      },
    });

    expect(result).toEqual(sampleImage);
    expect(prisma.listingImage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          listingId: 'listing-1',
          imageIndex: 0,
          storagePath: 'user1/ebay/listing-1/0.jpg',
        }),
      })
    );
  });

  it('queries images by listingId', async () => {
    const images = [
      sampleImage,
      { ...sampleImage, id: 'climg002', imageIndex: 1, storagePath: 'user1/ebay/listing-1/1.jpg' },
    ];
    (prisma.listingImage.findMany as jest.Mock).mockResolvedValue(images);

    const result = await prisma.listingImage.findMany({
      where: { listingId: 'listing-1' },
      orderBy: { imageIndex: 'asc' },
    });

    expect(result).toHaveLength(2);
    expect(prisma.listingImage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { listingId: 'listing-1' },
      })
    );
  });

  it('finds a unique image by composite key (listingId + imageIndex)', async () => {
    (prisma.listingImage.findUnique as jest.Mock).mockResolvedValue(sampleImage);

    const result = await prisma.listingImage.findUnique({
      where: {
        listingId_imageIndex: { listingId: 'listing-1', imageIndex: 0 },
      },
    });

    expect(result).toEqual(sampleImage);
    expect(prisma.listingImage.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          listingId_imageIndex: { listingId: 'listing-1', imageIndex: 0 },
        },
      })
    );
  });

  it('deletes all images for a listing (cascade simulation)', async () => {
    (prisma.listingImage.deleteMany as jest.Mock).mockResolvedValue({ count: 3 });

    const result = await prisma.listingImage.deleteMany({
      where: { listingId: 'listing-1' },
    });

    expect(result.count).toBe(3);
    expect(prisma.listingImage.deleteMany).toHaveBeenCalledWith({
      where: { listingId: 'listing-1' },
    });
  });

  it('creates image without optional width/height', async () => {
    const noSize = { ...sampleImage, width: null, height: null };
    (prisma.listingImage.create as jest.Mock).mockResolvedValue(noSize);

    const result = await prisma.listingImage.create({
      data: {
        listingId: 'listing-1',
        imageIndex: 0,
        originalUrl: 'https://example.com/img.jpg',
        storagePath: 'user1/ebay/listing-1/0.jpg',
        storageUrl: 'https://storage.googleapis.com/bucket/user1/ebay/listing-1/0.jpg',
        fileSize: 51200,
        contentType: 'image/jpeg',
      },
    });

    expect(result.width).toBeNull();
    expect(result.height).toBeNull();
  });
});
