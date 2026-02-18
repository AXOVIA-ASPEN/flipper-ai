import { Request, Response } from 'firebase-functions';

/**
 * Handle CORS for Cloud Functions
 */
export function handleCORS(req: Request, res: Response): boolean {
  // Set CORS headers
  const origin = req.headers.origin || '*';
  res.set('Access-Control-Allow-Origin', origin);
  res.set('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
    return true;
  }
  
  return false;
}

/**
 * Validate request method
 */
export function validateMethod(
  req: Request,
  res: Response,
  allowedMethods: string[]
): boolean {
  if (!allowedMethods.includes(req.method)) {
    res.status(405).json({ error: `Method ${req.method} not allowed` });
    return false;
  }
  return true;
}

/**
 * Extract and validate request body
 */
export function validateBody<T>(
  req: Request,
  res: Response,
  requiredFields: string[]
): T | null {
  const body = req.body as T;
  
  const missingFields = requiredFields.filter(
    field => !(field in (body as any))
  );
  
  if (missingFields.length > 0) {
    res.status(400).json({
      error: 'Missing required fields',
      fields: missingFields,
    });
    return null;
  }
  
  return body;
}
