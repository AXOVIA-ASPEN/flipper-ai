/**
 * Authentication Module
 *
 * Firebase Auth-based authentication helpers.
 * Re-exports session utilities for backward compatibility with existing imports.
 */

export {
  getCurrentUser,
  getCurrentUserId,
  requireAuth,
} from '@/lib/firebase/session';
