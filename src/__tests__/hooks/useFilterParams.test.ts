/**
 * @jest-environment jsdom
 */

/**
 * Tests for useFilterParams hook and multi-select helpers
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

import {
  useFilterParams,
  toggleMultiSelectValue,
  isMultiSelectActive,
} from '@/hooks/useFilterParams';

describe('toggleMultiSelectValue', () => {
  it('adds value to empty string', () => {
    expect(toggleMultiSelectValue('', 'EBAY')).toBe('EBAY');
  });

  it('adds value to existing values', () => {
    expect(toggleMultiSelectValue('CRAIGSLIST', 'EBAY')).toBe('CRAIGSLIST,EBAY');
  });

  it('removes value when already present', () => {
    expect(toggleMultiSelectValue('CRAIGSLIST,EBAY', 'CRAIGSLIST')).toBe('EBAY');
  });

  it('returns empty string when removing last value', () => {
    expect(toggleMultiSelectValue('EBAY', 'EBAY')).toBe('');
  });

  it('handles multiple existing values', () => {
    expect(toggleMultiSelectValue('CRAIGSLIST,EBAY,MERCARI', 'EBAY')).toBe('CRAIGSLIST,MERCARI');
  });
});

describe('isMultiSelectActive', () => {
  it('returns true when value is present', () => {
    expect(isMultiSelectActive('CRAIGSLIST,EBAY', 'EBAY')).toBe(true);
  });

  it('returns false when value is not present', () => {
    expect(isMultiSelectActive('CRAIGSLIST,EBAY', 'MERCARI')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isMultiSelectActive('', 'EBAY')).toBe(false);
  });

  it('returns true for single value match', () => {
    expect(isMultiSelectActive('CRAIGSLIST', 'CRAIGSLIST')).toBe(true);
  });
});

describe('useFilterParams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReturnValue(null);
  });

  it('returns default filter values including new multi-select fields', () => {
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
      page: '1',
      limit: '20',
      platforms: '',
      categories: '',
      statuses: '',
    });
    expect(result.current.activeFilterCount).toBe(0);
  });

  it('reads multi-select filters from URL search params', () => {
    mockGet.mockImplementation((key: string) => {
      const params: Record<string, string> = {
        platforms: 'CRAIGSLIST,EBAY',
        categories: 'electronics,tools',
        statuses: 'IDENTIFIED,PURCHASED',
      };
      return params[key] || null;
    });

    const { result } = renderHook(() => useFilterParams());

    expect(result.current.filters.platforms).toBe('CRAIGSLIST,EBAY');
    expect(result.current.filters.categories).toBe('electronics,tools');
    expect(result.current.filters.statuses).toBe('IDENTIFIED,PURCHASED');
    // 3 multi-select filters active
    expect(result.current.activeFilterCount).toBe(3);
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

  it('setFilter updates platforms and encodes in URL', () => {
    const { result } = renderHook(() => useFilterParams());

    act(() => {
      result.current.setFilter('platforms', 'CRAIGSLIST,EBAY');
    });

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('platforms=CRAIGSLIST%2CEBAY'),
      { scroll: false }
    );
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

  it('clearFilters resets all fields including multi-select to defaults', () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'platforms') return 'CRAIGSLIST,EBAY';
      if (key === 'statuses') return 'IDENTIFIED';
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

  it('counts active multi-select filters correctly', () => {
    mockGet.mockImplementation((key: string) => {
      const params: Record<string, string> = {
        platforms: 'CRAIGSLIST',
        categories: 'electronics,tools',
        statuses: 'IDENTIFIED,PURCHASED',
        location: 'LA',
      };
      return params[key] || null;
    });

    const { result } = renderHook(() => useFilterParams());
    // platforms(1) + categories(1) + statuses(1) + location(1) = 4
    expect(result.current.activeFilterCount).toBe(4);
  });

  it('counts active filters correctly excluding default status and platform', () => {
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
