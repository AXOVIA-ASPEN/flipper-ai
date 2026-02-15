// Value estimation logic for flip opportunities
// Uses keyword matching, category-based multipliers, and generates reference links

export interface EstimationResult {
  estimatedValue: number;
  estimatedLow: number;
  estimatedHigh: number;
  profitPotential: number;
  profitLow: number;
  profitHigh: number;
  valueScore: number;
  discountPercent: number;
  resaleDifficulty: 'VERY_EASY' | 'EASY' | 'MODERATE' | 'HARD' | 'VERY_HARD';
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
  notes: string;
  comparableUrls: ComparableUrl[];
  shippable: boolean;
  negotiable: boolean;
  tags: string[];
}

export interface ComparableUrl {
  platform: string;
  label: string;
  url: string;
  type: 'sold' | 'active' | 'search';
}

// Common product categories with typical resale markup ranges
const CATEGORY_MULTIPLIERS: Record<string, { low: number; high: number; difficulty: number }> = {
  electronics: { low: 1.2, high: 1.6, difficulty: 2 },
  furniture: { low: 1.3, high: 1.8, difficulty: 4 }, // Harder to ship
  appliances: { low: 1.1, high: 1.4, difficulty: 4 },
  tools: { low: 1.3, high: 1.7, difficulty: 2 },
  'video games': { low: 1.4, high: 2.0, difficulty: 1 },
  collectibles: { low: 1.5, high: 2.5, difficulty: 2 },
  clothing: { low: 1.1, high: 1.5, difficulty: 3 },
  sports: { low: 1.2, high: 1.6, difficulty: 3 },
  musical: { low: 1.3, high: 1.7, difficulty: 3 },
  automotive: { low: 1.1, high: 1.4, difficulty: 4 },
  default: { low: 1.2, high: 1.5, difficulty: 3 },
};

// Keywords that indicate higher value items
const VALUE_KEYWORDS = [
  {
    pattern: /apple|iphone|ipad|macbook|airpods/i,
    boost: 1.2,
    label: 'Apple product',
    tag: 'apple',
  },
  { pattern: /samsung|galaxy/i, boost: 1.15, label: 'Samsung', tag: 'samsung' },
  { pattern: /sony|playstation|ps5|ps4/i, boost: 1.2, label: 'Sony/PlayStation', tag: 'sony' },
  { pattern: /nintendo|switch/i, boost: 1.25, label: 'Nintendo', tag: 'nintendo' },
  { pattern: /xbox|microsoft/i, boost: 1.15, label: 'Xbox/Microsoft', tag: 'xbox' },
  { pattern: /dyson/i, boost: 1.3, label: 'Dyson', tag: 'dyson' },
  {
    pattern: /kitchenaid|vitamix/i,
    boost: 1.25,
    label: 'Premium kitchen brand',
    tag: 'premium-kitchen',
  },
  {
    pattern: /herman miller|steelcase/i,
    boost: 1.4,
    label: 'Premium furniture',
    tag: 'premium-furniture',
  },
  { pattern: /pioneer|ddj/i, boost: 1.2, label: 'DJ equipment', tag: 'dj-equipment' },
  { pattern: /vintage|antique|retro/i, boost: 1.4, label: 'Vintage/collectible', tag: 'vintage' },
  {
    pattern: /sealed|new in box|nib|bnib/i,
    boost: 1.3,
    label: 'New/sealed condition',
    tag: 'sealed',
  },
  { pattern: /rare|limited edition/i, boost: 1.4, label: 'Rare/limited', tag: 'rare' },
];

// Keywords that indicate lower value or risk
const RISK_KEYWORDS = [
  {
    pattern: /broken|damaged|parts only|for parts/i,
    penalty: 0.3,
    label: 'For parts only',
    tag: 'for-parts',
  },
  {
    pattern: /needs repair|not working|doesn't work/i,
    penalty: 0.4,
    label: 'Needs repair',
    tag: 'needs-repair',
  },
  {
    pattern: /scratched|dented|worn/i,
    penalty: 0.85,
    label: 'Cosmetic wear',
    tag: 'cosmetic-wear',
  },
  { pattern: /missing|incomplete/i, penalty: 0.6, label: 'Incomplete', tag: 'incomplete' },
  { pattern: /old|used heavily/i, penalty: 0.75, label: 'Heavy use', tag: 'heavy-use' },
];

