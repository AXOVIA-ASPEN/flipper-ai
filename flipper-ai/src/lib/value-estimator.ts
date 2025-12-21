// Value estimation logic for flip opportunities
// Uses keyword matching and category-based multipliers to estimate market value

interface EstimationResult {
  estimatedValue: number;
  profitPotential: number;
  valueScore: number;
  confidence: "low" | "medium" | "high";
  reasoning: string;
}

// Common product categories with typical markup percentages
const CATEGORY_MULTIPLIERS: Record<string, number> = {
  electronics: 1.4,
  furniture: 1.6,
  appliances: 1.3,
  tools: 1.5,
  "video games": 1.8,
  collectibles: 2.0,
  clothing: 1.3,
  sports: 1.4,
  musical: 1.5,
  automotive: 1.3,
  default: 1.4,
};

// Keywords that indicate higher value items
const VALUE_KEYWORDS = [
  { pattern: /apple|iphone|ipad|macbook|airpods/i, multiplier: 1.3 },
  { pattern: /samsung|galaxy/i, multiplier: 1.2 },
  { pattern: /sony|playstation|ps5|ps4/i, multiplier: 1.25 },
  { pattern: /nintendo|switch/i, multiplier: 1.3 },
  { pattern: /xbox|microsoft/i, multiplier: 1.2 },
  { pattern: /dyson/i, multiplier: 1.4 },
  { pattern: /kitchenaid|vitamix/i, multiplier: 1.35 },
  { pattern: /herman miller|steelcase/i, multiplier: 1.5 },
  { pattern: /vintage|antique|retro/i, multiplier: 1.6 },
  { pattern: /sealed|new in box|nib|bnib/i, multiplier: 1.4 },
  { pattern: /rare|limited edition/i, multiplier: 1.5 },
];

// Keywords that indicate lower value or risk
const RISK_KEYWORDS = [
  { pattern: /broken|damaged|parts only|for parts/i, multiplier: 0.3 },
  { pattern: /needs repair|not working|doesn't work/i, multiplier: 0.4 },
  { pattern: /scratched|dented|worn/i, multiplier: 0.8 },
  { pattern: /missing|incomplete/i, multiplier: 0.6 },
  { pattern: /old|used heavily/i, multiplier: 0.7 },
];

// Condition multipliers
const CONDITION_MULTIPLIERS: Record<string, number> = {
  new: 1.0,
  "like new": 0.9,
  excellent: 0.85,
  good: 0.75,
  fair: 0.6,
  poor: 0.4,
};

export function estimateValue(
  title: string,
  description: string | null,
  askingPrice: number,
  condition: string | null,
  category: string | null
): EstimationResult {
  const fullText = `${title} ${description || ""}`.toLowerCase();

  // Start with category-based multiplier
  const categoryKey = category?.toLowerCase() || "default";
  let baseMultiplier = CATEGORY_MULTIPLIERS[categoryKey] || CATEGORY_MULTIPLIERS.default;

  // Apply condition multiplier
  const conditionKey = condition?.toLowerCase() || "good";
  const conditionMultiplier = CONDITION_MULTIPLIERS[conditionKey] || 0.75;

  // Check for value-adding keywords
  let valueBoost = 1.0;
  const valueMatches: string[] = [];
  for (const { pattern, multiplier } of VALUE_KEYWORDS) {
    if (pattern.test(fullText)) {
      valueBoost *= multiplier;
      valueMatches.push(pattern.source);
    }
  }

  // Check for risk keywords
  let riskPenalty = 1.0;
  const riskMatches: string[] = [];
  for (const { pattern, multiplier } of RISK_KEYWORDS) {
    if (pattern.test(fullText)) {
      riskPenalty *= multiplier;
      riskMatches.push(pattern.source);
    }
  }

  // Calculate estimated market value
  const estimatedValue = Math.round(
    askingPrice * baseMultiplier * conditionMultiplier * valueBoost * riskPenalty
  );

  // Calculate profit potential (accounting for ~15% platform fees)
  const platformFees = estimatedValue * 0.15;
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
  if (valueMatches.length > 0) {
    reasons.push(`Brand/value indicators detected`);
  }
  if (riskMatches.length > 0) {
    reasons.push(`Risk factors: potential issues noted`);
  }
  reasons.push(`Category multiplier: ${baseMultiplier}x`);
  reasons.push(`Condition factor: ${conditionMultiplier}x`);

  return {
    estimatedValue,
    profitPotential,
    valueScore,
    confidence,
    reasoning: reasons.join(". "),
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
    ["musical", /guitar|piano|keyboard|drum|amp|amplifier|instrument/],
    ["automotive", /car|truck|motorcycle|parts|tire|wheel|engine/],
  ];

  for (const [category, pattern] of categoryPatterns) {
    if (pattern.test(fullText)) {
      return category;
    }
  }

  return "other";
}
