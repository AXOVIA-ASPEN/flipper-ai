/**
 * @file src/lib/value-estimator.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-15
 * @version 2.0
 * @brief Algorithmic value estimation engine for flip opportunity scoring.
 *
 * @description
 * Core scoring module that evaluates marketplace listings for resale potential.
 * Uses keyword matching (brand boosts with negative pattern suppression, risk
 * penalties), category-based multipliers, condition factors, and a weighted
 * margin + absolute profit formula to produce a 0-100 value score.
 *
 * Brand/value keywords match against listing TITLES ONLY (not descriptions)
 * to prevent false positives (e.g., "vintage-style" triggering vintage boost).
 * Risk/condition keywords match full text (title + description) since damage
 * disclosures often appear only in descriptions. Sealed/NIB keywords use a
 * hybrid approach: title OR first 100 chars of description.
 *
 * Also provides demand velocity adjustment (post-processing step), demand
 * badge mapping, category detection, and purchase message generation.
 */

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
// Calibrated 2026-04-15 via Story 13.7 refinement session using 300 SF Bay Craigslist listings
const CATEGORY_MULTIPLIERS: Record<string, { low: number; high: number; difficulty: number }> = {
  electronics: { low: 1.3, high: 1.8, difficulty: 2 }, // Raised from 1.2-1.6 — phones/tablets/laptops routinely 1.5-2x on eBay
  furniture: { low: 1.3, high: 1.8, difficulty: 4 }, // Harder to ship
  appliances: { low: 1.2, high: 1.5, difficulty: 5 }, // Raised slightly; difficulty → VERY_HARD (heavy, local-only)
  tools: { low: 1.4, high: 1.9, difficulty: 2 }, // Raised from 1.3-1.7 — Milwaukee/DeWalt/Makita hold value
  'video games': { low: 1.4, high: 2.0, difficulty: 1 }, // Well-calibrated, unchanged
  collectibles: { low: 1.4, high: 2.2, difficulty: 2 }, // Reduced from 1.5-2.5 — stacking w/ vintage/rare boosts caused runaway scores
  clothing: { low: 1.1, high: 1.5, difficulty: 3 },
  sports: { low: 1.3, high: 1.7, difficulty: 3 }, // Bumped from 1.2-1.6 — bikes/fitness gear hold value
  musical: { low: 1.4, high: 2.0, difficulty: 2 }, // Raised; lowered difficulty from 3 (ships well, strong resale market)
  automotive: { low: 1.1, high: 1.4, difficulty: 4 },
  default: { low: 1.2, high: 1.5, difficulty: 3 },
};

// Keywords that indicate higher value items — matched against TITLE ONLY (not description)
// Each entry may have negativePatterns that suppress the boost when matched in the same title
interface ValueKeyword {
  pattern: RegExp;
  boost: number;
  label: string;
  tag: string;
  negativePatterns?: RegExp[];
  /** If true, match title OR first 100 chars of description (used for sealed/NIB) */
  matchLeadDescription?: boolean;
}