// Keywords that indicate negotiable pricing
const NEGOTIABLE_KEYWORDS =
  /obo|or best offer|negotiable|make\s*(an\s*)?offer|flexible|willing to negotiate|best offer/i;

// Keywords that indicate local pickup only (not shippable)
const LOCAL_ONLY_KEYWORDS =
  /local pickup|pickup only|no shipping|cash only|must pick up|local only|in person/i;

// Condition multipliers
const CONDITION_MULTIPLIERS: Record<string, number> = {
  new: 1.0,
  'like new': 0.92,
  excellent: 0.85,
  good: 0.75,
  fair: 0.6,
  poor: 0.4,
};

// Resale difficulty levels
const DIFFICULTY_LABELS: Record<number, 'VERY_EASY' | 'EASY' | 'MODERATE' | 'HARD' | 'VERY_HARD'> =
  {
    1: 'VERY_EASY',
    2: 'EASY',
    3: 'MODERATE',
    4: 'HARD',
    5: 'VERY_HARD',
  };

// Generate search query for a product
function generateSearchQuery(title: string): string {
  const fillerWords =
    /\b(the|a|an|and|or|for|with|in|on|at|to|of|is|it|this|that|will|can|be|has|have|was|are|were|just|very|really|new|used|great|good|nice|excellent|condition)\b/gi;
  const query = title.replace(fillerWords, ' ').replace(/\s+/g, ' ').trim();
  const words = query
    .split(' ')
    .filter((w) => w.length > 2)
    .slice(0, 6);
  return words.join(' ');
}

// Generate eBay sold listings URL
function getEbaySoldUrl(title: string): string {
  const query = encodeURIComponent(generateSearchQuery(title));
  return `https://www.ebay.com/sch/i.html?_nkw=${query}&LH_Complete=1&LH_Sold=1&_sop=13`;
}

// Generate eBay active listings URL
function getEbayActiveUrl(title: string): string {
  const query = encodeURIComponent(generateSearchQuery(title));
  return `https://www.ebay.com/sch/i.html?_nkw=${query}&_sop=15`;
}

// Generate Facebook Marketplace search URL
function getFacebookMarketplaceUrl(title: string): string {
  const query = encodeURIComponent(generateSearchQuery(title));
  return `https://www.facebook.com/marketplace/search/?query=${query}`;
}

// Generate Mercari search URL
function getMercariUrl(title: string): string {
  const query = encodeURIComponent(generateSearchQuery(title));
  return `https://www.mercari.com/search/?keyword=${query}`;
}

