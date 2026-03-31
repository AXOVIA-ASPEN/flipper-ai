'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';

export interface FilterState {
  status: string;
  location: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  dateFrom: string;
  dateTo: string;
  platform: string;
  minScore: string;
  maxScore: string;
  minProfit: string;
  maxProfit: string;
  page: string;
  limit: string;
  // NEW: multi-select fields (comma-separated values in URL)
  platforms: string; // e.g. "CRAIGSLIST,EBAY"
  categories: string; // e.g. "electronics,furniture"
  statuses: string; // e.g. "IDENTIFIED,PURCHASED"
}

const DEFAULT_FILTERS: FilterState = {
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
};

export interface UseFilterParamsReturn {
  filters: FilterState;
  setFilter: (key: keyof FilterState, value: string) => void;
  setFilters: (newFilters: Partial<FilterState>) => void;
  clearFilters: () => void;
  activeFilterCount: number;
}

export function useFilterParams(): UseFilterParamsReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read current filters from URL
  const filters: FilterState = useMemo(
    () => ({
      status: searchParams.get('status') || DEFAULT_FILTERS.status,
      location: searchParams.get('location') || DEFAULT_FILTERS.location,
      category: searchParams.get('category') || DEFAULT_FILTERS.category,
      minPrice: searchParams.get('minPrice') || DEFAULT_FILTERS.minPrice,
      maxPrice: searchParams.get('maxPrice') || DEFAULT_FILTERS.maxPrice,
      dateFrom: searchParams.get('dateFrom') || DEFAULT_FILTERS.dateFrom,
      dateTo: searchParams.get('dateTo') || DEFAULT_FILTERS.dateTo,
      platform: searchParams.get('platform') || DEFAULT_FILTERS.platform,
      minScore: searchParams.get('minScore') || DEFAULT_FILTERS.minScore,
      maxScore: searchParams.get('maxScore') || DEFAULT_FILTERS.maxScore,
      minProfit: searchParams.get('minProfit') || DEFAULT_FILTERS.minProfit,
      maxProfit: searchParams.get('maxProfit') || DEFAULT_FILTERS.maxProfit,
      page: searchParams.get('page') || DEFAULT_FILTERS.page,
      limit: searchParams.get('limit') || DEFAULT_FILTERS.limit,
      platforms: searchParams.get('platforms') || DEFAULT_FILTERS.platforms,
      categories: searchParams.get('categories') || DEFAULT_FILTERS.categories,
      statuses: searchParams.get('statuses') || DEFAULT_FILTERS.statuses,
    }),
    [searchParams]
  );

  // Calculate active filter count (excluding "all" status, default page/limit)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status && filters.status !== 'all') count++;
    if (filters.location) count++;
    if (filters.category) count++;
    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.platform && filters.platform !== 'all') count++;
    if (filters.minScore) count++;
    if (filters.maxScore) count++;
    if (filters.minProfit) count++;
    if (filters.maxProfit) count++;
    if (filters.platforms) count++;
    if (filters.categories) count++;
    if (filters.statuses) count++;
    return count;
  }, [filters]);

  // Update URL with new params
  const updateURL = useCallback(
    (newFilters: FilterState) => {
      const params = new URLSearchParams();

      // Only add non-default values to URL
      if (newFilters.status && newFilters.status !== 'all') {
        params.set('status', newFilters.status);
      }
      if (newFilters.location) params.set('location', newFilters.location);
      if (newFilters.category) params.set('category', newFilters.category);
      if (newFilters.minPrice) params.set('minPrice', newFilters.minPrice);
      if (newFilters.maxPrice) params.set('maxPrice', newFilters.maxPrice);
      if (newFilters.dateFrom) params.set('dateFrom', newFilters.dateFrom);
      if (newFilters.dateTo) params.set('dateTo', newFilters.dateTo);
      if (newFilters.platform && newFilters.platform !== 'all') {
        params.set('platform', newFilters.platform);
      }
      if (newFilters.minScore) params.set('minScore', newFilters.minScore);
      if (newFilters.maxScore) params.set('maxScore', newFilters.maxScore);
      if (newFilters.minProfit) params.set('minProfit', newFilters.minProfit);
      if (newFilters.maxProfit) params.set('maxProfit', newFilters.maxProfit);
      if (newFilters.page && newFilters.page !== '1') params.set('page', newFilters.page);
      if (newFilters.limit && newFilters.limit !== '20') params.set('limit', newFilters.limit);
      if (newFilters.platforms) params.set('platforms', newFilters.platforms);
      if (newFilters.categories) params.set('categories', newFilters.categories);
      if (newFilters.statuses) params.set('statuses', newFilters.statuses);

      const queryString = params.toString();
      const newURL = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(newURL, { scroll: false });
    },
    [pathname, router]
  );

  // Set a single filter
  const setFilter = useCallback(
    (key: keyof FilterState, value: string) => {
      const newFilters = { ...filters, [key]: value };
      updateURL(newFilters);
    },
    [filters, updateURL]
  );

  // Set multiple filters at once
  const setFilters = useCallback(
    (newFilters: Partial<FilterState>) => {
      const merged = { ...filters, ...newFilters };
      updateURL(merged);
    },
    [filters, updateURL]
  );

  // Clear all filters to defaults
  const clearFilters = useCallback(() => {
    updateURL(DEFAULT_FILTERS);
  }, [updateURL]);

  return {
    filters,
    setFilter,
    setFilters,
    clearFilters,
    activeFilterCount,
  };
}

/**
 * Toggles a value in a comma-separated filter string.
 * Returns the new comma-separated string.
 */
export function toggleMultiSelectValue(current: string, value: string): string {
  const values = current ? current.split(',').filter(Boolean) : [];
  const idx = values.indexOf(value);
  if (idx === -1) {
    return [...values, value].join(',');
  }
  return values.filter((v) => v !== value).join(',');
}

/**
 * Returns whether a value is active in a comma-separated filter string.
 */
export function isMultiSelectActive(current: string, value: string): boolean {
  return current ? current.split(',').filter(Boolean).includes(value) : false;
}
