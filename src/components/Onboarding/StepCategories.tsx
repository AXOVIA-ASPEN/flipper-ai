'use client';

/**
 * StepCategories — Select niche categories to focus on.
 * Author: ASPEN
 * Company: Axovia AI
 */

export const CATEGORIES = [
  { id: 'electronics', label: 'Electronics', icon: '📱' },
  { id: 'clothing', label: 'Clothing & Apparel', icon: '👕' },
  { id: 'toys', label: 'Toys & Games', icon: '🧸' },
  { id: 'furniture', label: 'Furniture', icon: '🪑' },
  { id: 'tools', label: 'Tools & Hardware', icon: '🔧' },
  { id: 'collectibles', label: 'Collectibles', icon: '🏆' },
  { id: 'books', label: 'Books & Media', icon: '📚' },
  { id: 'sports', label: 'Sports & Outdoors', icon: '⚽' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

interface Props {
  selected: CategoryId[];
  onChange: (selected: CategoryId[]) => void;
}

export default function StepCategories({ selected, onChange }: Props) {
  const toggle = (id: CategoryId) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-600 text-sm">Which categories are you most interested in flipping?</p>
      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map(({ id, label, icon }) => {
          const isSelected = selected.includes(id);
          return (
            <label
              key={id}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(id)}
                className="sr-only"
                aria-label={label}
              />
              <span className="text-xl">{icon}</span>
              <span className="text-sm font-medium text-gray-800">{label}</span>
              {isSelected && <span className="ml-auto text-blue-500 text-xs">✓</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}
