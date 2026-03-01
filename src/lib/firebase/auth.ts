/**
 * Firebase Auth Client Helpers
 *
 * Wraps Firebase client SDK auth methods for sign-in, sign-up, and sign-out.
 * After Firebase auth, the client must call /api/auth/session to set an
 * HttpOnly session cookie for server-side auth.
 *
 * IMPORTANT: Client-side only. Do not import in server code.
 */

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  GithubAuthProvider,
  FacebookAuthProvider,
  inMemoryPersistence,
  setPersistence,
  type UserCredential,
  type Auth,
} from 'firebase/auth';
import { firebaseApp } from './config';

let authInstance: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(firebaseApp);
    // Use inMemoryPersistence — credentials are held only in memory and never
    // persisted to storage. We rely on server-side HttpOnly session cookies for
    // persistent auth, so client-side persistence is unnecessary and can cause
    // stale state.
    setPersistence(authInstance, inMemoryPersistence);
  }
  return authInstance;
}

/**
 * Exchange a Firebase ID token for an HttpOnly session cookie
 * by calling the /api/auth/session endpoint.
 */
async function exchangeTokenForSession(idToken: string, name?: string): Promise<void> {
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, ...(name && { name }) }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error?.detail || 'Failed to create session');
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await credential.user.getIdToken();
  await exchangeTokenForSession(idToken);
  return credential;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  name?: string
): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(credential.user);
  const idToken = await credential.user.getIdToken();
  await exchangeTokenForSession(idToken, name);
  return credential;
}

export async function signInWithGoogle(): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  const idToken = await credential.user.getIdToken();
  await exchangeTokenForSession(idToken);
  return credential;
}

export async function signInWithGitHub(): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  const provider = new GithubAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  const idToken = await credential.user.getIdToken();
  await exchangeTokenForSession(idToken);
  return credential;
}

export async function signInWithFacebook(): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  const provider = new FacebookAuthProvider();
  provider.addScope('public_profile');
  provider.addScope('email');
  const credential = await signInWithPopup(auth, provider);

  // Extract Facebook access token for marketplace Graph API access
  const oauthCredential = FacebookAuthProvider.credentialFromResult(credential);
  const facebookAccessToken = oauthCredential?.accessToken;

  const idToken = await credential.user.getIdToken();
  await exchangeTokenForSession(idToken);

  // Store Facebook marketplace token separately if available
  if (facebookAccessToken) {
    await fetch('/api/auth/facebook/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: facebookAccessToken }),
    });
  }

  return credential;
}

export async function signOut(): Promise<void> {
  // Clear server-side session cookie first
  await fetch('/api/auth/signout', { method: 'POST' });
  // Then sign out from Firebase client
  const auth = getFirebaseAuth();
  await firebaseSignOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  await sendPasswordResetEmail(auth, email);
}
