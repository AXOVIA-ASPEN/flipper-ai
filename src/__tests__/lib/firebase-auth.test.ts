/**
 * Tests for lib/firebase/auth.ts - Firebase Auth Client Helpers
 *
 * Verifies all authentication flows: email sign-in/sign-up, OAuth providers
 * (Google, GitHub, Facebook), sign-out, password reset, and session token
 * exchange with the backend.
 */

// --- Firebase auth mocks (must be declared before jest.mock) ---

const mockGetAuth = jest.fn();
const mockSignInWithEmailAndPassword = jest.fn();
const mockCreateUserWithEmailAndPassword = jest.fn();
const mockSignInWithPopup = jest.fn();
const mockFirebaseSignOut = jest.fn();
const mockSendPasswordResetEmail = jest.fn();
const mockSendEmailVerification = jest.fn();
const mockSetPersistence = jest.fn();

const mockFacebookCredentialFromResult = jest.fn();

// Provider constructors need addScope on instances.
// We use prototype-based mocking so `new Provider()` creates objects with mock methods.
const mockAddScope = jest.fn();

function MockGoogleAuthProvider() {}
function MockGithubAuthProvider() {}
function MockFacebookAuthProvider() {
  this.addScope = mockAddScope;
}
(MockFacebookAuthProvider as any).credentialFromResult = mockFacebookCredentialFromResult;

jest.mock('firebase/auth', () => ({
  getAuth: mockGetAuth,
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
  createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword,
  signInWithPopup: mockSignInWithPopup,
  signOut: mockFirebaseSignOut,
  sendPasswordResetEmail: mockSendPasswordResetEmail,
  sendEmailVerification: mockSendEmailVerification,
  GoogleAuthProvider: MockGoogleAuthProvider,
  GithubAuthProvider: MockGithubAuthProvider,
  FacebookAuthProvider: MockFacebookAuthProvider,
  inMemoryPersistence: 'NONE',
  setPersistence: mockSetPersistence,
}));

jest.mock('@/lib/firebase/config', () => ({ firebaseApp: {} }));

// --- Helpers ---

function createMockUserCredential(idToken = 'mock-id-token-abc123') {
  return {
    user: {
      uid: 'user-123',
      email: 'test@example.com',
      getIdToken: jest.fn().mockResolvedValue(idToken),
    },
    providerId: null,
    operationType: 'signIn',
  };
}

function mockFetchOk() {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue({}),
  });
}

function mockFetchError(detail?: string) {
  const body = detail ? { error: { detail } } : {};
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: false,
    json: jest.fn().mockResolvedValue(body),
  });
}

function mockFetchErrorJsonFails() {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: false,
    json: jest.fn().mockRejectedValue(new Error('invalid json')),
  });
}

// --- Test suite ---

