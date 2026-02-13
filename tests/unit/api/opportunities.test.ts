/**
 * @file Unit tests for opportunities API routes
 * @author Stephen Boyett
 * @company Axovia AI
 */

import { NextRequest } from 'next/server';
import { GET, POST, PUT } from '@/app/api/opportunities/route';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

jest.mock('next-auth');
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    opportunity: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    listing: {
      findUnique: jest.fn(),
    },
  },
}));

const mockSession = {
  user: { id: 'user-123', email: 'test@example.com', role: 'USER' },
  expires: '2026-12-31',
};

describe('Opportunities API - GET', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    
    const request = new NextRequest('http://localhost:3000/api/opportunities');
    const response = await GET(request);
    
    expect(response.status).toBe(401);
  });

  it('should return opportunities sorted by profit margin', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    
    const mockOpportunities = [
      {
        id: 'opp-1',
        title: 'Vintage Camera',
        sourcePrice: 50,
        estimatedResalePrice: 150,
        profitMargin: 100,
        marketplace: 'CRAIGSLIST',
        aiConfidence: 0.92,
      },
      {
        id: 'opp-2',
        title: 'Gaming Console',
        sourcePrice: 200,
        estimatedResalePrice: 350,
        profitMargin: 150,
        marketplace: 'FACEBOOK',
        aiConfidence: 0.87,
      },
    ];
    
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue(mockOpportunities);
    
    const request = new NextRequest('http://localhost:3000/api/opportunities');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.opportunities).toEqual(mockOpportunities);
    expect(prisma.opportunity.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123', status: { not: 'ARCHIVED' } },
      orderBy: { profitMargin: 'desc' },
      include: { sourceImages: true },
    });
  });

  it('should filter by marketplace', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([]);
    
    const request = new NextRequest('http://localhost:3000/api/opportunities?marketplace=EBAY');
    await GET(request);
    
    expect(prisma.opportunity.findMany).toHaveBeenCalledWith({
      where: { 
        userId: 'user-123', 
        status: { not: 'ARCHIVED' },
        marketplace: 'EBAY',
      },
      orderBy: { profitMargin: 'desc' },
      include: { sourceImages: true },
    });
  });

  it('should filter by min profit margin', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([]);
    
    const request = new NextRequest('http://localhost:3000/api/opportunities?minProfit=50');
    await GET(request);
    
    expect(prisma.opportunity.findMany).toHaveBeenCalledWith({
      where: { 
        userId: 'user-123', 
        status: { not: 'ARCHIVED' },
        profitMargin: { gte: 50 },
      },
      orderBy: { profitMargin: 'desc' },
      include: { sourceImages: true },
    });
  });

  it('should filter by AI confidence threshold', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([]);
    
    const request = new NextRequest('http://localhost:3000/api/opportunities?minConfidence=0.85');
    await GET(request);
    
    expect(prisma.opportunity.findMany).toHaveBeenCalledWith({
      where: { 
        userId: 'user-123', 
        status: { not: 'ARCHIVED' },
        aiConfidence: { gte: 0.85 },
      },
      orderBy: { profitMargin: 'desc' },
      include: { sourceImages: true },
    });
  });
});

describe('Opportunities API - POST (AI Analysis)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create opportunity from marketplace listing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    
    const requestBody = {
      sourceUrl: 'https://craigslist.org/item/12345',
      marketplace: 'CRAIGSLIST',
      title: 'Old Camera',
      price: 50,
      description: 'Working condition, slight wear',
      images: ['https://images.craigslist.org/abc123.jpg'],
    };
    
    const createdOpportunity = {
      id: 'opp-new',
      ...requestBody,
      userId: 'user-123',
      estimatedResalePrice: 150,
      profitMargin: 100,
      aiConfidence: 0.91,
      aiAnalysis: 'Vintage camera model XYZ, high demand on eBay...',
    };
    
    (prisma.opportunity.create as jest.Mock).mockResolvedValue(createdOpportunity);
    
    const request = new NextRequest('http://localhost:3000/api/opportunities', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    
    const response = await POST(request);
    
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.opportunity).toEqual(createdOpportunity);
    expect(prisma.opportunity.create).toHaveBeenCalled();
  });

  it('should reject opportunities with low AI confidence', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    
    // Mock AI analysis returning low confidence
    const requestBody = {
      sourceUrl: 'https://facebook.com/marketplace/item/99999',
      marketplace: 'FACEBOOK',
      title: 'Broken Item',
      price: 5,
    };
    
    const request = new NextRequest('http://localhost:3000/api/opportunities', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    
    const response = await POST(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('confidence');
  });

  it('should validate required fields', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    
    const invalidRequest = { price: 50 }; // Missing title, sourceUrl
    
    const request = new NextRequest('http://localhost:3000/api/opportunities', {
      method: 'POST',
      body: JSON.stringify(invalidRequest),
    });
    
    const response = await POST(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeTruthy();
  });
});

describe('Opportunities API - PUT (Status Updates)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update opportunity status to PURSUING', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    
    const existingOpp = { id: 'opp-1', userId: 'user-123', status: 'NEW' };
    (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue(existingOpp);
    
    const updatedOpp = { ...existingOpp, status: 'PURSUING' };
    (prisma.opportunity.update as jest.Mock).mockResolvedValue(updatedOpp);
    
    const request = new NextRequest('http://localhost:3000/api/opportunities/opp-1', {
      method: 'PUT',
      body: JSON.stringify({ status: 'PURSUING' }),
    });
    
    const response = await PUT(request, { params: { id: 'opp-1' } });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.opportunity.status).toBe('PURSUING');
  });

  it('should prevent updating other users opportunities', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    
    const otherUserOpp = { id: 'opp-2', userId: 'other-user' };
    (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue(otherUserOpp);
    
    const request = new NextRequest('http://localhost:3000/api/opportunities/opp-2', {
      method: 'PUT',
      body: JSON.stringify({ status: 'ARCHIVED' }),
    });
    
    const response = await PUT(request, { params: { id: 'opp-2' } });
    
    expect(response.status).toBe(403);
    expect(prisma.opportunity.update).not.toHaveBeenCalled();
  });

  it('should link opportunity to created listing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    
    const opp = { id: 'opp-1', userId: 'user-123', status: 'PURSUING' };
    (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue(opp);
    
    const listing = { id: 'listing-1', userId: 'user-123' };
    (prisma.listing.findUnique as jest.Mock).mockResolvedValue(listing);
    
    const updatedOpp = { ...opp, linkedListingId: 'listing-1', status: 'LISTED' };
    (prisma.opportunity.update as jest.Mock).mockResolvedValue(updatedOpp);
    
    const request = new NextRequest('http://localhost:3000/api/opportunities/opp-1', {
      method: 'PUT',
      body: JSON.stringify({ linkedListingId: 'listing-1', status: 'LISTED' }),
    });
    
    const response = await PUT(request, { params: { id: 'opp-1' } });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.opportunity.linkedListingId).toBe('listing-1');
  });

  it('should validate status transitions', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    
    const opp = { id: 'opp-1', userId: 'user-123', status: 'ARCHIVED' };
    (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue(opp);
    
    // Try to move archived opp back to NEW (invalid transition)
    const request = new NextRequest('http://localhost:3000/api/opportunities/opp-1', {
      method: 'PUT',
      body: JSON.stringify({ status: 'NEW' }),
    });
    
    const response = await PUT(request, { params: { id: 'opp-1' } });
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('transition');
  });
});
