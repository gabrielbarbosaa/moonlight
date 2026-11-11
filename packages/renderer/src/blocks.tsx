import type { CSSProperties, ReactElement } from 'react';
import type { Block } from '@moonlight/schemas';
import { safeHref } from './utils';

type BlockOf<T extends Block['type']> = Extract<Block, { type: T }>;

export type RenderOptions = { fallbackImage?: string };

function HeaderBlock({ block, options }: { block: BlockOf<'header'>; options: RenderOptions }) {
  const avatar = safeHref(block.props.avatarUrl) ?? options.fallbackImage;
  const showAvatar =
    avatar && (block.variant === 'with-avatar' || block.variant === 'avatar-centered');

  return (
    <header className="sbp-block sbp-header" data-variant={block.variant}>
      {showAvatar && <img className="sbp-avatar" src={avatar} alt="" loading="lazy" />}
      <h1 className="sbp-title">{block.props.title}</h1>
    </header>
  );
}

function CtaButton({ label, url, trackId }: { label?: string; url?: string; trackId: string }) {
  const href = safeHref(url);
  if (!label || !href) return null;
  return (
    <p className="sbp-hero-cta">
      <a className="sbp-btn" href={href} rel="noopener noreferrer" data-track-link={trackId}>
        {label}
      </a>
    </p>
  );
}

function HeroBlock({ block, options }: { block: BlockOf<'hero'>; options: RenderOptions }) {
  const { heading, subheading, imageUrl, ctaLabel, ctaUrl } = block.props;
  const image = safeHref(imageUrl) ?? options.fallbackImage;

  const text = (
    <div>
      <h2>{heading}</h2>
      {subheading && <p className="sbp-hero-sub">{subheading}</p>}
      <CtaButton label={ctaLabel} url={ctaUrl} trackId={`cta-${block.id}`} />
    </div>
  );

  if (block.variant === 'full-bleed') {
    const style: CSSProperties | undefined = image
      ? {
          backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("${image}")`,
        }
      : undefined;
    return (
      <section
        className="sbp-block sbp-hero"
        data-variant="full-bleed"
        data-image={image ? 'true' : 'false'}
        style={style}
      >
        {text}
      </section>
    );
  }

  if ((block.variant === 'image-right' || block.variant === 'image-left') && image) {
    return (
      <section className="sbp-block sbp-hero" data-variant={block.variant}>
        {text}
        <div className="sbp-hero-media">
          <img className="sbp-img" src={image} alt="" loading="lazy" />
        </div>
      </section>
    );
  }

  const variant =
    block.variant === 'image-right' || block.variant === 'image-left' ? 'text' : block.variant;
  return (
    <section className="sbp-block sbp-hero" data-variant={variant}>
      {text}
    </section>
  );
}

function LinksBlock({ block }: { block: BlockOf<'links'> }) {
  const className =
    block.variant === 'cards'
      ? 'sbp-link-card'
      : block.variant === 'minimal'
        ? 'sbp-link-min'
        : 'sbp-btn';

  return (
    <nav className="sbp-block sbp-links" data-variant={block.variant}>
      {block.props.items.map((item) => {
        const href = safeHref(item.url);
        if (!href) return null;
        return (
          <a
            key={item.id}
            className={className}
            href={href}
            rel="noopener noreferrer"
            data-track-link={item.id}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}

function TextBlock({ block }: { block: BlockOf<'text'> }) {
  if (block.variant === 'quote') {
    return (
      <blockquote className="sbp-block sbp-text" data-variant="quote">
        {block.props.content}
      </blockquote>
    );
  }
  return (
    <p className="sbp-block sbp-text" data-variant={block.variant}>
      {block.props.content}
    </p>
  );
}

function FooterBlock({ block }: { block: BlockOf<'footer'> }) {
  if (!block.props.text) return null;
  return (
    <footer className="sbp-block sbp-footer" data-variant={block.variant}>
      {block.props.text}
    </footer>
  );
}

export function renderBlock(block: Block, options: RenderOptions = {}): ReactElement | null {
  switch (block.type) {
    case 'header':
      return <HeaderBlock key={block.id} block={block} options={options} />;
    case 'hero':
      return <HeroBlock key={block.id} block={block} options={options} />;
    case 'links':
      return <LinksBlock key={block.id} block={block} />;
    case 'text':
      return <TextBlock key={block.id} block={block} />;
    case 'footer':
      return <FooterBlock key={block.id} block={block} />;
  }
}
