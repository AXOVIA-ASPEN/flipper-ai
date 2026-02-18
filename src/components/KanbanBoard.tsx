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

interface Opportunity {
  id: string;
  listingId: string;
  status: string;
  listing: Listing;
}

export interface KanbanBoardProps {
  opportunities: Opportunity[];
  onStatusChange: (id: string, newStatus: string) => Promise<void>;
}

const COLUMNS = [
  { id: 'IDENTIFIED', label: 'New', color: 'from-blue-400 to-blue-600', border: 'border-blue-400/50', shadow: 'shadow-blue-500/20', count: 'bg-blue-500/30 text-blue-200' },
  { id: 'CONTACTED', label: 'Contacted', color: 'from-yellow-400 to-orange-500', border: 'border-yellow-400/50', shadow: 'shadow-yellow-500/20', count: 'bg-yellow-500/30 text-yellow-200' },
  { id: 'PURCHASED', label: 'Purchased', color: 'from-purple-400 to-purple-600', border: 'border-purple-400/50', shadow: 'shadow-purple-500/20', count: 'bg-purple-500/30 text-purple-200' },
  { id: 'LISTED', label: 'Listed', color: 'from-orange-400 to-pink-500', border: 'border-orange-400/50', shadow: 'shadow-orange-500/20', count: 'bg-orange-500/30 text-orange-200' },
  { id: 'SOLD', label: 'Sold', color: 'from-green-400 to-emerald-600', border: 'border-green-400/50', shadow: 'shadow-green-500/20', count: 'bg-green-500/30 text-green-200' },
] as const;

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

export default function KanbanBoard({ opportunities, onStatusChange }: KanbanBoardProps) {
  const groupedOpportunities = React.useMemo(() => {
    const grouped: Record<string, Opportunity[]> = {};
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
          return (
            <div
              key={col.id}
              className={`flex-shrink-0 w-72 backdrop-blur-xl bg-white/5 rounded-xl border ${col.border} ${col.shadow} shadow-lg`}
            >
              {/* Column Header */}
              <div className={`p-3 border-b border-white/10 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${col.color}`} />
                  <h3 className="text-sm font-semibold text-white">{col.label}</h3>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${col.count}`}>
                  {items.length}
                </span>
              </div>

              {/* Droppable Area */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`p-2 min-h-[200px] transition-colors duration-200 ${
                      snapshot.isDraggingOver ? 'bg-white/10' : ''
                    }`}
                  >
                    {/* Empty column placeholder */}
                    {items.length === 0 && !snapshot.isDraggingOver && (
                      <div className="flex flex-col items-center justify-center py-8 px-3 text-center opacity-40">
                        <div className="w-10 h-10 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center mb-2">
                          <span className="text-lg">📭</span>
                        </div>
                        <p className="text-xs text-blue-200/60">Drag cards here</p>
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
                              className={`mb-2 p-3 rounded-lg border border-white/10 backdrop-blur-sm transition-all duration-200 cursor-grab active:cursor-grabbing ${
                                snapshot.isDragging
                                  ? 'bg-white/20 shadow-xl scale-105 rotate-1'
                                  : 'bg-white/5 hover:bg-white/10'
                              }`}
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
                              <div className="flex items-start gap-2 mb-2">
                                <span className="text-base" title={opp.listing.platform}>
                                  {getPlatformIcon(opp.listing.platform)}
                                </span>
                                <h4 className="text-sm font-medium text-white line-clamp-2 flex-1">
                                  {opp.listing.title}
                                </h4>
                              </div>

                              {/* Metrics */}
                              <div className="flex items-center gap-3 text-xs text-blue-200/70">
                                <span className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  {opp.listing.askingPrice.toFixed(0)}
                                </span>
                                {opp.listing.profitPotential != null && (
                                  <span className="flex items-center gap-1 text-green-300">
                                    <TrendingUp className="w-3 h-3" />
                                    +${opp.listing.profitPotential.toFixed(0)}
                                  </span>
                                )}
                                {opp.listing.valueScore != null && (
                                  <span className="flex items-center gap-1 text-purple-300">
                                    <Star className="w-3 h-3" />
                                    {opp.listing.valueScore.toFixed(0)}
                                  </span>
                                )}
                              </div>

                              {/* Link */}
                              <a
                                href={opp.listing.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 flex items-center gap-1 text-xs text-blue-300 hover:text-white transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="w-3 h-3" />
                                View
                              </a>
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