// Brand boosts calibrated 2026-04-15 via Story 13.7 refinement session
const VALUE_KEYWORDS: ValueKeyword[] = [
  {
    pattern: /apple|iphone|ipad|macbook|airpods/i,
    boost: 1.25, // Raised from 1.2 — Apple holds 70-90% of retail
    label: 'Apple product',
    tag: 'apple',
    negativePatterns: [/apple compatible|case for iphone|charger for|apple cider|apple pie|apple tree|apple sauce/i],
  },
  {
    pattern: /samsung|galaxy/i,
    boost: 1.15, // Unchanged — mid-tier resale
    label: 'Samsung',
    tag: 'samsung',
    negativePatterns: [/compatible with samsung|case for samsung|charger for samsung/i],
  },
  {
    pattern: /sony|playstation|ps5|ps4/i,
    boost: 1.2,
    label: 'Sony/PlayStation',
    tag: 'sony',
    negativePatterns: [/compatible with playstation|case for ps5|case for ps4|controller for ps/i],
  },
  {
    pattern: /nintendo|switch/i,
    boost: 1.3, // Raised from 1.25 — Switch games barely depreciate
    label: 'Nintendo',
    tag: 'nintendo',
    negativePatterns: [/compatible with|case for|controller for|charger for|screen protector|light switch|network switch|switch plate/i],
  },
  { pattern: /xbox|microsoft/i, boost: 1.2, label: 'Xbox/Microsoft', tag: 'xbox' }, // Raised from 1.15
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
  // NEW BRANDS — added 2026-04-15
  {
    pattern: /\b(milwaukee|dewalt|makita)\b/i,
    boost: 1.25,
    label: 'Premium power tools',
    tag: 'power-tools',
  },
  {
    pattern: /\b(fender|gibson|martin)\b/i,
    boost: 1.3,
    label: 'Premium guitar brand',
    tag: 'premium-guitar',
  },
  {
    pattern: /\bmarshall\b|mesa.?boogie|\bvox\s+(ac\d+|amp|guitar|tone)\b|\borange\s*(amp|amplifier)\b/i,
    boost: 1.25,
    label: 'Premium amp brand',
    tag: 'premium-amp',
  },
  {
    pattern: /\b(moog|roland|korg|akai)\b/i,
    boost: 1.25,
    label: 'Premium synth/keys',
    tag: 'synth-keys',
  },
  {
    pattern: /\b(bose|sonos|jbl)\b/i,
    boost: 1.15,
    label: 'Premium audio',
    tag: 'premium-audio',
  },
  {
    pattern: /\b(canon|nikon)\b/i,
    boost: 1.2,
    label: 'Camera brand',
    tag: 'camera-brand',
    negativePatterns: [/canon compatible|case for canon|nikon compatible|case for nikon/i],
  },
  {
    pattern: /restoration hardware|pottery barn|west elm/i,
    boost: 1.3,
    label: 'Premium home furnishings',
    tag: 'premium-home',
  },
  {
    pattern: /snap.?on/i,
    boost: 1.3,
    label: 'Snap-On tools',
    tag: 'snap-on',
  },
  {
    pattern: /\blego\b/i,
    boost: 1.3,
    label: 'LEGO',
    tag: 'lego',
    negativePatterns: [/lego compatible|lego-style|lego-like/i],
  },
  {
    pattern: /north face|patagonia/i,
    boost: 1.2,
    label: 'Premium outdoor apparel',
    tag: 'outdoor-apparel',
  },
  // NEW BRANDS — added 2026-04-17 from Groq/Llama backtest (session #2 false negatives)
  {
    pattern: /\b(taylor|ovation|squier|epiphone|prs|ibanez)\b/i,
    boost: 1.25,
    label: 'Guitar brand',
    tag: 'guitar-brand',
    negativePatterns: [/taylor swift|taylor made|taylor series/i],
  },
  {
    pattern: /\b(dbx|drawmer|panamax|furman)\b/i,
    boost: 1.2,
    label: 'Pro audio gear',
    tag: 'pro-audio',
  },
  {
    pattern: /\b(rtx|geforce|radeon|ryzen)\b/i,
    boost: 1.2,
    label: 'Gaming PC components',
    tag: 'gaming-pc',
  },
  {
    pattern: /\b(ping|cobra|taylormade|callaway|titleist)\b/i,
    boost: 1.2,
    label: 'Premium golf brand',
    tag: 'premium-golf',
  },
  {
    pattern: /\b(ubiquiti|unifi|amplifi)\b|netgear\s*nighthawk|\basus\s*zen\s*wifi/i,
    boost: 1.15,
    label: 'Premium network gear',
    tag: 'premium-network',
  },
  {
    pattern: /mid.?century|chippendale|eames|\bkartell\b|room\s*&?\s*board/i,
    boost: 1.25,
    label: 'Designer furniture style',
    tag: 'designer-furniture',
  },
  {
    pattern: /\b(greenlee|klein)\b/i,
    boost: 1.2,
    label: 'Professional trade tools',
    tag: 'trade-tools',
  },
  {
    pattern: /vintage|antique|retro/i,
    boost: 1.3, // Reduced from 1.4 — avoid runaway stacking with collectibles category
    label: 'Vintage/collectible',
    tag: 'vintage',
    negativePatterns: [/vintage-style|vintage-inspired|vintage look|retro style|retro-fit|retro-inspired/i],
  },
  {
    pattern: /sealed|new in box|nib|bnib/i,
    boost: 1.3,
    label: 'New/sealed condition',
    tag: 'sealed',
    negativePatterns: [/resealed|seal broken|seal damaged/i],
    matchLeadDescription: true,
  },
  {
    pattern: /rare|limited edition/i,
    boost: 1.3, // Reduced from 1.4 — same reason as vintage
    label: 'Rare/limited',
    tag: 'rare',
    negativePatterns: [/rarely used|rare occasion/i],
  },
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
  category: string | null,
  feeRate?: number
): EstimationResult {
  const titleLower = title.toLowerCase();
  const descLower = (description || '').toLowerCase();
  const fullText = `${titleLower} ${descLower}`;
  const leadDescription = descLower.slice(0, 100);

  // Get category multiplier range
  const categoryKey = category?.toLowerCase() || 'default';
  const categoryData = CATEGORY_MULTIPLIERS[categoryKey] || CATEGORY_MULTIPLIERS.default;

  // Apply condition multiplier
  const conditionKey = condition?.toLowerCase() || 'good';
  const conditionMultiplier = CONDITION_MULTIPLIERS[conditionKey] || 0.75;

  // Check for value-adding keywords (TITLE ONLY, with negative pattern suppression)
  let valueBoost = 1.0;
  const valueMatches: string[] = [];
  const tags: string[] = [categoryKey];

  for (const kw of VALUE_KEYWORDS) {
    // Determine match text: title-only by default, title+leadDescription for sealed/NIB
    const matchText = kw.matchLeadDescription ? `${titleLower} ${leadDescription}` : titleLower;
    if (kw.pattern.test(matchText)) {
      // Check negative patterns — skip boost if any negative matches
      const negated = kw.negativePatterns?.some((neg) => neg.test(matchText));
      if (!negated) {
        valueBoost *= kw.boost;
        valueMatches.push(kw.label);
        tags.push(kw.tag);
      }
    }
  }

  // Check for risk keywords (full text — title + description, since risks are often in description)
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

  // Calculate profit potential (accounting for platform fees; default 13%)
  const effectiveFeeRate = (feeRate !== undefined && isFinite(feeRate) && feeRate >= 0 && feeRate <= 1)
    ? feeRate
    : 0.13;
  const profitLow = Math.round(estimatedLow * (1 - effectiveFeeRate) - askingPrice);
  const profitHigh = Math.round(estimatedHigh * (1 - effectiveFeeRate) - askingPrice);
  const profitPotential = Math.round((profitLow + profitHigh) / 2);

  // Calculate value score (0-100) using weighted margin + absolute profit formula.
  // Calibrated 2026-04-15 via Story 13.7 refinement session:
  //   - Weights 50/50 (was 40/60) — balance margin % and absolute $ equally
  //   - Log curve 36 (was 33.33) — rewards smaller absolute profits better
  // Old linear formula (preserved for reference):
  //   valueScore = Math.min(100, Math.max(0, Math.round(profitMargin * 100 + 50)))
  //   + cumulative boosts: >$100 → +10, >$200 → +10
  const profitMargin = profitPotential / askingPrice;
  const marginScore = Math.min(100, Math.max(0, Math.round(profitMargin * 100 + 50)));
  const absoluteProfitScore = Math.min(100, Math.round(
    Math.log10(Math.max(1, profitPotential)) * 36
  ));
  let valueScore = Math.round(marginScore * 0.5 + absoluteProfitScore * 0.5);
  valueScore = Math.min(100, Math.max(0, valueScore));

  // Apply caps based on absolute profit thresholds
  if (profitPotential < 0) valueScore = Math.min(valueScore, 10);
  else if (profitPotential === 0) valueScore = Math.min(valueScore, 15);
  else if (profitPotential < 15) valueScore = Math.min(valueScore, 40);

  // Apply exclusive high-value boosts (highest tier only, not cumulative)
  // New tier added 2026-04-15: >$500 profit gets +15 to cluster true home runs at the top
  if (profitPotential > 500) valueScore = Math.min(100, valueScore + 15);
  else if (profitPotential > 300) valueScore = Math.min(100, valueScore + 10);
  else if (profitPotential > 100) valueScore = Math.min(100, valueScore + 5);

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
  reasons.push(`Platform fees estimated at ${Math.round(effectiveFeeRate * 100)}%`);

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

  // Patterns expanded 2026-04-15 via Story 13.7 refinement to reduce "other" misclassification
  // (was ~36% of items landing in default — now catches phones by brand, watches, chromebooks, etc.)
  const categoryPatterns: [string, RegExp][] = [
    // Musical first - DJ equipment and instruments (before video games due to "controller")
    ['musical', /guitar|piano|keyboard|drum|amplifier|instrument|\bdj\b|ddj|pioneer\s*ddj|saxophone|trumpet|violin|cello|\bbass\b|synth|synthesizer|\bmoog\b|\broland\b|\bkorg\b|\bakai\b|\bfender\b|\bgibson\b|\bmartin\b(?!\s+luther)|\bmarshall\b|mesa.?boogie|effects pedal|microphone|\bmic\b|\btaylor\b(?!\s+(swift|made))|\bovation\b|\bsquier\b|\bepiphone\b|\bibanez\b|\bprs\b|\bdbx\b|\bdrawmer\b|cajon|\bconga\b|pedals?\b/],
    // Video games next - consoles and gaming (before electronics due to "console", "controller")
    ['video games', /playstation|xbox|nintendo|\bgame\b|ps5|ps4|ps3|switch\b|\bwii\b|gamecube|atari|sega|retro console|arcade|joy-?con/],
    // Electronics - general tech items (expanded with brands + product types)
    [
      'electronics',
      /phone|iphone|ipad|airpods|galaxy|pixel\b|oneplus|laptop|computer|chromebook|thinkpad|macbook|tablet|\btv\b|monitor|camera|dslr|speaker|headphone|earbud|sound ?bar|\bwatch\b|smartwatch|apple watch|tv mount|projector|printer|\bram\b|\bssd\b|hard drive|router|modem|wifi|keyboard\s+(mechanical|gaming|wireless)|mouse\s+(wireless|gaming)|beats|bose|sonos|jbl|canon|nikon|sony\b|\brtx\b|\bgtx\b|geforce|radeon|\bimac\b|nighthawk|ubiquiti|unifi/,
    ],
    ['furniture', /couch|sofa|table|chair|desk|\bbed\b|dresser|cabinet|shelf|bookcase|nightstand|ottoman|stool|bench\b|wardrobe|armoire|aeron|herman miller|steelcase|restoration hardware|pottery barn|west elm|mid.?century|chippendale|eames|\bkartell\b|room\s*&?\s*board/],
    ['appliances', /washer|dryer|refrigerator|fridge|dishwasher|microwave|oven|vacuum|blender|mixer|kitchenaid|vitamix|dyson|toaster|coffee ?maker|espresso|juicer|freezer|range\b|cooktop|stove|hood\b/],
    ['tools', /drill|saw\b|wrench|hammer|power tool|dewalt|milwaukee|makita|snap.?on|ridgid|\brigid\b|craftsman|bosch|\bryobi\b|impact driver|miter|compressor|table saw|band saw|shop vac|tool set|tool box|greenlee|\bklein\b|chainsaw|generator|welder|grinder/],
    ['collectibles', /vintage|antique|collectible|rare|limited|comic|\bcard\b|coin|stamp\b|\btoy\b|figurine|statue|memorabilia|signed\b|autograph|baseball\s+card/],
    ['clothing', /shirt|pants|dress\b|shoes|jacket|coat\b|clothing|fashion|hoodie|sweater|boots?\b|sneakers|\bnike\b|adidas|north face|patagonia|\blevi\b/],
    ['sports', /\bbike\b|bicycle|golf|tennis|fitness|\bgym\b|weights|treadmill|peloton|rowing|elliptical|kayak|\bski\b|snowboard|surfboard|helmet|football|basketball|soccer|baseball\s+(bat|glove)|\bping\b\s*(zing|anser|g\d|i\d)|cobra\s*king|taylormade|callaway|titleist|\bbow\b\s*(hunting|compound|archery)/],
    ['automotive', /\bcar\b|truck|motorcycle|auto ?parts|\btire\b|wheel\b|engine\b|brake\b|exhaust|muffler|battery charger|floor jack/],
  ];

  for (const [category, pattern] of categoryPatterns) {
    if (pattern.test(fullText)) {
      return category;
    }
  }

  return 'other';
}

