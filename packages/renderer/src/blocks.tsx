import type { CSSProperties, ReactElement } from 'react';
import { SOCIAL_LABELS, parseVideoUrl, type Block, type SocialNetwork } from '@moonlight/schemas';
import { BRAND_ICONS } from './brand-icons';
import { luminance, readableTextColor, safeHref } from './utils';

type BlockOf<T extends Block['type']> = Extract<Block, { type: T }>;

export type RenderOptions = { fallbackImage?: string; thumbnail?: boolean };

function animate(block: Block): { 'data-animate'?: string } {
  return block.animation && block.animation !== 'none' ? { 'data-animate': block.animation } : {};
}

function HeaderBlock({ block, options }: { block: BlockOf<'header'>; options: RenderOptions }) {
  const avatar = safeHref(block.props.avatarUrl) ?? options.fallbackImage;
  const showAvatar =
    avatar && (block.variant === 'with-avatar' || block.variant === 'avatar-centered');

  return (
    <header className="sbp-block sbp-header" data-variant={block.variant} {...animate(block)}>
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
        {...animate(block)}
        data-image={image ? 'true' : 'false'}
        style={style}
      >
        {text}
      </section>
    );
  }

  if ((block.variant === 'image-right' || block.variant === 'image-left') && image) {
    return (
      <section className="sbp-block sbp-hero" data-variant={block.variant} {...animate(block)}>
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
    <section className="sbp-block sbp-hero" data-variant={variant} {...animate(block)}>
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
    <nav className="sbp-block sbp-links" data-variant={block.variant} {...animate(block)}>
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
      <blockquote className="sbp-block sbp-text" data-variant="quote" {...animate(block)}>
        {block.props.content}
      </blockquote>
    );
  }
  return (
    <p className="sbp-block sbp-text" data-variant={block.variant} {...animate(block)}>
      {block.props.content}
    </p>
  );
}

function FooterBlock({ block }: { block: BlockOf<'footer'> }) {
  if (!block.props.text) return null;
  return (
    <footer className="sbp-block sbp-footer" data-variant={block.variant} {...animate(block)}>
      {block.props.text}
    </footer>
  );
}

const STROKE_ICONS: Record<string, ReactElement> = {
  email: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6.5L20.5 7" />
    </>
  ),
  website: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 2.4 4 5.6 4 9s-1.4 6.6-4 9c-2.6-2.4-4-5.6-4-9s1.4-6.6 4-9z" />
    </>
  ),
};

function SocialIcon({ network }: { network: SocialNetwork }) {
  const stroke = STROKE_ICONS[network];
  if (stroke) {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {stroke}
      </svg>
    );
  }
  const brand = BRAND_ICONS[network];
  if (!brand) return null;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={brand.path} />
    </svg>
  );
}

function socialColors(
  network: SocialNetwork,
  mode: BlockOf<'social'>['props']['colorMode'],
  custom: string | undefined,
): CSSProperties {
  if (mode === 'brand' && BRAND_ICONS[network]) {
    const raw = BRAND_ICONS[network].hex;
    const light = luminance(raw);
    return {
      '--ic': light < 0.18 || light > 0.78 ? 'var(--sb-text)' : raw,
      '--ib': raw,
      '--ibt': readableTextColor(raw),
    } as CSSProperties;
  }
  const base = mode === 'custom' && custom ? custom : 'var(--sb-primary)';
  const onBase = mode === 'custom' && custom ? readableTextColor(custom) : 'var(--sb-on-primary)';
  return { '--ic': base, '--ib': base, '--ibt': onBase } as CSSProperties;
}

