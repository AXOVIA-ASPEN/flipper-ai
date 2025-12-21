// Value estimation logic for flip opportunities
// Uses keyword matching, category-based multipliers, and generates reference links

export interface EstimationResult {
  estimatedValue: number;
  estimatedLow: number;
  estimatedHigh: number;
  profitPotential: number;
  valueScore: number;
  confidence: "low" | "medium" | "high";
  reasoning: string;
  comparableUrls: ComparableUrl[];
}

export interface ComparableUrl {
  platform: string;
  label: string;
  url: string;
  type: "sold" | "active" | "search";
}

// Common product categories with typical resale markup ranges
const CATEGORY_MULTIPLIERS: Record<string, { low: number; high: number }> = {
  electronics: { low: 1.2, high: 1.6 },
  furniture: { low: 1.3, high: 1.8 },
  appliances: { low: 1.1, high: 1.4 },
  tools: { low: 1.3, high: 1.7 },
  "video games": { low: 1.4, high: 2.0 },
  collectibles: { low: 1.5, high: 2.5 },
  clothing: { low: 1.1, high: 1.5 },
  sports: { low: 1.2, high: 1.6 },
  musical: { low: 1.3, high: 1.7 },
  automotive: { low: 1.1, high: 1.4 },
  default: { low: 1.2, high: 1.5 },
};

// Keywords that indicate higher value items
const VALUE_KEYWORDS = [
  { pattern: /apple|iphone|ipad|macbook|airpods/i, boost: 1.2, label: "Apple product" },
  { pattern: /samsung|galaxy/i, boost: 1.15, label: "Samsung" },
  { pattern: /sony|playstation|ps5|ps4/i, boost: 1.2, label: "Sony/PlayStation" },
  { pattern: /nintendo|switch/i, boost: 1.25, label: "Nintendo" },
  { pattern: /xbox|microsoft/i, boost: 1.15, label: "Xbox/Microsoft" },
  { pattern: /dyson/i, boost: 1.3, label: "Dyson" },
  { pattern: /kitchenaid|vitamix/i, boost: 1.25, label: "Premium kitchen brand" },
  { pattern: /herman miller|steelcase/i, boost: 1.4, label: "Premium furniture" },
  { pattern: /pioneer|ddj/i, boost: 1.2, label: "DJ equipment" },
  { pattern: /vintage|antique|retro/i, boost: 1.4, label: "Vintage/collectible" },
  { pattern: /sealed|new in box|nib|bnib/i, boost: 1.3, label: "New/sealed condition" },
  { pattern: /rare|limited edition/i, boost: 1.4, label: "Rare/limited" },
];

