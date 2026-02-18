/**
 * Cloud Functions client for Flipper AI
 * Routes scraper requests to Firebase Cloud Functions
 */

const FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_FUNCTIONS_URL || 
  `https://us-east1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net`;

interface CloudFunctionResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  listings?: T[];
  jobId?: string;
}

/**
 * Call a Cloud Function
 */
export async function callCloudFunction<T = unknown>(
  functionName: string,
  data: Record<string, unknown>,
  options: {
    timeout?: number;
    signal?: AbortSignal;
  } = {}
): Promise<CloudFunctionResponse<T>> {
  const { timeout = 300000, signal } = options; // 5 min default timeout

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${FUNCTIONS_BASE_URL}/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: signal || controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Cloud Function error: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Cloud Function request timed out');
      }
      throw error;
    }
    
    throw new Error('Unknown error calling Cloud Function');
  }
}

/**
 * Call Craigslist scraper
 */
export async function scrapeCraigslist(params: {
  userId: string;
  location: string;
  category: string;
  keywords?: string;
  minPrice?: number;
  maxPrice?: number;
}) {
  return callCloudFunction('scrapeCraigslist', params, {
    timeout: 300000, // 5 minutes for scraping
  });
}

/**
 * Call eBay scraper
 */
export async function scrapeEbay(params: {
  userId: string;
  keywords?: string;
  categoryId?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}) {
  return callCloudFunction('scrapeEbay', params);
}

/**
 * Call Facebook scraper
 */
export async function scrapeFacebook(params: {
  userId: string;
  location?: string;
  category?: string;
  keywords?: string;
  minPrice?: number;
  maxPrice?: number;
}) {
  return callCloudFunction('scrapeFacebook', params);
}

/**
 * Call OfferUp scraper
 */
export async function scrapeOfferUp(params: {
  userId: string;
  location?: string;
  keywords?: string;
  minPrice?: number;
  maxPrice?: number;
}) {
  return callCloudFunction('scrapeOfferup', params, {
    timeout: 300000,
  });
}

/**
 * Call Mercari scraper
 */
export async function scrapeMercari(params: {
  userId: string;
  keywords?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}) {
  return callCloudFunction('scrapeMercari', params);
}

/**
 * Check Cloud Functions health
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${FUNCTIONS_BASE_URL}/health`);
    return await response.json();
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
