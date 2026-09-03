import React from 'react';
import { NoteColor, NOTE_COLORS } from '../types';
import { Check } from 'lucide-react';

interface ColorPickerProps {
  selectedColor: NoteColor;
  onSelectColor: (color: NoteColor) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onSelectColor,
  className = '',
  size = 'md',
}) => {
  const isSmall = size === 'sm';

  return (
    <div className={`flex items-center gap-1.5 p-1 ${className}`}>
      {NOTE_COLORS.map((col) => {
        const isSelected = selectedColor === col.id;
        return (
          <button
            key={col.id}
            type="button"
            title={col.name}
            onClick={(e) => {
              e.stopPropagation();
              onSelectColor(col.id);
            }}
            className={`relative rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
              isSmall ? 'w-5 h-5' : 'w-7 h-7'
            } border shadow-xs`}
            style={{
              backgroundColor: col.lightBg,
              borderColor: col.lightBorder,
            }}
            aria-label={`Select ${col.name} color`}
          >
            {isSelected && (
              <span className="absolute inset-0 flex items-center justify-center text-slate-700 dark:text-slate-900">
                <Check className={isSmall ? 'w-3 h-3 stroke-[3]' : 'w-4 h-4 stroke-[3]'} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