// Keywords that indicate lower value or risk
const RISK_KEYWORDS = [
  { pattern: /broken|damaged|parts only|for parts/i, penalty: 0.3, label: "For parts only" },
  { pattern: /needs repair|not working|doesn't work/i, penalty: 0.4, label: "Needs repair" },
  { pattern: /scratched|dented|worn/i, penalty: 0.85, label: "Cosmetic wear" },
  { pattern: /missing|incomplete/i, penalty: 0.6, label: "Incomplete" },
  { pattern: /old|used heavily/i, penalty: 0.75, label: "Heavy use" },
];

// Condition multipliers
const CONDITION_MULTIPLIERS: Record<string, number> = {
  new: 1.0,
  "like new": 0.92,
  excellent: 0.85,
  good: 0.75,
  fair: 0.6,
  poor: 0.4,
};

// Generate search query for a product
function generateSearchQuery(title: string): string {
  // Extract key terms, remove common filler words
  const fillerWords = /\b(the|a|an|and|or|for|with|in|on|at|to|of|is|it|this|that|will|can|be|has|have|was|are|were|just|very|really|new|used|great|good|nice|excellent|condition)\b/gi;
  let query = title.replace(fillerWords, " ").replace(/\s+/g, " ").trim();

  // Limit to first 5-6 meaningful words
  const words = query.split(" ").filter((w) => w.length > 2).slice(0, 6);
  return words.join(" ");
}

// Generate eBay sold listings URL
function getEbaySoldUrl(title: string): string {
  const query = encodeURIComponent(generateSearchQuery(title));
  // LH_Complete=1 and LH_Sold=1 filter for sold items only
  return `https://www.ebay.com/sch/i.html?_nkw=${query}&LH_Complete=1&LH_Sold=1&_sop=13`;
}

// Generate eBay active listings URL
function getEbayActiveUrl(title: string): string {
  const query = encodeURIComponent(generateSearchQuery(title));
  return `https://www.ebay.com/sch/i.html?_nkw=${query}&_sop=15`; // Sort by price + shipping: lowest first
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
  const fullText = `${title} ${description || ""}`.toLowerCase();

  // Get category multiplier range
  const categoryKey = category?.toLowerCase() || "default";
  const categoryRange = CATEGORY_MULTIPLIERS[categoryKey] || CATEGORY_MULTIPLIERS.default;

  // Apply condition multiplier
  const conditionKey = condition?.toLowerCase() || "good";
  const conditionMultiplier = CONDITION_MULTIPLIERS[conditionKey] || 0.75;

  // Check for value-adding keywords
  let valueBoost = 1.0;
  const valueMatches: string[] = [];
  for (const { pattern, boost, label } of VALUE_KEYWORDS) {
    if (pattern.test(fullText)) {
      valueBoost *= boost;
      valueMatches.push(label);
    }
  }

  // Check for risk keywords
  let riskPenalty = 1.0;
  const riskMatches: string[] = [];
  for (const { pattern, penalty, label } of RISK_KEYWORDS) {
    if (pattern.test(fullText)) {
      riskPenalty *= penalty;
      riskMatches.push(label);
    }
  }

  // Calculate estimated market value range
  const baseLow = askingPrice * categoryRange.low * conditionMultiplier * valueBoost * riskPenalty;
  const baseHigh = askingPrice * categoryRange.high * conditionMultiplier * valueBoost * riskPenalty;

  const estimatedLow = Math.round(baseLow);
  const estimatedHigh = Math.round(baseHigh);
  const estimatedValue = Math.round((baseLow + baseHigh) / 2);

  // Calculate profit potential (accounting for ~13% platform fees on eBay/Mercari)
  const platformFees = estimatedValue * 0.13;
  const profitPotential = Math.round(estimatedValue - askingPrice - platformFees);

  // Calculate value score (0-100)
  const profitMargin = profitPotential / askingPrice;
  let valueScore = Math.min(100, Math.max(0, Math.round(profitMargin * 100 + 50)));

  // Adjust score based on absolute profit
  if (profitPotential < 10) valueScore = Math.min(valueScore, 30);
  if (profitPotential < 0) valueScore = Math.min(valueScore, 10);
  if (profitPotential > 100) valueScore = Math.min(100, valueScore + 10);
  if (profitPotential > 200) valueScore = Math.min(100, valueScore + 10);

  // Determine confidence level
  let confidence: "low" | "medium" | "high" = "medium";
  if (valueMatches.length > 0 && riskMatches.length === 0) {
    confidence = "high";
  } else if (riskMatches.length > 0) {
    confidence = "low";
  }

  // Generate reasoning
  const reasons: string[] = [];
  reasons.push(`IMPORTANT: These are algorithmic estimates. Check the reference links below for actual sold prices.`);
  reasons.push(`Category: ${categoryKey} (${categoryRange.low}x - ${categoryRange.high}x markup)`);
  reasons.push(`Condition factor: ${conditionMultiplier}x`);
  if (valueMatches.length > 0) {
    reasons.push(`Value indicators: ${valueMatches.join(", ")}`);
  }
  if (riskMatches.length > 0) {
    reasons.push(`Risk factors: ${riskMatches.join(", ")}`);
  }
  reasons.push(`Platform fees estimated at 13%`);

  // Generate comparable URLs
  const comparableUrls: ComparableUrl[] = [
    {
      platform: "eBay",
      label: "eBay Sold Listings (verify actual prices here!)",
      url: getEbaySoldUrl(title),
      type: "sold",
    },
    {
      platform: "eBay",
      label: "eBay Active Listings",
      url: getEbayActiveUrl(title),
      type: "active",
    },
    {
      platform: "Facebook",
      label: "Facebook Marketplace",
      url: getFacebookMarketplaceUrl(title),
      type: "search",
    },
    {
      platform: "Mercari",
      label: "Mercari Listings",
      url: getMercariUrl(title),
      type: "search",
    },
  ];

  return {
    estimatedValue,
    estimatedLow,
    estimatedHigh,
    profitPotential,
    valueScore,
    confidence,
    reasoning: reasons.join(" | "),
    comparableUrls,
  };
}

// Determine the best category based on title/description
export function detectCategory(title: string, description: string | null): string {
  const fullText = `${title} ${description || ""}`.toLowerCase();

  const categoryPatterns: [string, RegExp][] = [
    ["electronics", /phone|laptop|computer|tablet|tv|monitor|camera|speaker|headphone|gaming|console/],
    ["furniture", /couch|sofa|table|chair|desk|bed|dresser|cabinet|shelf/],
    ["appliances", /washer|dryer|refrigerator|fridge|dishwasher|microwave|oven|vacuum/],
    ["tools", /drill|saw|wrench|hammer|power tool|dewalt|milwaukee|makita/],
    ["video games", /playstation|xbox|nintendo|game|controller|ps5|ps4|switch/],
    ["collectibles", /vintage|antique|collectible|rare|limited|comic|card|coin/],
    ["clothing", /shirt|pants|dress|shoes|jacket|coat|clothing|fashion/],
    ["sports", /bike|bicycle|golf|tennis|fitness|gym|weights|treadmill/],
    ["musical", /guitar|piano|keyboard|drum|amp|amplifier|instrument|dj|ddj|pioneer|controller/],
    ["automotive", /car|truck|motorcycle|parts|tire|wheel|engine/],
  ];

  for (const [category, pattern] of categoryPatterns) {
    if (pattern.test(fullText)) {
      return category;
    }
  }

  return "other";
}
