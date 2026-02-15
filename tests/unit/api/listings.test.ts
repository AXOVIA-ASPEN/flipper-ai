/**
 * @file Unit tests for listings API routes
 * @author Stephen Boyett
 * @company Axovia AI
 */

import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/listings/route';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    listing: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockSession = {
  user: { id: 'user-123', email: 'test@example.com', role: 'USER' },
  expires: '2026-12-31',
};

describe('Listings API - GET', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/listings');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return all listings for authenticated user', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);

    const mockListings = [
      { id: 'listing-1', title: 'Test Item 1', price: 50, status: 'DRAFT' },
      { id: 'listing-2', title: 'Test Item 2', price: 100, status: 'ACTIVE' },
    ];

    (prisma.listing.findMany as jest.Mock).mockResolvedValue(mockListings);

    const request = new NextRequest('http://localhost:3000/api/listings');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.listings).toEqual(mockListings);
    expect(prisma.listing.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should filter listings by status query param', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.listing.findMany as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/listings?status=ACTIVE');
    await GET(request);

    expect(prisma.listing.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-123',
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should handle database errors gracefully', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.listing.findMany as jest.Mock).mockRejectedValue(new Error('DB connection failed'));

    const request = new NextRequest('http://localhost:3000/api/listings');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain('Failed to fetch listings');
  });
});

describe('Listings API - POST', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new listing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);

    const newListing = {
      title: 'Vintage Camera',
      description: 'Classic 35mm film camera',
      price: 150,
      marketplace: 'EBAY',
    };

    const createdListing = { id: 'listing-new', ...newListing, userId: 'user-123' };
    (prisma.listing.create as jest.Mock).mockResolvedValue(createdListing);

    const request = new NextRequest('http://localhost:3000/api/listings', {
      method: 'POST',
      body: JSON.stringify(newListing),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.listing).toEqual(createdListing);
  });

  it('should validate required fields', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);

    const invalidListing = { price: 50 }; // Missing title

    const request = new NextRequest('http://localhost:3000/api/listings', {
      method: 'POST',
      body: JSON.stringify(invalidListing),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('title');
  });

  it('should enforce user quota limits', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.listing.findMany as jest.Mock).mockResolvedValue(new Array(100)); // User at limit

    const request = new NextRequest('http://localhost:3000/api/listings', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', price: 50 }),
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('quota');
  });
});

describe('Listings API - PUT', () => {
  it('should update an existing listing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);

    const existingListing = { id: 'listing-1', userId: 'user-123', title: 'Old Title', price: 50 };
    (prisma.listing.findUnique as jest.Mock).mockResolvedValue(existingListing);

    const updatedListing = { ...existingListing, title: 'New Title', price: 75 };
    (prisma.listing.update as jest.Mock).mockResolvedValue(updatedListing);

    const request = new NextRequest('http://localhost:3000/api/listings/listing-1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'New Title', price: 75 }),
    });

    const response = await PUT(request, { params: { id: 'listing-1' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.listing.title).toBe('New Title');
  });

  it('should prevent unauthorized updates', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);

    const otherUserListing = { id: 'listing-2', userId: 'other-user', title: 'Protected' };
    (prisma.listing.findUnique as jest.Mock).mockResolvedValue(otherUserListing);

    const request = new NextRequest('http://localhost:3000/api/listings/listing-2', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Hacked' }),
    });

    const response = await PUT(request, { params: { id: 'listing-2' } });

    expect(response.status).toBe(403);
    expect(prisma.listing.update).not.toHaveBeenCalled();
  });
});

describe('Listings API - DELETE', () => {
  it('should delete own listing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);

    const listing = { id: 'listing-1', userId: 'user-123' };
    (prisma.listing.findUnique as jest.Mock).mockResolvedValue(listing);
    (prisma.listing.delete as jest.Mock).mockResolvedValue(listing);

    const request = new NextRequest('http://localhost:3000/api/listings/listing-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: { id: 'listing-1' } });

    expect(response.status).toBe(200);
    expect(prisma.listing.delete).toHaveBeenCalledWith({ where: { id: 'listing-1' } });
  });

  it('should prevent deleting other users listings', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);

    const listing = { id: 'listing-2', userId: 'other-user' };
    (prisma.listing.findUnique as jest.Mock).mockResolvedValue(listing);

    const request = new NextRequest('http://localhost:3000/api/listings/listing-2', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: { id: 'listing-2' } });

    expect(response.status).toBe(403);
    expect(prisma.listing.delete).not.toHaveBeenCalled();
  });
});
