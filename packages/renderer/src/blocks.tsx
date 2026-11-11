import type { CSSProperties, ReactElement } from 'react';
import type { Block, PageContent } from '@sitebuilder/schemas';
import { safeHref } from './utils';

type Theme = PageContent['theme'];
type BlockOf<T extends Block['type']> = Extract<Block, { type: T }>;

const sectionStyle: CSSProperties = { padding: '24px 0' };

function HeaderBlock({ block }: { block: BlockOf<'header'> }) {
  const avatar = safeHref(block.props.avatarUrl);
  const centered = block.variant !== 'simple';

  return (
    <header
      style={{
        ...sectionStyle,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        justifyContent: centered ? 'center' : 'flex-start',
        flexDirection: block.variant === 'centered' ? 'column' : 'row',
        textAlign: centered ? 'center' : 'left',
      }}
    >
      {block.variant === 'with-avatar' && avatar && (
        <img
          src={avatar}
          alt=""
          width={72}
          height={72}
          style={{ borderRadius: '50%', objectFit: 'cover' }}
        />
      )}
      <h1 style={{ margin: 0, fontSize: 32 }}>{block.props.title}</h1>
    </header>
  );
}

function CtaButton({ label, url, theme }: { label?: string; url?: string; theme: Theme }) {
  const href = safeHref(url);
  if (!label || !href) return null;
  return (
    <a
      href={href}
      rel="noopener noreferrer"
      style={{
        display: 'inline-block',
        marginTop: 16,
        padding: '10px 20px',
        borderRadius: 8,
        background: theme.primaryColor,
        color: '#ffffff',
        textDecoration: 'none',
        fontWeight: 600,
      }}
    >
      {label}
    </a>
  );
}

function HeroBlock({ block, theme }: { block: BlockOf<'hero'>; theme: Theme }) {
  const { heading, subheading, imageUrl, ctaLabel, ctaUrl } = block.props;
  const image = safeHref(imageUrl);

  const text = (
    <div>
      <h2 style={{ margin: 0, fontSize: 40, lineHeight: 1.1 }}>{heading}</h2>
      {subheading && <p style={{ fontSize: 18, opacity: 0.8 }}>{subheading}</p>}
      <CtaButton label={ctaLabel} url={ctaUrl} theme={theme} />
    </div>
  );

  if (block.variant === 'full-bleed') {
    return (
      <section
        style={{
          ...sectionStyle,
          padding: '72px 24px',
          borderRadius: 12,
          textAlign: 'center',
          color: image ? '#ffffff' : undefined,
          background: image
            ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("${image}") center / cover`
            : undefined,
        }}
      >
        {text}
      </section>
    );
  }

  if (block.variant === 'image-right' && image) {
    return (
      <section
        style={{
          ...sectionStyle,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 24,
          alignItems: 'center',
        }}
      >
        {text}
        <img src={image} alt="" style={{ width: '100%', borderRadius: 12, objectFit: 'cover' }} />
      </section>
    );
  }

  return <section style={sectionStyle}>{text}</section>;
}

function LinksBlock({ block, theme }: { block: BlockOf<'links'>; theme: Theme }) {
  const containerStyle: CSSProperties =
    block.variant === 'grid'
      ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }
      : block.variant === 'pills'
        ? { display: 'flex', flexWrap: 'wrap', gap: 8 }
        : { display: 'flex', flexDirection: 'column', gap: 12 };

  const itemStyle: CSSProperties = {
    display: 'block',
    padding: block.variant === 'pills' ? '8px 16px' : '14px 18px',
    borderRadius: block.variant === 'pills' ? 999 : 10,
    border: `2px solid ${theme.primaryColor}`,
    color: 'inherit',
    textAlign: 'center',
    textDecoration: 'none',
    fontWeight: 600,
  };

  return (
    <nav style={{ ...sectionStyle, ...containerStyle }}>
      {block.props.items.map((item) => {
        const href = safeHref(item.url);
        if (!href) return null;
        return (
          <a key={item.id} href={href} rel="noopener noreferrer" style={itemStyle}>
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}

function TextBlock({ block, theme }: { block: BlockOf<'text'>; theme: Theme }) {
  if (block.variant === 'quote') {
    return (
      <blockquote
        style={{
          ...sectionStyle,
          margin: 0,
          paddingLeft: 16,
          borderLeft: `4px solid ${theme.primaryColor}`,
          fontStyle: 'italic',
          whiteSpace: 'pre-wrap',
        }}
      >
        {block.props.content}
      </blockquote>
    );
  }
  return (
    <p style={{ ...sectionStyle, margin: 0, whiteSpace: 'pre-wrap' }}>{block.props.content}</p>
  );
}

function FooterBlock({ block }: { block: BlockOf<'footer'> }) {
  if (!block.props.text) return null;
  return (
    <footer
      style={{
        ...sectionStyle,
        marginTop: 16,
        borderTop: '1px solid rgba(128,128,128,0.35)',
        fontSize: 14,
        opacity: 0.75,
        textAlign: block.variant === 'columns' ? 'left' : 'center',
      }}
    >
      {block.props.text}
    </footer>
  );
}

export function renderBlock(block: Block, theme: Theme): ReactElement | null {
  switch (block.type) {
    case 'header':
      return <HeaderBlock key={block.id} block={block} />;
    case 'hero':
      return <HeroBlock key={block.id} block={block} theme={theme} />;
    case 'links':
      return <LinksBlock key={block.id} block={block} theme={theme} />;
    case 'text':
      return <TextBlock key={block.id} block={block} theme={theme} />;
    case 'footer':
      return <FooterBlock key={block.id} block={block} />;
  }
}
