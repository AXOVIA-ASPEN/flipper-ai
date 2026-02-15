/**
 * @file Unit tests for OpportunityCard component
 * @author Stephen Boyett
 * @company Axovia AI
 */

import { render, screen, fireEvent } from '@testing-library/react';
import OpportunityCard from '@/components/opportunities/OpportunityCard';
import '@testing-library/jest-dom';

const mockOpportunity = {
  id: 'opp-123',
  title: 'Vintage Camera',
  description: 'Classic 35mm film camera in working condition',
  sourcePrice: 50,
  estimatedResalePrice: 150,
  profitMargin: 100,
  marketplace: 'CRAIGSLIST' as const,
  aiConfidence: 0.92,
  sourceUrl: 'https://craigslist.org/item/12345',
  sourceImages: [{ id: 'img-1', url: 'https://example.com/camera1.jpg', alt: 'Camera front' }],
  status: 'NEW' as const,
  createdAt: new Date('2026-02-10'),
};

describe('OpportunityCard Component', () => {
  it('should render opportunity details', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />);

    expect(screen.getByText('Vintage Camera')).toBeInTheDocument();
    expect(screen.getByText(/Classic 35mm film camera/)).toBeInTheDocument();
    expect(screen.getByText('$50')).toBeInTheDocument(); // Source price
    expect(screen.getByText('$150')).toBeInTheDocument(); // Resale estimate
    expect(screen.getByText('$100')).toBeInTheDocument(); // Profit
  });

  it('should display AI confidence score', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />);

    expect(screen.getByText(/92%/)).toBeInTheDocument(); // Confidence
  });

  it('should show marketplace badge', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />);

    expect(screen.getByText('CRAIGSLIST')).toBeInTheDocument();
  });

  it('should render source image', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />);

    const image = screen.getByAltText('Camera front');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', expect.stringContaining('camera1.jpg'));
  });

  it('should call onPursue when pursue button clicked', () => {
    const handlePursue = jest.fn();
    render(<OpportunityCard opportunity={mockOpportunity} onPursue={handlePursue} />);

    const pursueButton = screen.getByRole('button', { name: /pursue/i });
    fireEvent.click(pursueButton);

    expect(handlePursue).toHaveBeenCalledWith('opp-123');
  });

  it('should call onArchive when archive button clicked', () => {
    const handleArchive = jest.fn();
    render(<OpportunityCard opportunity={mockOpportunity} onArchive={handleArchive} />);

    const archiveButton = screen.getByRole('button', { name: /archive/i });
    fireEvent.click(archiveButton);

    expect(handleArchive).toHaveBeenCalledWith('opp-123');
  });

  it('should open source URL in new tab when clicked', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />);

    const sourceLink = screen.getByRole('link', { name: /view source/i });
    expect(sourceLink).toHaveAttribute('href', 'https://craigslist.org/item/12345');
    expect(sourceLink).toHaveAttribute('target', '_blank');
  });

  it('should highlight high confidence opportunities', () => {
    const highConfOpp = { ...mockOpportunity, aiConfidence: 0.95 };
    const { container } = render(<OpportunityCard opportunity={highConfOpp} />);

    // Check for high-confidence styling class
    expect(container.firstChild).toHaveClass('border-green-500');
  });

  it('should show warning for low confidence opportunities', () => {
    const lowConfOpp = { ...mockOpportunity, aiConfidence: 0.65 };
    render(<OpportunityCard opportunity={lowConfOpp} />);

    expect(screen.getByText(/low confidence/i)).toBeInTheDocument();
  });

  it('should disable actions if already pursuing', () => {
    const pursuingOpp = { ...mockOpportunity, status: 'PURSUING' };
    render(<OpportunityCard opportunity={pursuingOpp} />);

    const pursueButton = screen.getByRole('button', { name: /pursue/i });
    expect(pursueButton).toBeDisabled();
  });

  it('should show linked listing badge when listed', () => {
    const listedOpp = {
      ...mockOpportunity,
      status: 'LISTED',
      linkedListingId: 'listing-456',
    };
    render(<OpportunityCard opportunity={listedOpp} />);

    expect(screen.getByText(/listed/i)).toBeInTheDocument();
  });

  it('should format dates correctly', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />);

    // Check for human-readable date (e.g., "3 days ago")
    expect(screen.getByText(/days ago|hours ago|just now/i)).toBeInTheDocument();
  });

  it('should handle missing images gracefully', () => {
    const noImageOpp = { ...mockOpportunity, sourceImages: [] };
    render(<OpportunityCard opportunity={noImageOpp} />);

    // Should show placeholder image
    const placeholder = screen.getByAltText(/no image/i);
    expect(placeholder).toBeInTheDocument();
  });
});
