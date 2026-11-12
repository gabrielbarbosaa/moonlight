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
          <stop offset="0" stopColor="#6c47ff" />
          <stop offset="0.6" stopColor="#a64bff" />
          <stop offset="1" stopColor="#ff6ad5" />
        </linearGradient>
        <mask id="brand-moon-cut">
          <rect width="32" height="32" fill="#fff" />
          <circle cx="19.6" cy="12.4" r="7.4" fill="#000" />
        </mask>
      </defs>
      <rect width="32" height="32" rx="10" fill="url(#brand-gradient)" />
      <circle cx="15" cy="17" r="8.6" fill="#fff" mask="url(#brand-moon-cut)" />
      <path
        d="M23.6 5.6l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z"
        fill="#fff"
        fillOpacity="0.95"
      />
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
