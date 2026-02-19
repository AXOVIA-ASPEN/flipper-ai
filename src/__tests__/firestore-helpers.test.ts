/**
 * Unit Tests for Firestore Helpers
 * Tests all CRUD operations and helper functions
 */

import { Timestamp } from 'firebase-admin/firestore';
import {
  timestampToISO,
  isoToTimestamp,
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  queryDocuments,
  createListing,
  getListing,
  updateListing,
  getListingsByUser,
  getOpportunities,
  createScraperJob,
  updateScraperJob,
  getScraperJob,
  getScraperJobsByUser,
} from '../lib/firebase/firestore-helpers';

// Mock the admin db
jest.mock('../lib/firebase/admin', () => ({
  db: {
    collection: jest.fn(),
  },
}));

import { db } from '../lib/firebase/admin';

describe('Firestore Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('timestampToISO', () => {
    it('should convert Firestore timestamp to ISO string', () => {
      const mockTimestamp = {
        toDate: () => new Date('2026-02-19T03:41:00.000Z'),
      };
      const result = timestampToISO(mockTimestamp);
      expect(result).toBe('2026-02-19T03:41:00.000Z');
    });

    it('should convert Date object to ISO string', () => {
      const date = new Date('2026-02-19T03:41:00.000Z');
      const result = timestampToISO(date);
      expect(result).toBe('2026-02-19T03:41:00.000Z');
    });

    it('should return current date ISO string when timestamp is null', () => {
      const result = timestampToISO(null);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should return current date ISO string when timestamp is undefined', () => {
      const result = timestampToISO(undefined);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('isoToTimestamp', () => {
    it('should convert ISO string to Firestore timestamp', () => {
      const iso = '2026-02-19T03:41:00.000Z';
      const result = isoToTimestamp(iso);
      expect(result).toBeInstanceOf(Timestamp);
      expect(result.toDate().toISOString()).toBe(iso);
    });

    it('should handle different ISO formats', () => {
      const iso = '2026-02-19T03:41:00Z';
      const result = isoToTimestamp(iso);
      expect(result).toBeInstanceOf(Timestamp);
    });
  });

  describe('createDocument', () => {
    it('should create a document with timestamps', async () => {
      const mockDocRef = { id: 'doc123' };
      const mockAdd = jest.fn().mockResolvedValue(mockDocRef);
      const mockCollection = jest.fn().mockReturnValue({ add: mockAdd });
      (db.collection as jest.Mock) = mockCollection;

      const data = { name: 'Test Item', value: 100 };
      const result = await createDocument('items', data);

      expect(mockCollection).toHaveBeenCalledWith('items');
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Item',
          value: 100,
          createdAt: expect.any(Timestamp),
          updatedAt: expect.any(Timestamp),
        })
      );
      expect(result).toEqual({
        id: 'doc123',
        data: { ...data, id: 'doc123' },
      });
    });

    it('should handle empty data object', async () => {
      const mockDocRef = { id: 'doc456' };
      const mockAdd = jest.fn().mockResolvedValue(mockDocRef);
      const mockCollection = jest.fn().mockReturnValue({ add: mockAdd });
      (db.collection as jest.Mock) = mockCollection;

      const result = await createDocument('items', {});

      expect(result.id).toBe('doc456');
      expect(result.data.id).toBe('doc456');
    });
  });

  describe('getDocument', () => {
    it('should retrieve a document by ID', async () => {
      const mockData = { name: 'Test Item', value: 100 };
      const mockDocSnap = {
        exists: true,
        id: 'doc123',
        data: () => mockData,
      };
      const mockGet = jest.fn().mockResolvedValue(mockDocSnap);
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (db.collection as jest.Mock) = mockCollection;

      const result = await getDocument('items', 'doc123');

      expect(mockCollection).toHaveBeenCalledWith('items');
      expect(mockDoc).toHaveBeenCalledWith('doc123');
      expect(result).toEqual({ id: 'doc123', ...mockData });
    });

    it('should return null when document does not exist', async () => {
      const mockDocSnap = { exists: false };
      const mockGet = jest.fn().mockResolvedValue(mockDocSnap);
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (db.collection as jest.Mock) = mockCollection;

      const result = await getDocument('items', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateDocument', () => {
    it('should update a document with updatedAt timestamp', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockDoc = jest.fn().mockReturnValue({ update: mockUpdate });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (db.collection as jest.Mock) = mockCollection;

      const updateData = { value: 200 };
      await updateDocument('items', 'doc123', updateData);

      expect(mockCollection).toHaveBeenCalledWith('items');
      expect(mockDoc).toHaveBeenCalledWith('doc123');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 200,
          updatedAt: expect.any(Timestamp),
        })
      );
    });

    it('should handle partial updates', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockDoc = jest.fn().mockReturnValue({ update: mockUpdate });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (db.collection as jest.Mock) = mockCollection;

      await updateDocument('items', 'doc123', { status: 'active' });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          updatedAt: expect.any(Timestamp),
        })
      );
    });
  });

  describe('deleteDocument', () => {
    it('should delete a document by ID', async () => {
      const mockDelete = jest.fn().mockResolvedValue(undefined);
      const mockDoc = jest.fn().mockReturnValue({ delete: mockDelete });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (db.collection as jest.Mock) = mockCollection;

      await deleteDocument('items', 'doc123');

      expect(mockCollection).toHaveBeenCalledWith('items');
      expect(mockDoc).toHaveBeenCalledWith('doc123');
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('queryDocuments', () => {
    it('should query documents with no constraints', async () => {
      const mockDocs = [
        { id: 'doc1', data: () => ({ name: 'Item 1' }) },
        { id: 'doc2', data: () => ({ name: 'Item 2' }) },
      ];
      const mockSnapshot = { docs: mockDocs };
      const mockGet = jest.fn().mockResolvedValue(mockSnapshot);
      const mockCollection = jest.fn().mockReturnValue({ get: mockGet });
      (db.collection as jest.Mock) = mockCollection;

      const result = await queryDocuments('items');

      expect(result).toEqual([
        { id: 'doc1', name: 'Item 1' },
        { id: 'doc2', name: 'Item 2' },
      ]);
    });

    it('should apply where constraints', async () => {
      const mockSnapshot = { docs: [] };
      const mockGet = jest.fn().mockResolvedValue(mockSnapshot);
      const mockWhere = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ where: mockWhere });
      (db.collection as jest.Mock) = mockCollection;

      await queryDocuments('items', {
        where: [{ field: 'status', operator: '==', value: 'active' }],
      });

      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'active');
    });

    it('should apply multiple where constraints', async () => {
      const mockSnapshot = { docs: [] };
      const mockGet = jest.fn().mockResolvedValue(mockSnapshot);
      const mockWhere = jest.fn().mockReturnThis();
      mockWhere.mockImplementation(() => ({
        where: mockWhere,
        get: mockGet,
      }));
      const mockCollection = jest.fn().mockReturnValue({ where: mockWhere });
      (db.collection as jest.Mock) = mockCollection;

      await queryDocuments('items', {
        where: [
          { field: 'status', operator: '==', value: 'active' },
          { field: 'price', operator: '>', value: 100 },
        ],
      });

      expect(mockWhere).toHaveBeenCalledTimes(2);
    });

    it('should apply orderBy constraint', async () => {
      const mockSnapshot = { docs: [] };
      const mockGet = jest.fn().mockResolvedValue(mockSnapshot);
      const mockOrderBy = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
      (db.collection as jest.Mock) = mockCollection;

      await queryDocuments('items', {
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
      });

      expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });

    it('should apply limit constraint', async () => {
      const mockSnapshot = { docs: [] };
      const mockGet = jest.fn().mockResolvedValue(mockSnapshot);
      const mockLimit = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ limit: mockLimit });
      (db.collection as jest.Mock) = mockCollection;

      await queryDocuments('items', { limit: 10 });

      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it('should apply combined constraints', async () => {
      const mockSnapshot = { docs: [] };
      const mockGet = jest.fn().mockResolvedValue(mockSnapshot);
      const mockLimit = jest.fn().mockReturnValue({ get: mockGet });
      const mockOrderBy = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockCollection = jest.fn().mockReturnValue({ where: mockWhere });
      (db.collection as jest.Mock) = mockCollection;

      await queryDocuments('items', {
        where: [{ field: 'status', operator: '==', value: 'active' }],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit: 5,
      });

      expect(mockWhere).toHaveBeenCalled();
      expect(mockOrderBy).toHaveBeenCalled();
      expect(mockLimit).toHaveBeenCalledWith(5);
    });
  });

  describe('Listing Helpers', () => {
    describe('createListing', () => {
      it('should create a listing document', async () => {
        const mockDocRef = { id: 'listing123' };
        const mockAdd = jest.fn().mockResolvedValue(mockDocRef);
        const mockCollection = jest.fn().mockReturnValue({ add: mockAdd });
        (db.collection as jest.Mock) = mockCollection;

        const listingData = {
          userId: 'user123',
          platform: 'craigslist',
          externalId: 'ext123',
          url: 'https://example.com',
          title: 'Test Item',
          askingPrice: 100,
        };

        const result = await createListing(listingData);

        expect(mockCollection).toHaveBeenCalledWith('listings');
        expect(result.id).toBe('listing123');
      });
    });

    describe('getListing', () => {
      it('should retrieve a listing by ID', async () => {
        const mockData = {
          userId: 'user123',
          title: 'Test Item',
          askingPrice: 100,
        };
        const mockDocSnap = {
          exists: true,
          id: 'listing123',
          data: () => mockData,
        };
        const mockGet = jest.fn().mockResolvedValue(mockDocSnap);
        const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
        const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
        (db.collection as jest.Mock) = mockCollection;

        const result = await getListing('listing123');

        expect(mockCollection).toHaveBeenCalledWith('listings');
        expect(result).toEqual({ id: 'listing123', ...mockData });
      });
    });

    describe('updateListing', () => {
      it('should update a listing', async () => {
        const mockUpdate = jest.fn().mockResolvedValue(undefined);
        const mockDoc = jest.fn().mockReturnValue({ update: mockUpdate });
        const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
        (db.collection as jest.Mock) = mockCollection;

        await updateListing('listing123', { askingPrice: 150 });

        expect(mockCollection).toHaveBeenCalledWith('listings');
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            askingPrice: 150,
            updatedAt: expect.any(Timestamp),
          })
        );
      });
    });

    describe('getListingsByUser', () => {
      it('should get listings for a user without platform filter', async () => {
        const mockSnapshot = { docs: [] };
        const mockGet = jest.fn().mockResolvedValue(mockSnapshot);
        const mockOrderBy = jest.fn().mockReturnValue({ get: mockGet });
        const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
        const mockCollection = jest.fn().mockReturnValue({ where: mockWhere });
        (db.collection as jest.Mock) = mockCollection;

        await getListingsByUser('user123');

        expect(mockCollection).toHaveBeenCalledWith('listings');
        expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'user123');
        expect(mockOrderBy).toHaveBeenCalledWith('scrapedAt', 'desc');
      });

      it('should get listings for a user with platform filter', async () => {
        const mockSnapshot = { docs: [] };
        const mockGet = jest.fn().mockResolvedValue(mockSnapshot);
        const mockOrderBy = jest.fn().mockReturnValue({ get: mockGet });
        const mockWhere = jest.fn().mockReturnThis();
        mockWhere.mockImplementation(() => ({
          where: mockWhere,
          orderBy: mockOrderBy,
        }));
        const mockCollection = jest.fn().mockReturnValue({ where: mockWhere });
        (db.collection as jest.Mock) = mockCollection;

        await getListingsByUser('user123', 'craigslist');

        expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'user123');
        expect(mockWhere).toHaveBeenCalledWith('platform', '==', 'craigslist');
      });
    });

    describe('getOpportunities', () => {
      it('should get opportunities with default limit', async () => {
        const mockSnapshot = { docs: [] };
        const mockGet = jest.fn().mockResolvedValue(mockSnapshot);
        const mockLimit = jest.fn().mockReturnValue({ get: mockGet });
        const mockOrderBy = jest.fn().mockReturnValue({ limit: mockLimit });
        const mockWhere = jest.fn().mockReturnThis();
        mockWhere.mockImplementation(() => ({
          where: mockWhere,
          orderBy: mockOrderBy,
        }));
        const mockCollection = jest.fn().mockReturnValue({ where: mockWhere });
        (db.collection as jest.Mock) = mockCollection;

        await getOpportunities('user123');

        expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'user123');
        expect(mockWhere).toHaveBeenCalledWith('isOpportunity', '==', true);
        expect(mockOrderBy).toHaveBeenCalledWith('valueScore', 'desc');
        expect(mockLimit).toHaveBeenCalledWith(25);
      });

      it('should get opportunities with custom limit', async () => {
        const mockSnapshot = { docs: [] };
        const mockGet = jest.fn().mockResolvedValue(mockSnapshot);
        const mockLimit = jest.fn().mockReturnValue({ get: mockGet });
        const mockOrderBy = jest.fn().mockReturnValue({ limit: mockLimit });
        const mockWhere = jest.fn().mockReturnThis();
        mockWhere.mockImplementation(() => ({
          where: mockWhere,
          orderBy: mockOrderBy,
        }));
        const mockCollection = jest.fn().mockReturnValue({ where: mockWhere });
        (db.collection as jest.Mock) = mockCollection;

        await getOpportunities('user123', 50);

        expect(mockLimit).toHaveBeenCalledWith(50);
      });
    });
  });

  describe('ScraperJob Helpers', () => {
    describe('createScraperJob', () => {
      it('should create a scraper job with PENDING status', async () => {
        const mockDocRef = { id: 'job123' };
        const mockAdd = jest.fn().mockResolvedValue(mockDocRef);
        const mockCollection = jest.fn().mockReturnValue({ add: mockAdd });
        (db.collection as jest.Mock) = mockCollection;

        const jobData = {
          userId: 'user123',
          platform: 'craigslist',
          searchQuery: 'vintage bike',
          status: 'RUNNING' as const, // This should be overridden to PENDING
        };

        await createScraperJob(jobData);

        expect(mockCollection).toHaveBeenCalledWith('scraperJobs');
        expect(mockAdd).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'PENDING',
            createdAt: expect.any(Timestamp),
            updatedAt: expect.any(Timestamp),
          })
        );
      });
    });

    describe('updateScraperJob', () => {
      it('should update a scraper job', async () => {
        const mockUpdate = jest.fn().mockResolvedValue(undefined);
        const mockDoc = jest.fn().mockReturnValue({ update: mockUpdate });
        const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
        (db.collection as jest.Mock) = mockCollection;

        await updateScraperJob('job123', {
          status: 'COMPLETED',
          resultsCount: 15,
        });

        expect(mockCollection).toHaveBeenCalledWith('scraperJobs');
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'COMPLETED',
            resultsCount: 15,
            updatedAt: expect.any(Timestamp),
          })
        );
      });

      it('should update with error message on failure', async () => {
        const mockUpdate = jest.fn().mockResolvedValue(undefined);
        const mockDoc = jest.fn().mockReturnValue({ update: mockUpdate });
        const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
        (db.collection as jest.Mock) = mockCollection;

        await updateScraperJob('job123', {
          status: 'FAILED',
          errorMessage: 'Connection timeout',
        });

        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'FAILED',
            errorMessage: 'Connection timeout',
          })
        );
      });
    });

    describe('getScraperJob', () => {
      it('should retrieve a scraper job by ID', async () => {
        const mockData = {
          userId: 'user123',
          platform: 'craigslist',
          searchQuery: 'vintage bike',
          status: 'COMPLETED',
        };
        const mockDocSnap = {
          exists: true,
          id: 'job123',
          data: () => mockData,
        };
        const mockGet = jest.fn().mockResolvedValue(mockDocSnap);
        const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
        const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
        (db.collection as jest.Mock) = mockCollection;

        const result = await getScraperJob('job123');

        expect(mockCollection).toHaveBeenCalledWith('scraperJobs');
        expect(result).toEqual({ id: 'job123', ...mockData });
      });
    });

    describe('getScraperJobsByUser', () => {
      it('should get scraper jobs for a user with limit', async () => {
        const mockDocs = [
          {
            id: 'job1',
            data: () => ({
              userId: 'user123',
              platform: 'craigslist',
              status: 'COMPLETED',
            }),
          },
        ];
        const mockSnapshot = { docs: mockDocs };
        const mockGet = jest.fn().mockResolvedValue(mockSnapshot);
        const mockLimit = jest.fn().mockReturnValue({ get: mockGet });
        const mockOrderBy = jest.fn().mockReturnValue({ limit: mockLimit });
        const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
        const mockCollection = jest.fn().mockReturnValue({ where: mockWhere });
        (db.collection as jest.Mock) = mockCollection;

        const result = await getScraperJobsByUser('user123');

        expect(mockCollection).toHaveBeenCalledWith('scraperJobs');
        expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'user123');
        expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
        expect(mockLimit).toHaveBeenCalledWith(50);
        expect(result).toHaveLength(1);
      });
    });
  });
});
