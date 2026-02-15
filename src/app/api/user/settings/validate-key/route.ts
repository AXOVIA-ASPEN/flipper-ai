import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// POST /api/user/settings/validate-key - Test if an OpenAI API key is valid
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { success: false, error: 'API key is required', valid: false },
        { status: 400 }
      );
    }

    // Validate the format (OpenAI keys start with sk-)
    if (!apiKey.startsWith('sk-')) {
      return NextResponse.json({
        success: true,
        valid: false,
        error: "Invalid API key format. OpenAI keys should start with 'sk-'",
      });
    }

    // Test the API key by making a simple models list request
    const openai = new OpenAI({ apiKey });

    try {
      // Use the models.list endpoint as a lightweight validation
      await openai.models.list();

      return NextResponse.json({
        success: true,
        valid: true,
        message: 'API key is valid',
      });
    } catch (openaiError: unknown) {
      const error = openaiError as { status?: number; message?: string };

      if (error.status === 401) {
        return NextResponse.json({
          success: true,
          valid: false,
          error: 'Invalid API key. Please check your key and try again.',
        });
      }

      if (error.status === 429) {
        // Rate limited but key is valid
        return NextResponse.json({
          success: true,
          valid: true,
          message: 'API key is valid (rate limited)',
        });
      }

      // Other errors - key might be valid but there's another issue
      return NextResponse.json({
        success: true,
        valid: false,
        error: error.message || 'Could not validate API key',
      });
    }
  } catch (error) {
    console.error('Error validating API key:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate API key', valid: false },
      { status: 500 }
    );
  }
}