export function estimateValue(
  title: string,
  description: string | null,
  askingPrice: number,
  condition: string | null,
  category: string | null
): EstimationResult {
  const fullText = `${title} ${description || ''}`.toLowerCase();

  // Get category multiplier range
  const categoryKey = category?.toLowerCase() || 'default';
  const categoryData = CATEGORY_MULTIPLIERS[categoryKey] || CATEGORY_MULTIPLIERS.default;

  // Apply condition multiplier
  const conditionKey = condition?.toLowerCase() || 'good';
  const conditionMultiplier = CONDITION_MULTIPLIERS[conditionKey] || 0.75;

  // Check for value-adding keywords
  let valueBoost = 1.0;
  const valueMatches: string[] = [];
  const tags: string[] = [categoryKey];

  for (const { pattern, boost, label, tag } of VALUE_KEYWORDS) {
    if (pattern.test(fullText)) {
      valueBoost *= boost;
      valueMatches.push(label);
      tags.push(tag);
    }
  }

  // Check for risk keywords
  let riskPenalty = 1.0;
  const riskMatches: string[] = [];
  let difficultyAdjust = 0;

  for (const { pattern, penalty, label, tag } of RISK_KEYWORDS) {
    if (pattern.test(fullText)) {
      riskPenalty *= penalty;
      riskMatches.push(label);
      tags.push(tag);
      difficultyAdjust += 1;
    }
  }

  // Check if negotiable
  const negotiable = NEGOTIABLE_KEYWORDS.test(fullText);
  if (negotiable) tags.push('negotiable');

  // Check if shippable
  const shippable = !LOCAL_ONLY_KEYWORDS.test(fullText);
  if (!shippable) {
    tags.push('local-only');
    difficultyAdjust += 1;
  }

  // Calculate estimated market value range
  const baseLow = askingPrice * categoryData.low * conditionMultiplier * valueBoost * riskPenalty;
  const baseHigh = askingPrice * categoryData.high * conditionMultiplier * valueBoost * riskPenalty;

  const estimatedLow = Math.round(baseLow);
  const estimatedHigh = Math.round(baseHigh);
  const estimatedValue = Math.round((baseLow + baseHigh) / 2);

  // Calculate discount percentage (how far below market value)
  const discountPercent = Math.round(((estimatedValue - askingPrice) / estimatedValue) * 100);

  // Calculate profit potential (accounting for ~13% platform fees on eBay/Mercari)
  const feeRate = 0.13;
  const profitLow = Math.round(estimatedLow * (1 - feeRate) - askingPrice);
  const profitHigh = Math.round(estimatedHigh * (1 - feeRate) - askingPrice);
  const profitPotential = Math.round((profitLow + profitHigh) / 2);

  // Calculate value score (0-100)
  const profitMargin = profitPotential / askingPrice;
  let valueScore = Math.min(100, Math.max(0, Math.round(profitMargin * 100 + 50)));

  // Adjust score based on absolute profit
  if (profitPotential < 10) valueScore = Math.min(valueScore, 30);
  if (profitPotential < 0) valueScore = Math.min(valueScore, 10);
  if (profitPotential > 100) valueScore = Math.min(100, valueScore + 10);
  if (profitPotential > 200) valueScore = Math.min(100, valueScore + 10);

  // Calculate resale difficulty
  let difficultyLevel = categoryData.difficulty + difficultyAdjust;
  if (valueMatches.length > 0) difficultyLevel -= 1; // Known brands are easier
  difficultyLevel = Math.max(1, Math.min(5, difficultyLevel));
  const resaleDifficulty = DIFFICULTY_LABELS[difficultyLevel];

  // Determine confidence level
  let confidence: 'low' | 'medium' | 'high' = 'medium';
  if (valueMatches.length > 0 && riskMatches.length === 0) {
    confidence = 'high';
  } else if (riskMatches.length > 0) {
    confidence = 'low';
  }

  // Generate reasoning
  const reasons: string[] = [];
  reasons.push(
    `IMPORTANT: These are algorithmic estimates. Check the reference links for actual sold prices.`
  );
  reasons.push(`Category: ${categoryKey} (${categoryData.low}x - ${categoryData.high}x markup)`);
  reasons.push(`Condition factor: ${conditionMultiplier}x`);
  if (valueMatches.length > 0) {
    reasons.push(`Value indicators: ${valueMatches.join(', ')}`);
  }
  if (riskMatches.length > 0) {
    reasons.push(`Risk factors: ${riskMatches.join(', ')}`);
  }
  reasons.push(`Platform fees estimated at 13%`);

  // Generate notes (AI-style analysis)
  const notes: string[] = [];
  if (valueMatches.length > 0) {
    notes.push(`${valueMatches.join(' and ')} detected - typically holds value well.`);
  }
  if (discountPercent >= 50) {
    notes.push(
      `Listed at ${discountPercent}% below estimated market value - strong flip potential.`
    );
  } else if (discountPercent >= 30) {
    notes.push(`Decent discount at ${discountPercent}% below market.`);
  }
  if (negotiable) {
    notes.push(`Price appears negotiable - could get better deal.`);
  }
  if (!shippable) {
    notes.push(`Local pickup only - limits resale options to local platforms.`);
  }
  if (riskMatches.length > 0) {
    notes.push(`Caution: ${riskMatches.join(', ')} - factor into resale price.`);
  }
  if (notes.length === 0) {
    notes.push(`Standard listing with average flip potential.`);
  }

  // Generate comparable URLs
  const comparableUrls: ComparableUrl[] = [
    {
      platform: 'eBay',
      label: 'eBay Sold Listings (verify actual prices here!)',
      url: getEbaySoldUrl(title),
      type: 'sold',
    },
    {
      platform: 'eBay',
      label: 'eBay Active Listings',
      url: getEbayActiveUrl(title),
      type: 'active',
    },
    {
      platform: 'Facebook',
      label: 'Facebook Marketplace',
      url: getFacebookMarketplaceUrl(title),
      type: 'search',
    },
    {
      platform: 'Mercari',
      label: 'Mercari Listings',
      url: getMercariUrl(title),
      type: 'search',
    },
  ];

  return {
    estimatedValue,
    estimatedLow,
    estimatedHigh,
    profitPotential,
    profitLow,
    profitHigh,
    valueScore,
    discountPercent,
    resaleDifficulty,
    confidence,
    reasoning: reasons.join(' | '),
    notes: notes.join(' '),
    comparableUrls,
    shippable,
    negotiable,
    tags,
  };
}

