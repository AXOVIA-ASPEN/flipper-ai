/**
 * @jest-environment jsdom
 *
 * @file src/__tests__/components/ResaleContentEditor.test.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.0
 * @brief Component tests for ResaleContentEditor (Story 9.1, Task 3).
 *
 * @description
 * Covers the editor's interactive surface area: initial render, platform
 * switching and char/word-limit feedback, AI/algorithmic toggle, Generate
 * button calling the generate-resale-content endpoint, warnings and source
 * label display, error rendering, and the Save-to-Queue onSave callback.
 * These tests back story acceptance criterion AC5 (editable draft display)
 * and lock in the contract between the editor and the API it consumes.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import ResaleContentEditor from '@/components/ResaleContentEditor';

const originalFetch = global.fetch;

function mockFetchOnce(body: Record<string, unknown>, ok = true) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok,
    json: async () => body,
  } as Response);
}

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
});

const successPayload = {
  success: true,
  data: {
    primary: {
      title: 'Apple iPhone 14 256GB - Good Condition',
      description: 'Great phone, lightly used. Local pickup available.',
      platform: 'ebay',
    },
    titles: [
      { title: 'Apple iPhone 14 256GB - Good Condition', platform: 'ebay', charCount: 40 },
      { title: 'Apple iPhone 14', platform: 'mercari', charCount: 15 },
    ],
    descriptions: [
      {
        description: 'Great phone, lightly used. Local pickup available.',
        platform: 'ebay',
        wordCount: 7,
      },
      {
        description: 'Mercari-style blurb',
        platform: 'mercari',
        wordCount: 3,
      },
    ],
    source: 'ai',
    warnings: [],
  },
};

describe('ResaleContentEditor', () => {
  it('renders platform selector, AI toggle, Generate button, and limit counters', () => {
    render(<ResaleContentEditor listingId="lst-1" />);

    expect(screen.getByLabelText(/Platform:/i)).toBeInTheDocument();
    expect(screen.getByText(/Use AI/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate/i })).toBeInTheDocument();
    expect(screen.getByText(/0 \/ 80 chars/)).toBeInTheDocument();
    expect(screen.getByText(/0 \/ 500 words/)).toBeInTheDocument();
  });

  it('updates char/word limits when the user switches platforms', () => {
    render(<ResaleContentEditor listingId="lst-1" />);
    const select = screen.getByLabelText(/Platform:/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'mercari' } });

    // Mercari: 40-char title limit, 200-word description limit
    expect(screen.getByText(/0 \/ 40 chars/)).toBeInTheDocument();
    expect(screen.getByText(/0 \/ 200 words/)).toBeInTheDocument();
  });

  it('highlights title count red when the user exceeds the Mercari 40-char limit', () => {
    render(<ResaleContentEditor listingId="lst-1" initialPlatform="mercari" />);
    const titleInput = screen.getByPlaceholderText(/Generated title appears here/i);
    fireEvent.change(titleInput, { target: { value: 'x'.repeat(45) } });

    const counter = screen.getByText(/45 \/ 40 chars/);
    expect(counter.className).toMatch(/text-red-600/);
  });

  it('calls /api/listings/<id>/generate-resale-content with platform + useLLM when Generate clicked', async () => {
    mockFetchOnce(successPayload);
    render(<ResaleContentEditor listingId="lst-1" />);

    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('/api/listings/lst-1/generate-resale-content');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ platform: 'ebay', useLLM: true });
  });

  it('populates title + description from the matching-platform response entry', async () => {
    mockFetchOnce(successPayload);
    render(<ResaleContentEditor listingId="lst-1" />);
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));

    await waitFor(() => {
      expect((screen.getByPlaceholderText(/Generated title appears here/i) as HTMLInputElement).value).toBe(
        'Apple iPhone 14 256GB - Good Condition'
      );
    });
    expect(
      (screen.getByPlaceholderText(/Generated description appears here/i) as HTMLTextAreaElement).value
    ).toBe('Great phone, lightly used. Local pickup available.');
    // Source pill should appear.
    expect(screen.getByText(/Source: AI/i)).toBeInTheDocument();
  });

  it('renders warnings returned from the API', async () => {
    mockFetchOnce({
      ...successPayload,
      data: {
        ...successPayload.data,
        warnings: ['Listing has not been AI-analyzed. Run analysis first for better results.'],
      },
    });
    render(<ResaleContentEditor listingId="lst-1" />);
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));

    await waitFor(() =>
      expect(screen.getByText(/Run analysis first for better results/)).toBeInTheDocument()
    );
  });

  it('shows the error detail when the API responds with success=false', async () => {
    mockFetchOnce(
      { success: false, error: { detail: 'Resale content generation is only available once the opportunity has been purchased.' } },
      false
    );
    render(<ResaleContentEditor listingId="lst-1" />);
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));

    await waitFor(() =>
      expect(screen.getByText(/once the opportunity has been purchased/i)).toBeInTheDocument()
    );
  });

  it('sends useLLM=false when the AI checkbox is unchecked before generating', async () => {
    mockFetchOnce(successPayload);
    render(<ResaleContentEditor listingId="lst-1" />);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.useLLM).toBe(false);
  });

  it('onSave receives the current title, description, and platform', async () => {
    const onSave = jest.fn();
    mockFetchOnce(successPayload);
    render(<ResaleContentEditor listingId="lst-1" onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));

    await waitFor(() =>
      expect(
        (screen.getByPlaceholderText(/Generated title appears here/i) as HTMLInputElement).value
      ).toBe('Apple iPhone 14 256GB - Good Condition')
    );

    // User edits the title before saving — onSave must see the edited value.
    fireEvent.change(screen.getByPlaceholderText(/Generated title appears here/i), {
      target: { value: 'Edited title' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save to Queue/i }));

    expect(onSave).toHaveBeenCalledWith(
      'Edited title',
      'Great phone, lightly used. Local pickup available.',
      'ebay'
    );
  });

  it('Save button is disabled when title or description is empty', () => {
    render(<ResaleContentEditor listingId="lst-1" />);
    const saveButton = screen.getByRole('button', { name: /Save to Queue/i });
    expect(saveButton).toBeDisabled();
  });
});
