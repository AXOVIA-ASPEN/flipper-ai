'use client';

import { useAuthContext } from '@/components/providers/FirebaseAuthProvider';
import {
  signInWithEmail,
  signUpWithEmail,
  signOut,
  signInWithGoogle,
  signInWithGitHub,
  signInWithFacebook,
} from '@/lib/firebase/auth';

export function useFirebaseAuth() {
  const { user, loading } = useAuthContext();

  return {
    user,
    loading,
    signIn: signInWithEmail,
    signUp: signUpWithEmail,
    signOut,
    signInWithGoogle,
    signInWithGitHub,
    signInWithFacebook,
  };
}
