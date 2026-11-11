export const RENDERER_STYLES = `
.sbp{position:relative;container-type:inline-size;min-height:100%;background-color:var(--sb-bg-color);background-image:var(--sb-bg-image);background-size:cover;background-position:center;color:var(--sb-text);font-family:var(--sb-font);line-height:1.55;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.sbp[data-fill="viewport"]{min-height:100vh}
.sbp *,.sbp *::before,.sbp *::after{box-sizing:border-box}
:where(.sbp h1,.sbp h2,.sbp h3,.sbp p,.sbp blockquote,.sbp figure){margin:0}
:where(.sbp a){color:inherit}
.sbp-wrap{max-width:var(--sb-width);margin:0 auto;padding:36px 20px 28px}
.sbp-block{margin:0 0 var(--sb-gap)}
.sbp-block:last-child{margin-bottom:0}
.sbp-img{display:block;width:100%;height:auto;border-radius:var(--sb-radius);object-fit:cover}

.sbp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 22px;font:inherit;font-weight:600;text-align:center;text-decoration:none;border:2px solid var(--sb-primary);border-radius:var(--sb-btn-radius);transition:transform .15s ease,box-shadow .15s ease,background-color .15s ease}
.sbp[data-btn="solid"] .sbp-btn{background:var(--sb-primary);color:var(--sb-on-primary)}
.sbp[data-btn="outline"] .sbp-btn{background:transparent;color:inherit}
.sbp[data-btn="soft"] .sbp-btn{background:color-mix(in srgb,var(--sb-primary) 18%,transparent);border-color:transparent;color:inherit}
.sbp-btn:hover{transform:translateY(-2px);box-shadow:0 10px 22px -12px var(--sb-primary)}
.sbp[data-btn="outline"] .sbp-btn:hover{background:color-mix(in srgb,var(--sb-primary) 14%,transparent)}
.sbp-btn:focus-visible,.sbp-link-card:focus-visible,.sbp-link-min:focus-visible{outline:3px solid color-mix(in srgb,var(--sb-primary) 60%,transparent);outline-offset:2px}

.sbp-header{display:flex;align-items:center;gap:16px}
.sbp-title{font-size:clamp(1.5rem,7cqw,2.25rem);line-height:1.15;font-weight:700;letter-spacing:-.01em}
.sbp-avatar{width:64px;height:64px;border-radius:50%;object-fit:cover;flex:none}
.sbp-header[data-variant="centered"]{justify-content:center;text-align:center}
.sbp-header[data-variant="avatar-centered"]{flex-direction:column;text-align:center}
.sbp-header[data-variant="avatar-centered"] .sbp-avatar{width:104px;height:104px}
.sbp-header[data-variant="banner"]{justify-content:center;text-align:center;padding:36px 24px;background:var(--sb-primary);color:var(--sb-on-primary);border-radius:var(--sb-radius)}

.sbp-hero h2{font-size:clamp(1.65rem,9cqw,2.8rem);line-height:1.1;font-weight:800;letter-spacing:-.02em}
.sbp-hero-sub{margin-top:12px;font-size:1.1rem;opacity:.8}
.sbp-hero-cta{margin-top:20px}
.sbp-hero[data-variant="centered"]{text-align:center}
.sbp-hero[data-variant="card"]{padding:32px 26px;border-radius:var(--sb-radius);border:1px solid color-mix(in srgb,var(--sb-text) 14%,transparent);background:color-mix(in srgb,var(--sb-text) 5%,transparent);box-shadow:0 14px 34px -22px rgba(0,0,0,.45)}
.sbp-hero[data-variant="image-right"],.sbp-hero[data-variant="image-left"]{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px;align-items:center}
.sbp-hero[data-variant="image-left"] .sbp-hero-media{order:-1}
.sbp-hero[data-variant="full-bleed"]{padding:72px 24px;text-align:center;border-radius:var(--sb-radius);background-size:cover;background-position:center}
.sbp-hero[data-variant="full-bleed"][data-image="true"]{color:#fff}
.sbp-hero[data-variant="full-bleed"][data-image="false"]{background:color-mix(in srgb,var(--sb-primary) 16%,transparent)}

.sbp-links{display:flex;flex-direction:column;gap:12px}
.sbp-links .sbp-btn{width:100%}
.sbp-links[data-variant="grid"]{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
.sbp-links[data-variant="pills"]{flex-direction:row;flex-wrap:wrap;gap:8px}
.sbp-links[data-variant="pills"] .sbp-btn{width:auto;padding:8px 18px;border-radius:999px}
.sbp-links[data-variant="minimal"]{gap:0}
.sbp-link-card{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;text-decoration:none;font-weight:600;border-radius:var(--sb-radius);border:1px solid color-mix(in srgb,var(--sb-text) 16%,transparent);background:color-mix(in srgb,var(--sb-text) 5%,transparent);transition:transform .15s ease,border-color .15s ease}
.sbp-link-card::after{content:"\\2192";color:var(--sb-primary);font-weight:700}
.sbp-link-card:hover{border-color:var(--sb-primary);transform:translateY(-2px)}
.sbp-link-min{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 2px;text-decoration:none;font-weight:600;border-bottom:1px solid color-mix(in srgb,var(--sb-text) 16%,transparent);transition:color .15s ease}
.sbp-link-min::after{content:"\\2197";color:var(--sb-primary)}
.sbp-link-min:hover{color:var(--sb-primary)}

.sbp-text{white-space:pre-wrap}
.sbp-text[data-variant="lead"]{font-size:clamp(1.1rem,4.4cqw,1.45rem);line-height:1.45;opacity:.88}
.sbp-text[data-variant="quote"]{padding-left:18px;border-left:4px solid var(--sb-primary);font-style:italic;font-size:1.15rem}
.sbp-text[data-variant="callout"]{padding:18px 20px;border-radius:var(--sb-radius);background:color-mix(in srgb,var(--sb-primary) 14%,transparent);border:1px solid color-mix(in srgb,var(--sb-primary) 38%,transparent)}

.sbp-footer{font-size:.875rem;text-align:center;opacity:.78}
.sbp-footer[data-variant="minimal"]{padding-top:20px;border-top:1px solid color-mix(in srgb,var(--sb-text) 18%,transparent)}
.sbp-footer[data-variant="columns"]{text-align:left;padding-top:20px;border-top:1px solid color-mix(in srgb,var(--sb-text) 18%,transparent)}
.sbp-footer[data-variant="band"]{padding:18px;border-radius:var(--sb-radius);background:color-mix(in srgb,var(--sb-primary) 14%,transparent);opacity:1}

.sbp-section-title{margin:0 0 12px;font-size:1.2rem;font-weight:700;letter-spacing:-.01em}

.sbp-social{display:flex;flex-wrap:wrap;gap:12px}
.sbp-social-item{display:inline-flex;align-items:center;justify-content:center;gap:10px;text-decoration:none;color:var(--ic);transition:transform .15s ease,background-color .15s ease}
.sbp-social-item svg{width:22px;height:22px;flex:none;fill:currentColor}
.sbp-social-item svg[fill="none"]{fill:none}
.sbp-social-item:hover{transform:translateY(-2px)}
.sbp-social-item:focus-visible{outline:3px solid color-mix(in srgb,var(--sb-primary) 60%,transparent);outline-offset:2px}
.sbp-social[data-variant="icons"],.sbp-social[data-variant="filled"],.sbp-social[data-variant="pills"]{justify-content:center}
.sbp-social[data-variant="icons"] .sbp-social-item,.sbp-social[data-variant="filled"] .sbp-social-item{width:46px;height:46px;border-radius:50%}
.sbp-social[data-variant="icons"] .sbp-social-item{border:2px solid currentColor}
.sbp-social[data-variant="filled"] .sbp-social-item{background:var(--ib);color:var(--ibt);border:1px solid color-mix(in srgb,var(--sb-text) 22%,transparent)}
.sbp-social[data-variant="pills"] .sbp-social-item{padding:9px 18px;border:2px solid currentColor;border-radius:999px;font-weight:600}
.sbp-social[data-variant="pills"] .sbp-social-item span,.sbp-social[data-variant="list"] .sbp-social-item span{color:var(--sb-text)}
.sbp-social[data-variant="list"]{flex-direction:column;gap:10px}
.sbp-social[data-variant="list"] .sbp-social-item{justify-content:flex-start;padding:12px 16px;font-weight:600;border-radius:var(--sb-radius);border:1px solid color-mix(in srgb,var(--sb-text) 16%,transparent);background:color-mix(in srgb,var(--sb-text) 5%,transparent)}

.sbp-ll{display:flex;flex-direction:column}
.sbp-ll-item{display:flex;align-items:center;gap:14px;padding:14px 2px;text-decoration:none;border-bottom:1px solid color-mix(in srgb,var(--sb-text) 16%,transparent);transition:color .15s ease,transform .15s ease}
.sbp-ll-item::after{content:"\\2197";flex:none;color:var(--sb-primary)}
.sbp-ll-item:hover .sbp-ll-label{color:var(--sb-primary)}
.sbp-ll-item:focus-visible{outline:3px solid color-mix(in srgb,var(--sb-primary) 60%,transparent);outline-offset:2px}
.sbp-ll-text{flex:1;min-width:0}
.sbp-ll-label{display:block;font-weight:600}
.sbp-ll-desc{display:block;margin-top:2px;font-size:.9rem;opacity:.75}
.sbp-ll-thumb{flex:none;width:56px;height:56px;border-radius:calc(var(--sb-radius) * .7);object-fit:cover}
.sbp-ll-num{flex:none;display:grid;place-items:center;width:32px;height:32px;font-size:.9rem;font-weight:700;border-radius:50%;background:color-mix(in srgb,var(--sb-primary) 20%,transparent)}
.sbp-ll[data-variant="cards"]{gap:10px}
.sbp-ll[data-variant="cards"] .sbp-ll-item{padding:14px 16px;border:1px solid color-mix(in srgb,var(--sb-text) 16%,transparent);border-radius:var(--sb-radius);background:color-mix(in srgb,var(--sb-text) 5%,transparent)}
.sbp-ll[data-variant="cards"] .sbp-ll-item:hover{border-color:var(--sb-primary);transform:translateY(-2px)}

.sbp-carousel-frame{position:relative}
.sbp-carousel-track{display:flex;gap:12px;margin:0;padding:0;list-style:none;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;scrollbar-width:none;border-radius:var(--sb-radius)}
.sbp-carousel-track::-webkit-scrollbar{display:none}
.sbp-carousel-track:focus-visible{outline:3px solid color-mix(in srgb,var(--sb-primary) 60%,transparent);outline-offset:2px}
.sbp-carousel-slide{flex:0 0 100%;min-width:0;scroll-snap-align:start}
.sbp-carousel-slide figure{position:relative}
.sbp-carousel-slide a{display:block}
.sbp-carousel-slide img{display:block;width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:var(--sb-radius)}
.sbp-carousel-slide figcaption{margin-top:8px;font-size:.9rem;opacity:.85}
.sbp-carousel[data-variant="slides"] .sbp-carousel-slide figcaption{position:absolute;left:0;right:0;bottom:0;margin:0;padding:28px 16px 12px;color:#fff;opacity:1;border-radius:0 0 var(--sb-radius) var(--sb-radius);background:linear-gradient(transparent,rgba(0,0,0,.65))}
.sbp-carousel[data-variant="cards"] .sbp-carousel-slide{flex-basis:min(72%,260px)}
.sbp-carousel[data-variant="cards"] .sbp-carousel-slide img{aspect-ratio:4/5}
.sbp-carousel-nav{position:absolute;top:50%;z-index:1;display:grid;place-items:center;width:38px;height:38px;padding:0 0 3px;font:inherit;font-size:1.6rem;line-height:1;color:#fff;cursor:pointer;border:0;border-radius:50%;background:rgba(0,0,0,.55);transform:translateY(-50%);transition:background-color .15s ease}
.sbp-carousel-nav:hover{background:rgba(0,0,0,.78)}
.sbp-carousel-nav:focus-visible{outline:3px solid color-mix(in srgb,var(--sb-primary) 70%,transparent);outline-offset:2px}
.sbp-carousel-nav[data-side="prev"]{left:10px}
.sbp-carousel-nav[data-side="next"]{right:10px}

.sbp-gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin:0;padding:0;list-style:none}
.sbp-gallery-grid li{min-width:0}
.sbp-gallery-grid a{display:block}
.sbp-gallery-grid img{display:block;width:100%;aspect-ratio:1;object-fit:cover;border-radius:var(--sb-radius)}
.sbp-gallery[data-variant="columns"] .sbp-gallery-grid{display:block;column-width:200px;column-gap:10px}
.sbp-gallery[data-variant="columns"] .sbp-gallery-grid li{margin-bottom:10px;break-inside:avoid}
.sbp-gallery[data-variant="columns"] .sbp-gallery-grid img{aspect-ratio:auto;height:auto}
.sbp-gallery[data-variant="featured"] .sbp-gallery-grid li:first-child{grid-column:span 2;grid-row:span 2}

.sbp-faq-item{border-bottom:1px solid color-mix(in srgb,var(--sb-text) 16%,transparent)}
.sbp-faq-q{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 2px;font-size:1rem;font-weight:600;cursor:pointer;list-style:none}
.sbp-faq-q::-webkit-details-marker{display:none}
details.sbp-faq-item>.sbp-faq-q::after{content:"+";flex:none;color:var(--sb-primary);font-size:1.3rem;font-weight:700;line-height:1}
details.sbp-faq-item[open]>.sbp-faq-q::after{content:"\\2212"}
.sbp-faq-q:focus-visible{outline:3px solid color-mix(in srgb,var(--sb-primary) 60%,transparent);outline-offset:2px}
.sbp-faq-a{padding:0 2px 14px;white-space:pre-wrap;opacity:.85}
.sbp-faq[data-variant="cards"] .sbp-faq-item{margin-bottom:10px;padding:0 16px;border:1px solid color-mix(in srgb,var(--sb-text) 16%,transparent);border-radius:var(--sb-radius);background:color-mix(in srgb,var(--sb-text) 5%,transparent)}
.sbp-faq[data-variant="cards"] .sbp-faq-item:last-child{margin-bottom:0}
.sbp-faq[data-variant="plain"] .sbp-faq-item{padding:12px 0}
.sbp-faq[data-variant="plain"] .sbp-faq-q{padding:0 0 4px;cursor:default}
.sbp-faq[data-variant="plain"] .sbp-faq-a{padding:0}

.sbp-video-frame{position:relative;aspect-ratio:16/9;overflow:hidden;background:#000;border-radius:var(--sb-radius)}
.sbp-video-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.sbp-video-play{position:absolute;inset:0;display:grid;place-items:center;background:linear-gradient(135deg,#1f2937,#4b5563)}
.sbp-video-play::before{content:"";width:0;height:0;border-style:solid;border-width:14px 0 14px 24px;border-color:transparent transparent transparent #fff}
.sbp-video[data-variant="card"]{padding:12px;border:1px solid color-mix(in srgb,var(--sb-text) 16%,transparent);border-radius:var(--sb-radius);background:color-mix(in srgb,var(--sb-text) 5%,transparent)}
.sbp-video[data-variant="card"] .sbp-video-frame{border-radius:calc(var(--sb-radius) * .7)}
.sbp-video-title{margin-top:10px;font-weight:600}

.sbp-divider[data-variant="line"]{height:0;border-top:1px solid color-mix(in srgb,var(--sb-text) 22%,transparent)}
.sbp-divider[data-variant="dots"]{text-align:center;line-height:1;color:var(--sb-primary);letter-spacing:.7em}
.sbp-divider[data-variant="dots"]::before{content:"\\2022\\2022\\2022"}
.sbp-divider[data-variant="space"]{height:calc(var(--sb-gap) * 1.2)}

.sbp-extra{margin-top:var(--sb-gap);text-align:center}
.sbp-agenda{margin:0 0 var(--sb-gap)}
.sbp-report{margin:0;font-size:.78rem;opacity:.65}
.sbp-report a{text-decoration:underline}
.sbp-report a:hover{opacity:.85}

@media (prefers-reduced-motion:reduce){.sbp-btn,.sbp-link-card,.sbp-link-min,.sbp-social-item,.sbp-ll-item{transition:none}.sbp-btn:hover,.sbp-link-card:hover,.sbp-social-item:hover,.sbp-ll[data-variant="cards"] .sbp-ll-item:hover{transform:none}.sbp-carousel-track{scroll-behavior:auto}}
`;