// --- Demand Velocity Adjustment (Story 13.6) ---
// Applied as a POST-PROCESSING step after demand enrichment completes,
// avoiding the chicken-and-egg problem with Tier 1 scoring.

/** Demand analyzer output (primary data source) */
const DEMAND_ANALYZER_MULTIPLIERS: Record<string, number> = {
  rising: 1.15,
  stable: 1.0,
  declining: 0.85,
  low_liquidity: 0.70,
};

/** LLM demandLevel output (fallback when demand analyzer unavailable) */
const LLM_DEMAND_MULTIPLIERS: Record<string, number> = {
  very_high: 1.15,
  high: 1.05,
  medium: 1.0,
  low: 0.85,
};

export type DemandBadge = { label: string; color: 'red' | 'green' | 'blue' | 'gray' | 'warning' };

/** Map demand trend to a UI badge */
export function getDemandBadge(demandTrend: string | null): DemandBadge {
  const badges: Record<string, DemandBadge> = {
    // Demand analyzer types
    rising: { label: 'Hot', color: 'red' },
    stable: { label: 'Steady', color: 'blue' },
    declining: { label: 'Slow', color: 'gray' },
    low_liquidity: { label: 'Dead', color: 'warning' },
    // LLM fallback types
    very_high: { label: 'Hot', color: 'red' },
    high: { label: 'Active', color: 'green' },
    medium: { label: 'Steady', color: 'blue' },
    low: { label: 'Slow', color: 'gray' },
  };
  return badges[demandTrend || ''] || { label: 'Unknown', color: 'gray' };
}

