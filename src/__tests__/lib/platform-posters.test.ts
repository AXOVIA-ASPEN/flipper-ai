/**
 * file: src/__tests__/lib/platform-posters.test.ts
 * author: Stephen Boyett
 * company: Axovia AI
 * date: 2026-03-31
 * version: 1.0
 * brief: Tests for platform poster stub registration.
 *
 * description:
 *     Verifies ensurePostersRegistered() wires up stubs for all four target
 *     platforms exactly once, is idempotent on subsequent calls, and that
 *     each stub returns { success: false } with a descriptive error.
 */

jest.mock('@/lib/posting-queue-processor', () => ({
  __esModule: true,
  registerPoster: jest.fn(),
}));

import {
  ensurePostersRegistered,
  __resetForTests,
} from '@/lib/platform-posters';
import { registerPoster } from '@/lib/posting-queue-processor';

const mockRegisterPoster = registerPoster as jest.MockedFunction<
  typeof registerPoster
>;

describe('platform-posters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetForTests();
  });

  it('registers stubs for all four supported platforms', () => {
    ensurePostersRegistered();

    expect(mockRegisterPoster).toHaveBeenCalledTimes(4);
    const registeredPlatforms = mockRegisterPoster.mock.calls.map(
      ([platform]) => platform
    );
    expect(registeredPlatforms).toEqual(
      expect.arrayContaining(['EBAY', 'FACEBOOK_MARKETPLACE', 'MERCARI', 'OFFERUP'])
    );
  });

  it('is idempotent — subsequent calls do not re-register', () => {
    ensurePostersRegistered();
    ensurePostersRegistered();
    ensurePostersRegistered();

    // 4 registrations total, not 12
    expect(mockRegisterPoster).toHaveBeenCalledTimes(4);
  });

  it('each stub returns success: false with a descriptive error', async () => {
    ensurePostersRegistered();

    // Stub functions were passed as the second argument to registerPoster
    for (const [platform, poster] of mockRegisterPoster.mock.calls) {
      const result = await poster(
        // Cast through unknown — the stubs never touch these args
        {} as unknown as Parameters<typeof poster>[0],
        {} as unknown as Parameters<typeof poster>[1]
      );
      expect(result.success).toBe(false);
      expect(result.errorMessage).toMatch(/not yet implemented/i);
      // Error message includes a human-readable platform label, not the
      // raw enum key (so users see "eBay", not "EBAY").
      expect(result.errorMessage).not.toContain(platform);
    }
  });

  it('__resetForTests allows re-registration', () => {
    ensurePostersRegistered();
    expect(mockRegisterPoster).toHaveBeenCalledTimes(4);

    __resetForTests();
    ensurePostersRegistered();
    expect(mockRegisterPoster).toHaveBeenCalledTimes(8);
  });
});