describe('lib/firebase/auth', () => {
  let authModule: typeof import('@/lib/firebase/auth');
  const mockAuthInstance = { name: 'mock-auth' };

  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn();
    mockGetAuth.mockReturnValue(mockAuthInstance);
    mockSetPersistence.mockResolvedValue(undefined);
    mockFirebaseSignOut.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * We need a fresh module import for singleton tests, but can reuse
   * for everything else to keep the suite fast.
   */
  function freshImport() {
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@/lib/firebase/auth') as typeof import('@/lib/firebase/auth');
  }

  // ----------------------------------------------------------------
  // getFirebaseAuth()
  // ----------------------------------------------------------------
  describe('getFirebaseAuth()', () => {
    it('should call getAuth and setPersistence on first invocation', () => {
      authModule = freshImport();

      const result = authModule.getFirebaseAuth();

      expect(mockGetAuth).toHaveBeenCalledTimes(1);
      expect(mockSetPersistence).toHaveBeenCalledTimes(1);
      expect(mockSetPersistence).toHaveBeenCalledWith(mockAuthInstance, 'NONE');
      expect(result).toBe(mockAuthInstance);
    });

    it('should return the cached singleton on subsequent calls', () => {
      authModule = freshImport();

      const first = authModule.getFirebaseAuth();
      const second = authModule.getFirebaseAuth();
      const third = authModule.getFirebaseAuth();

      expect(first).toBe(second);
      expect(second).toBe(third);
      expect(mockGetAuth).toHaveBeenCalledTimes(1);
      expect(mockSetPersistence).toHaveBeenCalledTimes(1);
    });
  });

  // ----------------------------------------------------------------
  // signInWithEmail()
  // ----------------------------------------------------------------
  describe('signInWithEmail()', () => {
    beforeEach(() => {
      authModule = freshImport();
    });

    it('should sign in with email/password and exchange token for session', async () => {
      const mockCred = createMockUserCredential();
      mockSignInWithEmailAndPassword.mockResolvedValue(mockCred);
      mockFetchOk();

      const result = await authModule.signInWithEmail('user@test.com', 'password123');

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuthInstance,
        'user@test.com',
        'password123'
      );
      expect(mockCred.user.getIdToken).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'mock-id-token-abc123' }),
      });
      expect(result).toBe(mockCred);
    });

    it('should propagate Firebase auth errors', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue(
        new Error('auth/wrong-password')
      );

      await expect(
        authModule.signInWithEmail('user@test.com', 'wrong')
      ).rejects.toThrow('auth/wrong-password');
    });

    it('should throw when session exchange fails with error detail', async () => {
      const mockCred = createMockUserCredential();
      mockSignInWithEmailAndPassword.mockResolvedValue(mockCred);
      mockFetchError('Session creation rate limited');

      await expect(
        authModule.signInWithEmail('user@test.com', 'password123')
      ).rejects.toThrow('Session creation rate limited');
    });

    it('should throw fallback message when session exchange fails without detail', async () => {
      const mockCred = createMockUserCredential();
      mockSignInWithEmailAndPassword.mockResolvedValue(mockCred);
      mockFetchError();

      await expect(
        authModule.signInWithEmail('user@test.com', 'password123')
      ).rejects.toThrow('Failed to create session');
    });

    it('should throw fallback message when response.json() rejects', async () => {
      const mockCred = createMockUserCredential();
      mockSignInWithEmailAndPassword.mockResolvedValue(mockCred);
      mockFetchErrorJsonFails();

      await expect(
        authModule.signInWithEmail('user@test.com', 'password123')
      ).rejects.toThrow('Failed to create session');
    });
  });

  // ----------------------------------------------------------------
  // signUpWithEmail()
  // ----------------------------------------------------------------
  describe('signUpWithEmail()', () => {
    beforeEach(() => {
      authModule = freshImport();
    });

    it('should create account, send verification email, and exchange token', async () => {
      const mockCred = createMockUserCredential();
      mockCreateUserWithEmailAndPassword.mockResolvedValue(mockCred);
      mockSendEmailVerification.mockResolvedValue(undefined);
      mockFetchOk();

      const result = await authModule.signUpWithEmail('new@test.com', 'secureP@ss1');

      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuthInstance,
        'new@test.com',
        'secureP@ss1'
      );
      expect(mockSendEmailVerification).toHaveBeenCalledWith(mockCred.user);
      expect(mockCred.user.getIdToken).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'mock-id-token-abc123' }),
      });
      expect(result).toBe(mockCred);
    });

    it('should propagate account creation errors', async () => {
      mockCreateUserWithEmailAndPassword.mockRejectedValue(
        new Error('auth/email-already-in-use')
      );

      await expect(
        authModule.signUpWithEmail('existing@test.com', 'pass')
      ).rejects.toThrow('auth/email-already-in-use');
    });

    it('should throw when session exchange fails after sign-up', async () => {
      const mockCred = createMockUserCredential();
      mockCreateUserWithEmailAndPassword.mockResolvedValue(mockCred);
      mockSendEmailVerification.mockResolvedValue(undefined);
      mockFetchError('Server error');

      await expect(
        authModule.signUpWithEmail('new@test.com', 'pass')
      ).rejects.toThrow('Server error');
    });
  });

  // ----------------------------------------------------------------
  // signInWithGoogle()
  // ----------------------------------------------------------------
  describe('signInWithGoogle()', () => {
    beforeEach(() => {
      authModule = freshImport();
    });

    it('should sign in with Google provider and exchange token', async () => {
      const mockCred = createMockUserCredential();
      mockSignInWithPopup.mockResolvedValue(mockCred);
      mockFetchOk();

      const result = await authModule.signInWithGoogle();

      expect(mockSignInWithPopup).toHaveBeenCalledWith(
        mockAuthInstance,
        expect.any(Object)
      );
      expect(mockCred.user.getIdToken).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'mock-id-token-abc123' }),
      });
      expect(result).toBe(mockCred);
    });

    it('should propagate popup errors (e.g., user cancelled)', async () => {
      mockSignInWithPopup.mockRejectedValue(new Error('auth/popup-closed-by-user'));

      await expect(authModule.signInWithGoogle()).rejects.toThrow(
        'auth/popup-closed-by-user'
      );
    });
  });

  // ----------------------------------------------------------------
  // signInWithGitHub()
  // ----------------------------------------------------------------
  describe('signInWithGitHub()', () => {
    beforeEach(() => {
      authModule = freshImport();
    });

    it('should sign in with GitHub provider and exchange token', async () => {
      const mockCred = createMockUserCredential();
      mockSignInWithPopup.mockResolvedValue(mockCred);
      mockFetchOk();

      const result = await authModule.signInWithGitHub();

      expect(mockSignInWithPopup).toHaveBeenCalledWith(
        mockAuthInstance,
        expect.any(Object)
      );
      expect(mockCred.user.getIdToken).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'mock-id-token-abc123' }),
      });
      expect(result).toBe(mockCred);
    });

    it('should propagate GitHub OAuth errors', async () => {
      mockSignInWithPopup.mockRejectedValue(
        new Error('auth/account-exists-with-different-credential')
      );

      await expect(authModule.signInWithGitHub()).rejects.toThrow(
        'auth/account-exists-with-different-credential'
      );
    });
  });

  // ----------------------------------------------------------------
  // signInWithFacebook()
  // ----------------------------------------------------------------
  describe('signInWithFacebook()', () => {
    beforeEach(() => {
      authModule = freshImport();
    });

    it('should sign in with Facebook, add scopes, exchange token, and store FB token', async () => {
      const mockCred = createMockUserCredential();
      mockSignInWithPopup.mockResolvedValue(mockCred);
      mockFacebookCredentialFromResult.mockReturnValue({
        accessToken: 'fb-access-token-xyz',
      });
      mockFetchOk();

      const result = await authModule.signInWithFacebook();

      // Verify scopes were added to the FacebookAuthProvider instance
      expect(mockAddScope).toHaveBeenCalledWith('public_profile');
      expect(mockAddScope).toHaveBeenCalledWith('email');

      // Verify signInWithPopup was called with auth and a FacebookAuthProvider instance
      expect(mockSignInWithPopup).toHaveBeenCalledWith(
        mockAuthInstance,
        expect.any(MockFacebookAuthProvider)
      );
      expect(mockFacebookCredentialFromResult).toHaveBeenCalledWith(mockCred);

      // Verify session exchange call
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'mock-id-token-abc123' }),
      });

      // Verify Facebook token storage call
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/facebook/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: 'fb-access-token-xyz' }),
      });

      expect(result).toBe(mockCred);
    });

    it('should skip storing FB token when oauthCredential is null', async () => {
      const mockCred = createMockUserCredential();
      mockSignInWithPopup.mockResolvedValue(mockCred);
      mockFacebookCredentialFromResult.mockReturnValue(null);
      mockFetchOk();

      const result = await authModule.signInWithFacebook();

      // Session exchange should still happen
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/session', expect.any(Object));

      // Facebook token storage should NOT happen
      expect(global.fetch).not.toHaveBeenCalledWith(
        '/api/auth/facebook/token',
        expect.any(Object)
      );

      expect(result).toBe(mockCred);
    });

    it('should skip storing FB token when accessToken is undefined', async () => {
      const mockCred = createMockUserCredential();
      mockSignInWithPopup.mockResolvedValue(mockCred);
      mockFacebookCredentialFromResult.mockReturnValue({
        accessToken: undefined,
      });
      mockFetchOk();

      await authModule.signInWithFacebook();

      expect(global.fetch).not.toHaveBeenCalledWith(
        '/api/auth/facebook/token',
        expect.any(Object)
      );
    });
  });

  // ----------------------------------------------------------------
  // signOut()
  // ----------------------------------------------------------------
  describe('signOut()', () => {
    beforeEach(() => {
      authModule = freshImport();
    });

    it('should call signout endpoint first, then firebase signOut', async () => {
      mockFetchOk();

      await authModule.signOut();

      // Verify server-side signout was called
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/signout', {
        method: 'POST',
      });

      // Verify Firebase client signOut was called
      expect(mockFirebaseSignOut).toHaveBeenCalledWith(mockAuthInstance);

      // Verify ordering: fetch was called before firebaseSignOut
      const fetchCallOrder = (global.fetch as jest.Mock).mock.invocationCallOrder[0];
      const signOutCallOrder = mockFirebaseSignOut.mock.invocationCallOrder[0];
      expect(fetchCallOrder).toBeLessThan(signOutCallOrder);
    });

    it('should propagate fetch errors during signOut', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(authModule.signOut()).rejects.toThrow('Network error');
    });
  });

  // ----------------------------------------------------------------
  // resetPassword()
  // ----------------------------------------------------------------
  describe('resetPassword()', () => {
    beforeEach(() => {
      authModule = freshImport();
    });

    it('should call sendPasswordResetEmail with the correct auth and email', async () => {
      mockSendPasswordResetEmail.mockResolvedValue(undefined);

      await authModule.resetPassword('forgot@test.com');

      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        mockAuthInstance,
        'forgot@test.com'
      );
    });

    it('should propagate errors from sendPasswordResetEmail', async () => {
      mockSendPasswordResetEmail.mockRejectedValue(
        new Error('auth/user-not-found')
      );

      await expect(authModule.resetPassword('no-one@test.com')).rejects.toThrow(
        'auth/user-not-found'
      );
    });
  });

  // ----------------------------------------------------------------
  // exchangeTokenForSession() (tested indirectly)
  // ----------------------------------------------------------------
  describe('exchangeTokenForSession() error handling', () => {
    beforeEach(() => {
      authModule = freshImport();
    });

    it('should use error.detail from response body when available', async () => {
      const mockCred = createMockUserCredential();
      mockSignInWithEmailAndPassword.mockResolvedValue(mockCred);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: { detail: 'Invalid token format' },
        }),
      });

      await expect(
        authModule.signInWithEmail('user@test.com', 'pass')
      ).rejects.toThrow('Invalid token format');
    });

    it('should fall back to default message when error has no detail', async () => {
      const mockCred = createMockUserCredential();
      mockSignInWithEmailAndPassword.mockResolvedValue(mockCred);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: {} }),
      });

      await expect(
        authModule.signInWithEmail('user@test.com', 'pass')
      ).rejects.toThrow('Failed to create session');
    });

    it('should fall back to default message when response body is empty', async () => {
      const mockCred = createMockUserCredential();
      mockSignInWithEmailAndPassword.mockResolvedValue(mockCred);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({}),
      });

      await expect(
        authModule.signInWithEmail('user@test.com', 'pass')
      ).rejects.toThrow('Failed to create session');
    });

    it('should fall back to default message when response.json() throws', async () => {
      const mockCred = createMockUserCredential();
      mockSignInWithEmailAndPassword.mockResolvedValue(mockCred);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
      });

      await expect(
        authModule.signInWithEmail('user@test.com', 'pass')
      ).rejects.toThrow('Failed to create session');
    });
  });
});