function SocialBlock({ block }: { block: BlockOf<'social'> }) {
  const showLabel = block.variant === 'pills' || block.variant === 'list';
  const items = block.props.items.flatMap((item) => {
    const href = safeHref(item.url);
    return href ? [{ item, href }] : [];
  });
  if (items.length === 0) return null;

  return (
    <nav
      className="sbp-block sbp-social"
      data-variant={block.variant}
      aria-label="Redes sociais"
      {...animate(block)}
    >
      {items.map(({ item, href }) => {
        const name = item.label || SOCIAL_LABELS[item.network];
        return (
          <a
            key={item.id}
            className="sbp-social-item"
            href={href}
            rel="noopener noreferrer me"
            aria-label={name}
            title={name}
            data-track-link={item.id}
            style={socialColors(item.network, block.props.colorMode, block.props.color)}
          >
            <SocialIcon network={item.network} />
            {showLabel && <span>{name}</span>}
          </a>
        );
      })}
    </nav>
  );
}

function SectionTitle({ title }: { title?: string }) {
  return title ? <h2 className="sbp-section-title">{title}</h2> : null;
}

function LinklistBlock({ block, options }: { block: BlockOf<'linklist'>; options: RenderOptions }) {
  const items = block.props.items.flatMap((item) => {
    const href = safeHref(item.url);
    return href ? [{ item, href }] : [];
  });
  if (items.length === 0) return null;

  return (
    <section className="sbp-block sbp-linklist" {...animate(block)}>
      <SectionTitle title={block.props.title} />
      <nav className="sbp-ll" data-variant={block.variant}>
        {items.map(({ item, href }, index) => {
          const image = safeHref(item.imageUrl) ?? options.fallbackImage;
          return (
            <a
              key={item.id}
              className="sbp-ll-item"
              href={href}
              rel="noopener noreferrer"
              data-track-link={item.id}
            >
              {block.variant === 'thumbs' && image && (
                <img className="sbp-ll-thumb" src={image} alt="" loading="lazy" />
              )}
              {block.variant === 'numbered' && <span className="sbp-ll-num">{index + 1}</span>}
              <span className="sbp-ll-text">
                <span className="sbp-ll-label">{item.label}</span>
                {item.description && <span className="sbp-ll-desc">{item.description}</span>}
              </span>
            </a>
          );
        })}
      </nav>
    </section>
  );
}

