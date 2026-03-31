// Tests for market-price.ts utility functions (parseEbayPrice, median, parseSoldDate, buildEbaySoldUrl)
// These are pure functions that don't need Playwright mocking

import { parseEbayPrice, median, parseSoldDate, buildEbaySoldUrl } from '../lib/market-price';

describe('parseEbayPrice', () => {
  it('parses standard dollar price', () => {
    expect(parseEbayPrice('$500.00')).toBe(500);
  });

  it('parses price with commas', () => {
    expect(parseEbayPrice('$1,250.99')).toBe(1250.99);
  });

  it('parses price without dollar sign', () => {
    expect(parseEbayPrice('300.50')).toBe(300.5);
  });

  it('parses price with extra text', () => {
    expect(parseEbayPrice('Price: $99.99 USD')).toBe(99.99);
  });

  it('returns 0 for non-numeric string', () => {
    expect(parseEbayPrice('no price here')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(parseEbayPrice('')).toBe(0);
  });

  it('parses integer price without decimals', () => {
    expect(parseEbayPrice('$50')).toBe(50);
  });

  it('handles multiple dollar signs / currency symbols', () => {
    expect(parseEbayPrice('$$100.00')).toBe(100);
  });

  it('handles large prices with multiple commas', () => {
    expect(parseEbayPrice('$10,000,000.00')).toBe(10000000);
  });
});

describe('median', () => {
  it('returns 0 for empty array', () => {
    expect(median([])).toBe(0);
  });

  it('returns the single element for length 1', () => {
    expect(median([42])).toBe(42);
  });

  it('returns middle value for odd-length array', () => {
    expect(median([1, 3, 5])).toBe(3);
  });

  it('returns average of two middle values for even-length array', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('handles unsorted input', () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  it('handles duplicate values', () => {
    expect(median([5, 5, 5, 5])).toBe(5);
  });

  it('handles two elements', () => {
    expect(median([10, 20])).toBe(15);
  });

  it('does not mutate original array', () => {
    const arr = [3, 1, 2];
    median(arr);
    expect(arr).toEqual([3, 1, 2]);
  });
});

describe('parseSoldDate', () => {
  it('returns null for empty string', () => {
    expect(parseSoldDate('')).toBeNull();
  });

  it('returns null for null/undefined-like empty input', () => {
    expect(parseSoldDate('')).toBeNull();
  });

  it('parses "X days ago" format', () => {
    const result = parseSoldDate('3 days ago');
    expect(result).toBeInstanceOf(Date);
    const diff = Math.round((Date.now() - result!.getTime()) / (1000 * 60 * 60 * 24));
    expect(diff).toBe(3);
  });

  it('parses "Xd ago" short format', () => {
    const result = parseSoldDate('5d ago');
    expect(result).toBeInstanceOf(Date);
  });

  it('parses "Xh ago" hours format', () => {
    const result = parseSoldDate('12h ago');
    expect(result).toBeInstanceOf(Date);
    const diffHours = (Date.now() - result!.getTime()) / (1000 * 60 * 60);
    expect(Math.round(diffHours)).toBe(12);
  });

  it('parses "Sold Oct 15, 2024" format (strips "Sold" prefix)', () => {
    const result = parseSoldDate('Sold Oct 15, 2024');
    expect(result).toBeInstanceOf(Date);
    expect(result!.getFullYear()).toBe(2024);
  });

  it('parses "Oct 15, 2024" standard month-day-year format', () => {
    const result = parseSoldDate('Oct 15, 2024');
    expect(result).toBeInstanceOf(Date);
    expect(result!.getFullYear()).toBe(2024);
  });

  it('returns null for unrecognized format', () => {
    expect(parseSoldDate('yesterday')).toBeNull();
    expect(parseSoldDate('some random text')).toBeNull();
  });

  it('returns null for month-day-year that fails Date parse', () => {
    // "Abc 1, 2024" matches the regex /^[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}$/ but
    // new Date('Abc 1, 2024') returns Invalid Date (isNaN check → null)
    const result = parseSoldDate('Abc 1, 2024');
    expect(result).toBeNull();
  });
});

describe('buildEbaySoldUrl', () => {
  it('builds URL with search query', () => {
    const url = buildEbaySoldUrl('iPhone 14');
    expect(url).toContain('ebay.com/sch/i.html');
    expect(url).toContain('_nkw=iPhone+14');
    expect(url).toContain('LH_Complete=1');
    expect(url).toContain('LH_Sold=1');
    expect(url).toContain('_sop=13');
  });

  it('includes category param for known categories', () => {
    const url = buildEbaySoldUrl('controller', 'video games');
    expect(url).toContain('_sacat=1249');
  });

  it('maps electronics category correctly', () => {
    const url = buildEbaySoldUrl('tv', 'electronics');
    expect(url).toContain('_sacat=293');
  });

  it('maps computers category correctly', () => {
    const url = buildEbaySoldUrl('laptop', 'computers');
    expect(url).toContain('_sacat=58058');
  });

  it('maps cell phones category correctly', () => {
    const url = buildEbaySoldUrl('phone', 'cell phones');
    expect(url).toContain('_sacat=15032');
  });

  it('maps collectibles category correctly', () => {
    const url = buildEbaySoldUrl('coin', 'collectibles');
    expect(url).toContain('_sacat=1');
  });

  it('maps tools category correctly', () => {
    const url = buildEbaySoldUrl('drill', 'tools');
    expect(url).toContain('_sacat=631');
  });

  it('maps musical category correctly', () => {
    const url = buildEbaySoldUrl('guitar', 'musical');
    expect(url).toContain('_sacat=619');
  });

  it('maps furniture category correctly', () => {
    const url = buildEbaySoldUrl('desk', 'furniture');
    expect(url).toContain('_sacat=3197');
  });

  it('maps appliances category correctly', () => {
    const url = buildEbaySoldUrl('blender', 'appliances');
    expect(url).toContain('_sacat=20710');
  });

  it('maps sports category correctly', () => {
    const url = buildEbaySoldUrl('bike', 'sports');
    expect(url).toContain('_sacat=888');
  });

  it('ignores unknown category (no _sacat param)', () => {
    const url = buildEbaySoldUrl('item', 'unknown_cat');
    expect(url).not.toContain('_sacat');
  });

  it('handles case-insensitive category matching', () => {
    const url = buildEbaySoldUrl('tv', 'Electronics');
    expect(url).toContain('_sacat=293');
  });

  it('omits category when not provided', () => {
    const url = buildEbaySoldUrl('test');
    expect(url).not.toContain('_sacat');
  });

  it('encodes special characters in query', () => {
    const url = buildEbaySoldUrl('iPhone 14 Pro & Max');
    expect(url).toContain('iPhone+14+Pro+%26+Max');
  });
});
