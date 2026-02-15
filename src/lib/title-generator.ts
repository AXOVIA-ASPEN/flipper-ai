// Listing Title Generator
// Generates SEO-optimized resale listing titles from item data
// Supports multiple marketplace formats with character limits

import OpenAI from "openai";
import type { ItemIdentification } from "./llm-identifier";

export interface TitleGeneratorInput {
  brand: string | null;
  model: string | null;
  variant: string | null;
  condition: string;
  category: string | null;
  keywords?: string[];
}

export interface GeneratedTitle {
  title: string;
  platform: "ebay" | "mercari" | "facebook" | "offerup" | "generic";
  charCount: number;
  keywords: string[];
}

export interface TitleGeneratorResult {
  titles: GeneratedTitle[];
  primary: string; // Best overall title
}

// Platform character limits
const PLATFORM_LIMITS: Record<string, number> = {
  ebay: 80,
  mercari: 40,
  facebook: 99,
  offerup: 70,
  generic: 80,
};

// Condition display mapping for titles
const CONDITION_LABELS: Record<string, string> = {
  new: "NEW",
  like_new: "Like New",
  good: "Good Condition",
  fair: "Fair",
  poor: "For Parts/Repair",
};

/**
 * Generate an optimized resale title algorithmically (no LLM needed).
 * Fast, deterministic, and free.
 */
export function generateAlgorithmicTitle(
  input: TitleGeneratorInput,
  platform: string = "generic"
): GeneratedTitle {
  const limit = PLATFORM_LIMITS[platform] || 80;
  const parts: string[] = [];
  const keywords: string[] = [];

  // Brand first (most important for SEO)
  if (input.brand) {
    parts.push(input.brand);
    keywords.push(input.brand.toLowerCase());
  }

  // Model
  if (input.model) {
    parts.push(input.model);
    keywords.push(input.model.toLowerCase());
  }

  // Variant (size, color, storage, etc.)
  if (input.variant) {
    parts.push(input.variant);
    keywords.push(input.variant.toLowerCase());
  }

  // Condition
  const conditionLabel = CONDITION_LABELS[input.condition] || input.condition;
  parts.push(`- ${conditionLabel}`);

  // Extra keywords if space permits
  if (input.keywords) {
    for (const kw of input.keywords) {
      keywords.push(kw.toLowerCase());
    }
  }

  // Build title respecting character limit
  let title = parts.join(" ");

  // If over limit, try removing condition details
  if (title.length > limit) {
    const shortCondition =
      input.condition === "new"
        ? "NEW"
        : input.condition === "like_new"
          ? "LN"
          : "";
    const condensed = parts.slice(0, -1);
    if (shortCondition) condensed.push(shortCondition);
    title = condensed.join(" ");
  }

  // Final truncation if still over
  if (title.length > limit) {
    title = title.substring(0, limit - 3).trimEnd() + "...";
  }

  return {
    title: title.trim(),
    platform: platform as GeneratedTitle["platform"],
    charCount: Math.min(title.trim().length, limit),
    keywords,
  };
}

/**
 * Generate titles for all supported platforms from item data.
 */
export function generateTitlesForAllPlatforms(
  input: TitleGeneratorInput
): TitleGeneratorResult {
  const platforms = ["ebay", "mercari", "facebook", "offerup"] as const;
  const titles: GeneratedTitle[] = platforms.map((p) =>
    generateAlgorithmicTitle(input, p)
  );

  // Primary title is the eBay one (most common resale platform)
  const primary =
    titles.find((t) => t.platform === "ebay")?.title ||
    titles[0]?.title ||
    "";

  return { titles, primary };
}

/**
 * Generate an LLM-optimized title using OpenAI.
 * Falls back to algorithmic generation if no API key.
 */
export async function generateLLMTitle(
  input: TitleGeneratorInput,
  platform: string = "ebay"
): Promise<GeneratedTitle> {
  const limit = PLATFORM_LIMITS[platform] || 80;

  if (!process.env.OPENAI_API_KEY) {
    return generateAlgorithmicTitle(input, platform);
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `Generate a single SEO-optimized resale listing title for ${platform}.

Item Details:
- Brand: ${input.brand || "Unknown"}
- Model: ${input.model || "Unknown"}
- Variant: ${input.variant || "N/A"}
- Condition: ${input.condition}
- Category: ${input.category || "General"}

Rules:
- MUST be ${limit} characters or fewer
- Include brand and model prominently
- Use keywords buyers search for
- Include condition indicator
- No emojis, no ALL CAPS (except brand acronyms)
- No clickbait or misleading terms

Respond with ONLY the title text, nothing else.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert eBay/marketplace seller who writes high-converting listing titles.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 100,
    });

    let title = (response.choices[0]?.message?.content || "").trim();

    // Strip quotes if the LLM wrapped it
    title = title.replace(/^["']|["']$/g, "");

    // Enforce character limit
    if (title.length > limit) {
      title = title.substring(0, limit - 3).trimEnd() + "...";
    }

    // Extract keywords from the generated title
    const keywords = title
      .toLowerCase()
      .split(/[\s\-\/,]+/)
      .filter((w) => w.length > 2);

    return {
      title,
      platform: platform as GeneratedTitle["platform"],
      charCount: title.length,
      keywords,
    };
  } catch (error) {
    console.error("LLM title generation failed, using algorithmic:", error);
    return generateAlgorithmicTitle(input, platform);
  }
}

/**
 * Convert an ItemIdentification (from llm-identifier) to TitleGeneratorInput.
 */
export function fromIdentification(
  identification: ItemIdentification
): TitleGeneratorInput {
  return {
    brand: identification.brand,
    model: identification.model,
    variant: identification.variant,
    condition: identification.condition,
    category: identification.category,
  };
}
