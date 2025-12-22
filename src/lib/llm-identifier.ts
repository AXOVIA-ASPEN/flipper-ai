// LLM-powered item identification for marketplace listings
// Uses OpenAI ChatGPT to extract structured product information from listing titles/descriptions

import OpenAI from "openai";

export interface ItemIdentification {
  brand: string | null;
  model: string | null;
  variant: string | null;        // "256GB", "Blue", "Pro Max", etc.
  year: number | null;
  condition: "new" | "like_new" | "good" | "fair" | "poor";
  conditionNotes: string;
  searchQuery: string;           // Optimized query for eBay search
  category: string;              // Refined category
  worthInvestigating: boolean;   // Quick filter - is this worth deeper analysis?
  reasoning: string;
}

const IDENTIFICATION_PROMPT = `You are an expert at identifying products from marketplace listings. Analyze this listing and extract structured information.

LISTING:
Title: {title}
Description: {description}
Asking Price: ${"{price}"}
Category Hint: {category}

TASK:
1. Identify the exact product (brand, model, variant/specs, year if applicable)
2. Assess the condition from the description
3. Generate an optimized search query for finding this exact item on eBay sold listings
4. Determine if this is worth investigating for resale (has brand recognition, resale demand)

RESPOND WITH ONLY VALID JSON (no markdown, no explanation):
{
  "brand": "string or null",
  "model": "string or null",
  "variant": "string or null (size, color, storage, etc.)",
  "year": "number or null",
  "condition": "new|like_new|good|fair|poor",
  "conditionNotes": "brief notes about condition",
  "searchQuery": "optimized eBay search query (brand + model + key specs)",
  "category": "refined category name",
  "worthInvestigating": true/false,
  "reasoning": "brief explanation of worth assessment"
}

GUIDELINES:
- worthInvestigating = true for: known brands, electronics, collectibles, tools, gaming
- worthInvestigating = false for: generic items, clothing without brand, very low value items
- searchQuery should be specific enough to find similar items but not too restrictive
- If you can't identify the brand/model, still provide a useful searchQuery`;

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export async function identifyItem(
  title: string,
  description: string | null,
  askingPrice: number,
  categoryHint: string | null
): Promise<ItemIdentification | null> {
  // Skip if no API key configured
  if (!process.env.OPENAI_API_KEY) {
    console.log("OPENAI_API_KEY not set, skipping LLM identification");
    return null;
  }

  try {
    const client = getOpenAI();

    const prompt = IDENTIFICATION_PROMPT
      .replace("{title}", title)
      .replace("{description}", description || "No description provided")
      .replace("{price}", askingPrice.toString())
      .replace("{category}", categoryHint || "Unknown");

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a product identification expert. Always respond with valid JSON only, no markdown formatting.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const responseText = response.choices[0]?.message?.content || "";

    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to extract JSON from LLM response:", responseText);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      brand: parsed.brand || null,
      model: parsed.model || null,
      variant: parsed.variant || null,
      year: parsed.year ? parseInt(parsed.year) : null,
      condition: validateCondition(parsed.condition),
      conditionNotes: parsed.conditionNotes || "",
      searchQuery: parsed.searchQuery || title,
      category: parsed.category || categoryHint || "other",
      worthInvestigating: parsed.worthInvestigating === true,
      reasoning: parsed.reasoning || "",
    };
  } catch (error) {
    console.error("LLM identification error:", error);
    return null;
  }
}

function validateCondition(
  condition: string
): "new" | "like_new" | "good" | "fair" | "poor" {
  const valid = ["new", "like_new", "good", "fair", "poor"];
  const normalized = condition?.toLowerCase().replace(/\s+/g, "_");
  return valid.includes(normalized)
    ? (normalized as "new" | "like_new" | "good" | "fair" | "poor")
    : "good";
}

// Batch identification for multiple listings (more efficient)
export async function identifyItemsBatch(
  listings: Array<{
    title: string;
    description: string | null;
    askingPrice: number;
    categoryHint: string | null;
  }>
): Promise<(ItemIdentification | null)[]> {
  // Process in parallel with rate limiting
  const results: (ItemIdentification | null)[] = [];
  const batchSize = 5; // Process 5 at a time to avoid rate limits

  for (let i = 0; i < listings.length; i += batchSize) {
    const batch = listings.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((listing) =>
        identifyItem(
          listing.title,
          listing.description,
          listing.askingPrice,
          listing.categoryHint
        )
      )
    );
    results.push(...batchResults);

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < listings.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}
