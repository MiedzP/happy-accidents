export interface Medium {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

export const MEDIUMS: Medium[] = [
  { id: 'pencil',         label: 'Pencil',         emoji: '✏️',  description: 'Graphite on paper' },
  { id: 'colored_pencil', label: 'Colored Pencil', emoji: '🖍️',  description: 'Layered color' },
  { id: 'watercolor',     label: 'Watercolor',     emoji: '💧',  description: 'Washes & blooms' },
  { id: 'acrylic',        label: 'Acrylic',        emoji: '🎨',  description: 'Fast-drying paint' },
  { id: 'oil',            label: 'Oil Paint',      emoji: '🖌️',  description: 'Rich, blendable' },
  { id: 'charcoal',       label: 'Charcoal',       emoji: '⬛',  description: 'Bold and smudgy' },
  { id: 'ink',            label: 'Ink',            emoji: '🖊️',  description: 'Precise line work' },
  { id: 'digital',        label: 'Digital',        emoji: '💻',  description: 'Any digital app' },
  { id: 'pastel',         label: 'Pastel',         emoji: '🌸',  description: 'Soft and powdery' },
];
