import Link from 'next/link';

export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient
          id="brand-gradient"
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#brand-gradient)" />
      <rect x="8" y="9" width="16" height="3.6" rx="1.8" fill="#fff" />
      <rect x="8" y="14.2" width="10.5" height="3.6" rx="1.8" fill="#fff" fillOpacity="0.85" />
      <rect x="8" y="19.4" width="13" height="3.6" rx="1.8" fill="#fff" fillOpacity="0.65" />
    </svg>
  );
}

export function Brand({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="brand">
      <BrandMark />
      Moonlight
    </Link>
  );
}
