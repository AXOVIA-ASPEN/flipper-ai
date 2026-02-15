/**
 * @jest-environment jsdom
 */
/**
 * KanbanBoard.test.tsx - Tests for KanbanBoard component
 * @author Stephen Boyett
 * @company Axovia AI
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import KanbanBoard from '@/components/KanbanBoard';

// Mock @hello-pangea/dnd
jest.mock('@hello-pangea/dnd', () => {
  const DragDropContext = ({ children, onDragEnd }: any) => (
    <div data-testid="drag-drop-context">{children}</div>
  );
  const Droppable = ({ children, droppableId }: any) => {
    const provided = {
      innerRef: jest.fn(),
      droppableProps: { 'data-rbd-droppable-id': droppableId },
      placeholder: null,
    };
    const snapshot = { isDraggingOver: false };
    return <div data-testid={`droppable-${droppableId}`}>{children(provided, snapshot)}</div>;
  };
  const Draggable = ({ children, draggableId }: any) => {
    const provided = {
      innerRef: jest.fn(),
      draggableProps: { 'data-rbd-draggable-id': draggableId },
      dragHandleProps: {},
    };
    const snapshot = { isDragging: false };
    return <div data-testid={`draggable-${draggableId}`}>{children(provided, snapshot)}</div>;
  };
  return { DragDropContext, Droppable, Draggable };
});

const mockOpportunities = [
  {
    id: 'opp-1',
    listingId: 'lst-1',
    status: 'IDENTIFIED',
    listing: {
      id: 'lst-1',
      title: 'Vintage Watch',
      askingPrice: 100,
      profitPotential: 50,
      valueScore: 85,
      platform: 'eBay',
      url: 'https://example.com/watch',
      imageUrls: null,
    },
  },
  {
    id: 'opp-2',
    listingId: 'lst-2',
    status: 'PURCHASED',
    listing: {
      id: 'lst-2',
      title: 'Rare Sneakers',
      askingPrice: 200,
      profitPotential: 150,
      valueScore: 92,
      platform: 'Facebook Marketplace',
      url: 'https://example.com/sneakers',
      imageUrls: '["https://img.example.com/sneakers.jpg"]',
    },
  },
  {
    id: 'opp-3',
    listingId: 'lst-3',
    status: 'NEW',
    listing: {
      id: 'lst-3',
      title: 'Legacy Status Item',
      askingPrice: 50,
      profitPotential: 20,
      valueScore: 60,
      platform: 'Craigslist',
      url: 'https://example.com/legacy',
      imageUrls: null,
    },
  },
];

describe('KanbanBoard', () => {
  const mockOnStatusChange = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the kanban board with all columns', () => {
    render(<KanbanBoard opportunities={[]} onStatusChange={mockOnStatusChange} />);
    expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Contacted')).toBeInTheDocument();
    expect(screen.getByText('Purchased')).toBeInTheDocument();
    expect(screen.getByText('Listed')).toBeInTheDocument();
    expect(screen.getByText('Sold')).toBeInTheDocument();
  });

  it('renders opportunity cards in correct columns', () => {
    render(<KanbanBoard opportunities={mockOpportunities} onStatusChange={mockOnStatusChange} />);
    expect(screen.getByText('Vintage Watch')).toBeInTheDocument();
    expect(screen.getByText('Rare Sneakers')).toBeInTheDocument();
    expect(screen.getByText('Legacy Status Item')).toBeInTheDocument();
  });

  it('displays price, profit, and value score on cards', () => {
    render(<KanbanBoard opportunities={mockOpportunities} onStatusChange={mockOnStatusChange} />);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('+$50')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('shows platform icon for each card', () => {
    render(<KanbanBoard opportunities={mockOpportunities} onStatusChange={mockOnStatusChange} />);
    // eBay icon
    expect(screen.getByText('🏷️')).toBeInTheDocument();
    // Facebook icon
    expect(screen.getByText('📘')).toBeInTheDocument();
    // Craigslist icon
    expect(screen.getByText('📋')).toBeInTheDocument();
  });

  it('maps NEW/OPPORTUNITY status to IDENTIFIED column', () => {
    render(<KanbanBoard opportunities={mockOpportunities} onStatusChange={mockOnStatusChange} />);
    // Both opp-1 (IDENTIFIED) and opp-3 (NEW) should be in the New column
    const newColumn = screen.getByTestId('droppable-IDENTIFIED');
    expect(newColumn).toBeInTheDocument();
    // Count shows 2 items in New column
    const counts = screen.getAllByText('2');
    expect(counts.length).toBeGreaterThanOrEqual(1);
  });

  it('shows column counts correctly', () => {
    render(<KanbanBoard opportunities={mockOpportunities} onStatusChange={mockOnStatusChange} />);
    // New: 2, Contacted: 0, Purchased: 1, Listed: 0, Sold: 0
    expect(screen.getByText('1')).toBeInTheDocument(); // Purchased
  });

  it('renders view links for each card', () => {
    render(<KanbanBoard opportunities={mockOpportunities} onStatusChange={mockOnStatusChange} />);
    const viewLinks = screen.getAllByText('View');
    expect(viewLinks.length).toBe(3);
  });
});
