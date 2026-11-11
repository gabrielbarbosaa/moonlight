'use client';

import type { ReactNode } from 'react';
import { Icon } from '@/components/icons';
import { moveItem, newId } from '@/lib/page-editor';

export function ItemList<T extends { id: string }>({
  items,
  onChange,
  itemName,
  max,
  addLabel,
  createItem,
  children,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  itemName: string;
  max: number;
  addLabel: string;
  createItem: (id: string) => T;
  children: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
}) {
  return (
    <>
      {items.map((item, index) => (
        <div
          key={item.id}
          style={{
            marginTop: 12,
            padding: '4px 12px 12px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <strong style={{ fontSize: '0.85rem' }}>
              {itemName} {index + 1}
            </strong>
            <span className="block-actions">
              <button
                type="button"
                className="icon-button"
                aria-label={`Subir ${itemName.toLowerCase()} ${index + 1}`}
                disabled={index === 0}
                onClick={() => onChange(moveItem(items, index, index - 1))}
              >
                <Icon name="up" />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Descer ${itemName.toLowerCase()} ${index + 1}`}
                disabled={index === items.length - 1}
                onClick={() => onChange(moveItem(items, index, index + 1))}
              >
                <Icon name="down" />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Remover ${itemName.toLowerCase()} ${index + 1}`}
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                <Icon name="trash" />
              </button>
            </span>
          </div>
          {children(
            item,
            (patch) => onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it))),
            index,
          )}
        </div>
      ))}
      <button
        type="button"
        disabled={items.length >= max}
        style={{ marginTop: 12 }}
        onClick={() => onChange([...items, createItem(newId())])}
      >
        <Icon name="plus" />
        {addLabel}
      </button>
    </>
  );
}