// Generate a purchase request message to send to seller
export function generatePurchaseMessage(
  title: string,
  askingPrice: number,
  negotiable: boolean,
  sellerName?: string | null
): string {
  const greeting = sellerName ? `Hi ${sellerName},` : 'Hi,';
  const itemRef = title.length > 50 ? title.substring(0, 47) + '...' : title;

  if (negotiable) {
    // Offer slightly below asking if negotiable
    const offerPrice = Math.round(askingPrice * 0.85);
    return `${greeting}

I'm interested in your ${itemRef} listing. Is this item still available?

Would you consider $${offerPrice} for it? I can pick up today/tomorrow and pay cash.

Thanks!`;
  } else {
    return `${greeting}

I'm interested in your ${itemRef} listing for $${askingPrice}. Is this item still available?

I can pick up at your convenience and pay cash. Please let me know!

Thanks!`;
  }
}

// Determine the best category based on title/description
export function detectCategory(title: string, description: string | null): string {
  const fullText = `${title} ${description || ''}`.toLowerCase();

  const categoryPatterns: [string, RegExp][] = [
    // Musical first - DJ equipment and instruments (before video games due to "controller")
    ['musical', /guitar|piano|keyboard|drum|amp|amplifier|instrument|dj\b|ddj|pioneer\s*ddj/],
    // Video games next - consoles and gaming (before electronics due to "console", "controller")
    ['video games', /playstation|xbox|nintendo|game\b|ps5|ps4|switch|wii/],
    // Electronics - general tech items
    [
      'electronics',
      /phone|ipad|laptop|computer|tablet|tv|monitor|camera|speaker|headphone|gaming|console/,
    ],
    ['furniture', /couch|sofa|table|chair|desk|bed|dresser|cabinet|shelf/],
    ['appliances', /washer|dryer|refrigerator|fridge|dishwasher|microwave|oven|vacuum/],
    ['tools', /drill|saw|wrench|hammer|power tool|dewalt|milwaukee|makita/],
    ['collectibles', /vintage|antique|collectible|rare|limited|comic|card|coin/],
    ['clothing', /shirt|pants|dress|shoes|jacket|coat|clothing|fashion/],
    ['sports', /bike|bicycle|golf|tennis|fitness|gym|weights|treadmill/],
    ['automotive', /car|truck|motorcycle|parts|tire|wheel|engine/],
  ];

  for (const [category, pattern] of categoryPatterns) {
    if (pattern.test(fullText)) {
      return category;
    }
  }

  return 'other';
}
