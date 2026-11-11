import { pageSchema, type PageContent } from '@sitebuilder/schemas';
import { renderBlock } from './blocks';
import { FONT_STACKS, readableTextColor } from './utils';

export function PageRenderer({ content }: { content: PageContent }) {
  const parsed = pageSchema.safeParse(content);
  if (!parsed.success) return null;

  const { theme, blocks } = parsed.data;

  return (
    <main
      style={{
        minHeight: '100vh',
        background: theme.background,
        color: readableTextColor(theme.background),
        fontFamily: FONT_STACKS[theme.font],
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px' }}>
        {blocks.map((block) => renderBlock(block, theme))}
      </div>
    </main>
  );
}
