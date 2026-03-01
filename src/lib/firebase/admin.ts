/**
 * Firebase Admin SDK Initialization (Server-side only)
 *
 * On Cloud Run: Uses Application Default Credentials (ADC) from the
 * service account (flipper-run@axovia-flipper.iam.gserviceaccount.com).
 *
 * On local/CI: Uses FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY env vars,
 * or `gcloud auth application-default login` for ADC.
 *
 * IMPORTANT: This module must ONLY be imported in server-side code
 * (API routes, middleware, Server Components). Never import in client code.
 */

import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const PROJECT_ID = 'axovia-flipper';

function initAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId: PROJECT_ID,
        clientEmail,
        privateKey,
      } as ServiceAccount),
      storageBucket,
    });
  }

  // ADC fallback (Cloud Run, local with gcloud auth)
  return initializeApp({ projectId: PROJECT_ID, storageBucket });
}

export const adminApp = initAdmin();
export const adminAuth = getAuth(adminApp);
export const adminStorage = getStorage(adminApp);
export default adminApp;