/**
 * Apply demand velocity adjustment to a pre-computed valueScore.
 * Call AFTER enrichWithDemandAnalysis() completes to avoid chicken-and-egg timing.
 *
 * @param valueScore - The Tier 1 value score (0-100)
 * @param demandTrend - From demand analyzer ('rising'|'stable'|'declining'|'low_liquidity')
 *                      or LLM demandLevel ('very_high'|'high'|'medium'|'low') or null
 * @param expectedDaysToSell - From LLM sellability analysis, or null
 * @param discountPercent - The discount percentage (positive = below market). Demand boost
 *                          >1.0 only applies when discountPercent > 0 (item is underpriced).
 * @returns Adjusted score clamped 0-100
 */
export function applyDemandAdjustment(
  valueScore: number,
  demandTrend: string | null,
  expectedDaysToSell: number | null,
  discountPercent: number = 0
): number {
  let adjusted = valueScore;

  // Resolve demand multiplier (demand analyzer types take priority over LLM types)
  const multiplier = demandTrend
    ? (DEMAND_ANALYZER_MULTIPLIERS[demandTrend] ?? LLM_DEMAND_MULTIPLIERS[demandTrend] ?? 1.0)
    : 1.0;

  // Guard: only apply boost (>1.0) when item is actually below market value
  if (multiplier > 1.0 && discountPercent <= 0) {
    // Overpriced item — high demand doesn't help
  } else {
    adjusted = Math.round(adjusted * multiplier);
  }

  // Days-to-sell penalty (exclusive, not cumulative)
  if (expectedDaysToSell !== null) {
    if (expectedDaysToSell > 60) {
      adjusted -= 10;
    } else if (expectedDaysToSell > 30) {
      adjusted -= 5;
    }
  }

  return Math.min(100, Math.max(0, adjusted));
}
