export const RENDERER_STYLES = `
.sbp{position:relative;container-type:inline-size;min-height:100%;background-color:var(--sb-bg-color);background-image:var(--sb-bg-image);background-size:cover;background-position:center;color:var(--sb-text);font-family:var(--sb-font);line-height:1.55;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.sbp[data-fill="viewport"]{min-height:100vh}
.sbp *,.sbp *::before,.sbp *::after{box-sizing:border-box}
:where(.sbp h1,.sbp h2,.sbp p,.sbp blockquote){margin:0}
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

.sbp-extra{margin-top:var(--sb-gap);text-align:center}
.sbp-agenda{margin:0 0 var(--sb-gap)}
.sbp-report{margin:0;font-size:.78rem;opacity:.65}
.sbp-report a{text-decoration:underline}
.sbp-report a:hover{opacity:.85}

@media (prefers-reduced-motion:reduce){.sbp-btn,.sbp-link-card,.sbp-link-min{transition:none}.sbp-btn:hover,.sbp-link-card:hover{transform:none}}
`;
