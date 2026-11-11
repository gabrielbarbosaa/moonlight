'use client';

import type { Block, BlockType, PageContent } from '@moonlight/schemas';
import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import {
  BLOCK_HINTS,
  BLOCK_ICONS,
  BLOCK_LABELS,
  createBlock,
  describeBlock,
  moveItem,
} from '@/lib/page-editor';
import { BlockForm } from './block-forms';

const BLOCK_TYPES = Object.keys(BLOCK_LABELS) as BlockType[];

export function BlocksPanel({
  page,
  maxBlocks,
  onChange,
}: {
  page: PageContent;
  maxBlocks: number;
  onChange: (page: PageContent) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const blocks = page.blocks;
  const atLimit = blocks.length >= maxBlocks;

  const setBlocks = (next: Block[]) => onChange({ ...page, blocks: next });
  const updateBlock = (index: number, block: Block) =>
    setBlocks(blocks.map((current, i) => (i === index ? block : current)));
  const finishDrag = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const add = (type: BlockType) => {
    const block = createBlock(type);
    setBlocks([...blocks, block]);
    setOpenId(block.id);
  };

  return (
    <div>
      {blocks.length === 0 && (
        <div className="empty" style={{ marginBottom: 12 }}>
          Sua página está vazia. Adicione o primeiro bloco abaixo.
        </div>
      )}

      {blocks.map((block, index) => {
        const open = openId === block.id;
        return (
          <div
            key={block.id}
            className="block-card"
            data-dragging={dragIndex === index ? 'true' : 'false'}
            data-over={
              overIndex === index && dragIndex !== null && dragIndex !== index ? 'true' : 'false'
            }
            onDragOver={(event) => {
              if (dragIndex === null) return;
              event.preventDefault();
              setOverIndex(index);
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (dragIndex !== null && dragIndex !== index)
                setBlocks(moveItem(blocks, dragIndex, index));
              finishDrag();
            }}
          >
            <div className="block-card-head">
              <span
                className="block-handle"
                draggable
                aria-hidden="true"
                title="Arraste para reordenar"
                onDragStart={(event) => {
                  setDragIndex(index);
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', String(index));
                  const card = (event.currentTarget as HTMLElement).closest('.block-card');
                  if (card) event.dataTransfer.setDragImage(card as HTMLElement, 24, 24);
                }}
                onDragEnd={finishDrag}
              >
                <Icon name="grip" />
              </span>
              <span className="icon-tile" style={{ width: 34, height: 34, fontSize: '1rem' }}>
                <Icon name={BLOCK_ICONS[block.type]} />
              </span>
              <button
                type="button"
                className="block-title-button"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : block.id)}
              >
                <span className="block-title">
                  <strong>{BLOCK_LABELS[block.type]}</strong>
                  <span>{describeBlock(block)}</span>
                </span>
              </button>
              <span className="block-actions">
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Subir ${BLOCK_LABELS[block.type]}`}
                  disabled={index === 0}
                  onClick={() => setBlocks(moveItem(blocks, index, index - 1))}
                >
                  <Icon name="up" />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Descer ${BLOCK_LABELS[block.type]}`}
                  disabled={index === blocks.length - 1}
                  onClick={() => setBlocks(moveItem(blocks, index, index + 1))}
                >
                  <Icon name="down" />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remover ${BLOCK_LABELS[block.type]}`}
                  onClick={() => setBlocks(blocks.filter((_, i) => i !== index))}
                >
                  <Icon name="trash" />
                </button>
              </span>
            </div>
            {open && (
              <div className="block-body">
                <BlockForm
                  block={block}
                  theme={page.theme}
                  onChange={(next) => updateBlock(index, next)}
                />
              </div>
            )}
          </div>
        );
      })}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <strong>Adicionar bloco</strong>
          <span className="hint" style={{ margin: 0 }}>
            {blocks.length} de {maxBlocks} blocos
            {atLimit && (
              <>
                {' · '}
                <Link href="/admin/billing">Ver planos</Link>
              </>
            )}
          </span>
        </div>
        <div className="add-grid">
          {BLOCK_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              disabled={atLimit}
              title={BLOCK_HINTS[type]}
              onClick={() => add(type)}
            >
              <Icon name={BLOCK_ICONS[type]} />
              {BLOCK_LABELS[type]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
