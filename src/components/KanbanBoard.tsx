/**
 * KanbanBoard.tsx - Drag-and-drop Kanban board for opportunities
 * @author Stephen Boyett
 * @company Axovia AI
 */
'use client';

import React, { useCallback } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import {
  DollarSign,
  TrendingUp,
  Star,
  ExternalLink,
  Send,
} from 'lucide-react';

interface Listing {
  id: string;
  title: string;
  askingPrice: number;
  profitPotential: number | null;
  valueScore: number | null;
  platform: string;
  url: string;
  imageUrls: string | null;
}

export interface KanbanOpportunity {
  id: string;
  listingId: string;
  status: string;
  listing: Listing;
}

export interface KanbanBoardProps {
  opportunities: KanbanOpportunity[];
  onStatusChange: (id: string, newStatus: string) => Promise<void>;
  /**
   * Optional cross-post handler. When provided, the Kanban renders a
   * "Cross-Post" button on PURCHASED and LISTED cards. The parent owns the
   * modal state so this component stays presentational. The handler is only
   * wired up when the user has a tier that permits cross-listing — callers
   * should omit it for FREE users.
   */
  onCrossPost?: (opportunity: KanbanOpportunity) => void;
}

const COLUMNS = [
  { id: 'IDENTIFIED', label: 'New',       badgeClass: 'fp-badge fp-badge-blue',   headerColor: 'rgba(96,165,250,0.15)',  borderColor: 'rgba(96,165,250,0.25)' },
  { id: 'CONTACTED',  label: 'Contacted', badgeClass: 'fp-badge fp-badge-yellow', headerColor: 'rgba(251,191,36,0.12)',  borderColor: 'rgba(251,191,36,0.25)' },
  { id: 'PURCHASED',  label: 'Purchased', badgeClass: 'fp-badge fp-badge-purple', headerColor: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.3)'  },
  { id: 'LISTED',     label: 'Listed',    badgeClass: 'fp-badge fp-badge-orange', headerColor: 'rgba(251,146,60,0.12)',  borderColor: 'rgba(251,146,60,0.25)' },
  { id: 'SOLD',       label: 'Sold',      badgeClass: 'fp-badge fp-badge-green',  headerColor: 'rgba(52,211,153,0.12)', borderColor: 'rgba(52,211,153,0.25)' },
  { id: 'PASSED',     label: 'Passed',    badgeClass: 'fp-badge fp-badge-gray',   headerColor: 'rgba(148,163,184,0.08)', borderColor: 'rgba(148,163,184,0.15)' },
] as const;

// Columns where the Cross-Post button should render. PURCHASED = user owns
// the item and is ready to list. LISTED = item is up on source platform and
// the user may want to add more platforms to maximize reach.
const CROSS_POST_ALLOWED_STATUSES = new Set(['PURCHASED', 'LISTED']);

function getPlatformIcon(platform: string) {
  const p = platform.toLowerCase();
  if (p.includes('ebay')) return '🏷️';
  if (p.includes('facebook') || p.includes('marketplace')) return '📘';
  if (p.includes('craigslist')) return '📋';
  if (p.includes('offerup')) return '🟢';
  if (p.includes('mercari')) return '🔴';
  if (p.includes('poshmark')) return '👗';
  return '🛒';
}

function getFirstImage(imageUrls: string | null): string | null {
  if (!imageUrls) return null;
  try {
    const parsed = JSON.parse(imageUrls);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
  } catch {
    return null;
  }
}

