/**
 * @jest-environment jsdom
 */

/**
 * Tests for useFilterParams hook
 * @author Stephen Boyett
 */

import { renderHook, act } from '@testing-library/react';

// Mock next/navigation
const mockPush = jest.fn();
const mockGet = jest.fn();
const mockSearchParams = { get: mockGet };

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/opportunities',
}));

import { useFilterParams } from '@/hooks/useFilterParams';

describe('useFilterParams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReturnValue(null);
  });

  it('returns default filter values when no search params', () => {
    const { result } = renderHook(() => useFilterParams());

    expect(result.current.filters).toEqual({
      status: 'all',
      location: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      dateFrom: '',
      dateTo: '',
      platform: 'all',
      minScore: '',
      maxScore: '',
      minProfit: '',
      maxProfit: '',
    });
    expect(result.current.activeFilterCount).toBe(0);
  });

  it('reads filters from URL search params', () => {
    mockGet.mockImplementation((key: string) => {
      const params: Record<string, string> = {
        status: 'active',
        location: 'NYC',
        minPrice: '50',
      };
      return params[key] || null;
    });

    const { result } = renderHook(() => useFilterParams());

    expect(result.current.filters.status).toBe('active');
    expect(result.current.filters.location).toBe('NYC');
    expect(result.current.filters.minPrice).toBe('50');
    expect(result.current.activeFilterCount).toBe(3);
  });

  it('setFilter updates a single filter and pushes URL', () => {
    const { result } = renderHook(() => useFilterParams());

    act(() => {
      result.current.setFilter('category', 'electronics');
    });

    expect(mockPush).toHaveBeenCalledWith('/opportunities?category=electronics', { scroll: false });
  });

  it('setFilters updates multiple filters at once', () => {
    const { result } = renderHook(() => useFilterParams());

    act(() => {
      result.current.setFilters({ minPrice: '10', maxPrice: '100' });
    });

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('minPrice=10'), {
      scroll: false,
    });
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('maxPrice=100'), {
      scroll: false,
    });
  });

  it('clearFilters resets to defaults', () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'status') return 'active';
      return null;
    });

    const { result } = renderHook(() => useFilterParams());

    act(() => {
      result.current.clearFilters();
    });

    expect(mockPush).toHaveBeenCalledWith('/opportunities', { scroll: false });
  });

  it('does not include status=all in URL params', () => {
    const { result } = renderHook(() => useFilterParams());

    act(() => {
      result.current.setFilter('status', 'all');
    });

    const url = mockPush.mock.calls[0][0];
    expect(url).not.toContain('status=all');
  });

  it('counts active filters correctly excluding default status', () => {
    mockGet.mockImplementation((key: string) => {
      const params: Record<string, string> = {
        status: 'all',
        location: 'LA',
        dateFrom: '2026-01-01',
        dateTo: '2026-02-01',
      };
      return params[key] || null;
    });

    const { result } = renderHook(() => useFilterParams());
    // status=all doesn't count, but location + dateFrom + dateTo = 3
    expect(result.current.activeFilterCount).toBe(3);
  });
});
