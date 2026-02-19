/**
 * Firestore Helper Utilities
 * Common functions for Firestore operations
 */

import { db } from './admin';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  QueryConstraint,
  Timestamp
} from 'firebase-admin/firestore';

// Convert Firestore timestamp to ISO string
export function timestampToISO(timestamp: any): string {
  if (!timestamp) return new Date().toISOString();
  if (timestamp.toDate) return timestamp.toDate().toISOString();
  return new Date(timestamp).toISOString();
}

// Convert ISO string to Firestore timestamp
export function isoToTimestamp(iso: string): Timestamp {
  return Timestamp.fromDate(new Date(iso));
}

// Generic CRUD operations

export async function createDocument<T extends Record<string, any>>(
  collectionName: string,
  data: T
): Promise<{ id: string; data: T }> {
  const docRef = await db.collection(collectionName).add({
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  
  return {
    id: docRef.id,
    data: { ...data, id: docRef.id },
  };
}

export async function getDocument<T>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  const docRef = db.collection(collectionName).doc(docId);
  const docSnap = await docRef.get();
  
  if (!docSnap.exists) {
    return null;
  }
  
  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as T;
}

export async function updateDocument<T extends Record<string, any>>(
  collectionName: string,
  docId: string,
  data: Partial<T>
): Promise<void> {
  const docRef = db.collection(collectionName).doc(docId);
  await docRef.update({
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteDocument(
  collectionName: string,
  docId: string
): Promise<void> {
  const docRef = db.collection(collectionName).doc(docId);
  await docRef.delete();
}

export async function queryDocuments<T>(
  collectionName: string,
  constraints: {
    where?: Array<{ field: string; operator: any; value: any }>;
    orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
    limit?: number;
  } = {}
): Promise<T[]> {
  let queryRef: any = db.collection(collectionName);
  
  // Apply where clauses
  if (constraints.where) {
    for (const w of constraints.where) {
      queryRef = queryRef.where(w.field, w.operator, w.value);
    }
  }
  
  // Apply orderBy clauses
  if (constraints.orderBy) {
    for (const o of constraints.orderBy) {
      queryRef = queryRef.orderBy(o.field, o.direction);
    }
  }
  
  // Apply limit
  if (constraints.limit) {
    queryRef = queryRef.limit(constraints.limit);
  }
  
  const snapshot = await queryRef.get();
  
  return snapshot.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data(),
  })) as T[];
}

// Listings-specific helpers

export interface ListingData {
  id?: string;
  userId: string;
  platform: string;
  externalId: string;
  url: string;
  title: string;
  description?: string;
  askingPrice: number;
  condition?: string;
  location?: string;
  sellerName?: string;
  sellerContact?: string;
  imageUrls?: string[];
  category?: string;
  postedAt?: string;
  scrapedAt?: string;
  estimatedValue?: number;
  estimatedLow?: number;
  estimatedHigh?: number;
  profitPotential?: number;
  profitLow?: number;
  profitHigh?: number;
  valueScore?: number;
  confidence?: number;
  isOpportunity?: boolean;
  aiAnalysisComplete?: boolean;
  analyzedAt?: string;
}

export async function createListing(data: ListingData) {
  return createDocument('listings', data);
}

export async function getListing(listingId: string) {
  return getDocument<ListingData>('listings', listingId);
}

export async function updateListing(listingId: string, data: Partial<ListingData>) {
  return updateDocument('listings', listingId, data);
}

export async function getListingsByUser(userId: string, platform?: string) {
  const constraints: any = {
    where: [{ field: 'userId', operator: '==', value: userId }],
    orderBy: [{ field: 'scrapedAt', direction: 'desc' as const }],
  };
  
  if (platform) {
    constraints.where.push({ field: 'platform', operator: '==', value: platform });
  }
  
  return queryDocuments<ListingData>('listings', constraints);
}

export async function getOpportunities(userId: string, limit = 25) {
  return queryDocuments<ListingData>('listings', {
    where: [
      { field: 'userId', operator: '==', value: userId },
      { field: 'isOpportunity', operator: '==', value: true },
    ],
    orderBy: [{ field: 'valueScore', direction: 'desc' }],
    limit,
  });
}

// ScraperJob helpers

export interface ScraperJobData {
  id?: string;
  userId: string;
  platform: string;
  searchQuery: string;
  location?: string;
  maxPrice?: number;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  resultsCount?: number;
  errorMessage?: string;
  completedAt?: string;
}

export async function createScraperJob(data: ScraperJobData) {
  return createDocument('scraperJobs', { ...data, status: 'PENDING' });
}

export async function updateScraperJob(jobId: string, data: Partial<ScraperJobData>) {
  return updateDocument('scraperJobs', jobId, data);
}

export async function getScraperJob(jobId: string) {
  return getDocument<ScraperJobData>('scraperJobs', jobId);
}

export async function getScraperJobsByUser(userId: string) {
  return queryDocuments<ScraperJobData>('scraperJobs', {
    where: [{ field: 'userId', operator: '==', value: userId }],
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
    limit: 50,
  });
}