function CarouselBlock({ block, options }: { block: BlockOf<'carousel'>; options: RenderOptions }) {
  const slides = block.props.items.flatMap((item) => {
    const src = safeHref(item.imageUrl) ?? options.fallbackImage;
    return src ? [{ item, src }] : [];
  });
  if (slides.length === 0) return null;

  return (
    <section className="sbp-block sbp-carousel" data-variant={block.variant} {...animate(block)}>
      <SectionTitle title={block.props.title} />
      <div className="sbp-carousel-frame">
        <ul
          className="sbp-carousel-track"
          tabIndex={0}
          aria-label={block.props.title || 'Carrossel de imagens'}
        >
          {slides.map(({ item, src }) => {
            const href = safeHref(item.linkUrl);
            const image = <img src={src} alt={item.caption ?? ''} loading="lazy" />;
            return (
              <li key={item.id} className="sbp-carousel-slide">
                <figure>
                  {href ? (
                    <a href={href} rel="noopener noreferrer" data-track-link={item.id}>
                      {image}
                    </a>
                  ) : (
                    image
                  )}
                  {item.caption && <figcaption>{item.caption}</figcaption>}
                </figure>
              </li>
            );
          })}
        </ul>
        {slides.length > 1 && !options.thumbnail && (
          <>
            <button
              type="button"
              className="sbp-carousel-nav"
              data-carousel-dir="-1"
              data-side="prev"
              aria-label="Anterior"
            >
              &#8249;
            </button>
            <button
              type="button"
              className="sbp-carousel-nav"
              data-carousel-dir="1"
              data-side="next"
              aria-label="Próxima"
            >
              &#8250;
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function galleryColumns(count: number): [number, number] {
  const wide = count <= 5 ? count : count === 9 ? 3 : count === 10 ? 5 : count <= 6 ? 3 : 4;
  const narrow = count <= 2 ? count : count === 4 || count === 8 ? 2 : 3;
  return [Math.max(wide, 1), Math.max(narrow, 1)];
}

function GalleryBlock({ block, options }: { block: BlockOf<'gallery'>; options: RenderOptions }) {
  const tiles = block.props.items.flatMap((item) => {
    const src = safeHref(item.imageUrl) ?? options.fallbackImage;
    return src ? [{ item, src, full: safeHref(item.imageUrl) }] : [];
  });
  if (tiles.length === 0) return null;

  const variant = block.variant === 'featured' && tiles.length < 3 ? 'grid' : block.variant;
  const gridCount = variant === 'featured' ? tiles.length - 1 : tiles.length;
  const [wide, narrow] = galleryColumns(gridCount);
  const columns = { '--cols': wide, '--cols-s': narrow } as CSSProperties;

  return (
    <section
      className="sbp-block sbp-gallery"
      data-variant={variant}
      {...animate(block)}
      data-single={tiles.length === 1 ? 'true' : undefined}
    >
      <SectionTitle title={block.props.title} />
      <ul className="sbp-gallery-grid" style={columns}>
        {tiles.map(({ item, src, full }) => {
          const image = <img src={src} alt={item.caption ?? ''} loading="lazy" />;
          return (
            <li key={item.id}>
              {full ? (
                <a href={full} target="_blank" rel="noopener noreferrer">
                  {image}
                </a>
              ) : (
                image
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FaqBlock({ block }: { block: BlockOf<'faq'> }) {
  if (block.props.items.length === 0) return null;

  return (
    <section className="sbp-block sbp-faq" data-variant={block.variant} {...animate(block)}>
      <SectionTitle title={block.props.title} />
      {block.props.items.map((item) =>
        block.variant === 'plain' ? (
          <div key={item.id} className="sbp-faq-item">
            <h3 className="sbp-faq-q">{item.question}</h3>
            <p className="sbp-faq-a">{item.answer}</p>
          </div>
        ) : (
          <details key={item.id} className="sbp-faq-item">
            <summary className="sbp-faq-q">{item.question}</summary>
            <p className="sbp-faq-a">{item.answer}</p>
          </details>
        ),
      )}
    </section>
  );
}

function VideoBlock({ block, options }: { block: BlockOf<'video'>; options: RenderOptions }) {
  const video = parseVideoUrl(block.props.url);
  if (!video) return null;
  const title = block.props.title || 'Vídeo';

  return (
    <section className="sbp-block sbp-video" data-variant={block.variant} {...animate(block)}>
      <div className="sbp-video-frame" data-thumbnail={options.thumbnail ? 'true' : undefined}>
        {options.thumbnail ? (
          <span className="sbp-video-play" aria-hidden="true" />
        ) : (
          <iframe
            src={video.src}
            title={title}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          />
        )}
      </div>
      {block.props.title && block.variant === 'card' && (
        <p className="sbp-video-title">{block.props.title}</p>
      )}
    </section>
  );
}

function DividerBlock({ block }: { block: BlockOf<'divider'> }) {
  return (
    <div
      className="sbp-block sbp-divider"
      data-variant={block.variant}
      aria-hidden="true"
      {...animate(block)}
    />
  );
}

export function renderBlock(block: Block, options: RenderOptions = {}): ReactElement | null {
  switch (block.type) {
    case 'social':
      return <SocialBlock key={block.id} block={block} />;
    case 'linklist':
      return <LinklistBlock key={block.id} block={block} options={options} />;
    case 'carousel':
      return <CarouselBlock key={block.id} block={block} options={options} />;
    case 'gallery':
      return <GalleryBlock key={block.id} block={block} options={options} />;
    case 'faq':
      return <FaqBlock key={block.id} block={block} />;
    case 'video':
      return <VideoBlock key={block.id} block={block} options={options} />;
    case 'divider':
      return <DividerBlock key={block.id} block={block} />;
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
