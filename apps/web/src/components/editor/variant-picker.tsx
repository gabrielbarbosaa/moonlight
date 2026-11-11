'use client';

import { BlockPreview } from '@sitebuilder/renderer';
import type { BlockType, Theme } from '@sitebuilder/schemas';
import { PLACEHOLDER_IMAGE, VARIANTS, sampleBlock } from '@/lib/page-editor';

export function VariantPicker({
  type,
  value,
  theme,
  onChange,
}: {
  type: BlockType;
  value: string;
  theme: Theme;
  onChange: (variant: string) => void;
}) {
  return (
    <div className="field" role="group" aria-label="Aparência do bloco">
      <span style={{ fontSize: '0.9rem', fontWeight: 550 }}>Aparência</span>
      <div className="variant-grid">
        {VARIANTS[type].map((option) => (
          <button
            key={option.value}
            type="button"
            className="variant-option"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            <span className="variant-thumb" aria-hidden="true">
              <span className="variant-thumb-inner" style={{ display: 'block' }}>
                <BlockPreview
                  block={sampleBlock(type, option.value)}
                  theme={theme}
                  fallbackImage={PLACEHOLDER_IMAGE}
                />
              </span>
            </span>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