export default function KanbanBoard({
  opportunities,
  onStatusChange,
  onCrossPost,
}: KanbanBoardProps) {
  const groupedOpportunities = React.useMemo(() => {
    const grouped: Record<string, KanbanOpportunity[]> = {};
    for (const col of COLUMNS) {
      grouped[col.id] = [];
    }
    for (const opp of opportunities) {
      // Map legacy statuses
      const status = opp.status === 'NEW' || opp.status === 'OPPORTUNITY' ? 'IDENTIFIED' : opp.status;
      if (grouped[status]) {
        grouped[status].push(opp);
      } else {
        // Unknown status goes to first column
        grouped['IDENTIFIED'].push(opp);
      }
    }
    return grouped;
  }, [opportunities]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { draggableId, destination } = result;
      if (!destination) return;
      const newStatus = destination.droppableId;
      const opp = opportunities.find((o) => o.id === draggableId);
      if (!opp) return;
      const currentStatus = opp.status === 'NEW' || opp.status === 'OPPORTUNITY' ? 'IDENTIFIED' : opp.status;
      if (currentStatus === newStatus) return;
      onStatusChange(draggableId, newStatus);
    },
    [opportunities, onStatusChange]
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4" data-testid="kanban-board">
        {COLUMNS.map((col) => {
          const items = groupedOpportunities[col.id] || [];
          const showCrossPost =
            !!onCrossPost && CROSS_POST_ALLOWED_STATUSES.has(col.id);
          return (
            <div
              key={col.id}
              className="flex-shrink-0 w-72"
              style={{ borderRadius: 12 }}
            >
              {/* Column Header */}
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${col.borderColor}`, background: col.headerColor, borderRadius: '12px 12px 0 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8' }}>
                    {col.label}
                  </span>
                  <span className={col.badgeClass} style={{ fontSize: 10 }}>
                    {items.length}
                  </span>
                </div>
              </div>

              {/* Droppable Area */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="fp-glass-sm fp-scroll"
                    style={{
                      minHeight: 200,
                      maxHeight: 'calc(100vh - 220px)',
                      overflowY: 'auto',
                      padding: '8px',
                      borderRadius: '0 0 12px 12px',
                      border: `1px solid ${col.borderColor}`,
                      borderTop: 'none',
                      background: snapshot.isDraggingOver ? 'rgba(255,255,255,0.05)' : undefined,
                    }}
                  >
                    {/* Empty column placeholder */}
                    {items.length === 0 && !snapshot.isDraggingOver && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 12px', textAlign: 'center', opacity: 0.4 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 18 }}>📭</span>
                        </div>
                        <p style={{ fontSize: 11, color: '#64748b' }}>Drag cards here</p>
                      </div>
                    )}
                    {items.map((opp, index) => {
                      const image = getFirstImage(opp.listing.imageUrls);
                      return (
                        <Draggable key={opp.id} draggableId={opp.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="fp-glass"
                              style={{
                                ...provided.draggableProps.style,
                                marginBottom: 8,
                                borderRadius: 12,
                                overflow: 'hidden',
                                cursor: snapshot.isDragging ? 'grabbing' : 'grab',
                              }}
                              aria-label={opp.listing.title}
                              aria-roledescription="draggable card"
                              data-testid="kanban-card"
                            >
                              {/* Card Image */}
                              {image && (
                                <img
                                  src={image}
                                  alt={opp.listing.title}
                                  className="w-full h-24 object-cover rounded-md mb-2 ring-1 ring-white/10"
                                />
                              )}

                              {/* Title + Platform */}
                              <div className="flex items-start gap-2 mb-2" style={{ padding: image ? '0 12px 8px' : '12px 12px 0' }}>
                                <span className="text-base" title={opp.listing.platform}>
                                  {getPlatformIcon(opp.listing.platform)}
                                </span>
                                <h4 style={{ fontWeight: 600, fontSize: 13, color: '#e2e8f0', marginBottom: 8, lineHeight: 1.4 }} className="line-clamp-2 flex-1">
                                  {opp.listing.title}
                                </h4>
                              </div>

                              {/* Metrics */}
                              <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <DollarSign className="w-3 h-3" style={{ color: '#475569' }} />
                                  <span style={{ fontSize: 11, color: '#475569' }}>Asking:</span>
                                  <span style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}>
                                    ${opp.listing.askingPrice.toFixed(0)}
                                  </span>
                                </div>
                                {opp.listing.profitPotential != null && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <TrendingUp className="w-3 h-3" style={{ color: '#475569' }} />
                                    <span style={{ fontSize: 11, color: '#475569' }}>Profit:</span>
                                    <span className="fp-grad-green" style={{ fontWeight: 700, fontSize: 15 }}>
                                      +${opp.listing.profitPotential.toFixed(0)}
                                    </span>
                                  </div>
                                )}
                                {opp.listing.valueScore != null && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Star className="w-3 h-3" style={{ color: '#475569' }} />
                                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Score:</span>
                                    <span style={{ fontWeight: 600, fontSize: 13, color: '#8b5cf6' }}>
                                      {opp.listing.valueScore.toFixed(0)}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div style={{ padding: '0 12px 12px', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <a
                                  href={opp.listing.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#8b5cf6', textDecoration: 'none' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  View
                                </a>
                                {showCrossPost && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onCrossPost?.(opp);
                                    }}
                                    className="flex items-center gap-1 rounded border border-blue-400/40 bg-blue-500/20 px-2 py-0.5 text-xs text-blue-200 hover:bg-blue-500/40 hover:text-white transition-colors"
                                    data-testid="kanban-cross-post-button"
                                    aria-label={`Cross-post ${opp.listing.title}`}
                                  >
                                    <Send className="w-3 h-3" />
                                    Cross-Post
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
