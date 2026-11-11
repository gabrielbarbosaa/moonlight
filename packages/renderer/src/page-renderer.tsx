import { pageSchema, type Block, type PageContent, type Theme } from '@sitebuilder/schemas';
import type { ReactNode } from 'react';
import { renderBlock } from './blocks';
import { RENDERER_STYLES } from './styles';
import { themeStyle } from './utils';

export type RendererFill = 'viewport' | 'container';

export function PageRenderer({
  content,
  fill = 'viewport',
  after,
}: {
  content: PageContent;
  fill?: RendererFill;
  after?: ReactNode;
}) {
  const parsed = pageSchema.safeParse(content);
  if (!parsed.success) return null;

  const { theme, blocks } = parsed.data;

  return (
    <main className="sbp" data-fill={fill} data-btn={theme.buttonStyle} style={themeStyle(theme)}>
      <style>{RENDERER_STYLES}</style>
      <div className="sbp-wrap">
        {blocks.map((block) => renderBlock(block))}
        {after && <div className="sbp-extra">{after}</div>}
      </div>
    </main>
  );
}

export function BlockPreview({
  block,
  theme,
  fallbackImage,
}: {
  block: Block;
  theme: Theme;
  fallbackImage?: string;
}) {
  return (
    <div
      className="sbp"
      data-fill="container"
      data-btn={theme.buttonStyle}
      style={themeStyle(theme)}
    >
      <style>{RENDERER_STYLES}</style>
      <div className="sbp-wrap" style={{ padding: 20 }}>
        {renderBlock(block, { fallbackImage })}
      </div>
    </div>
  );
}
