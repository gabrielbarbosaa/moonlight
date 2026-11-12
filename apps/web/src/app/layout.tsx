import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/plus-jakarta-sans';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Moonlight', template: '%s · Moonlight' },
  description: 'Crie sua página pessoal em minutos, com temas, agenda e estatísticas.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

const THEME_SCRIPT = `try{var q=new URLSearchParams(location.search).get('theme');var t=q||localStorage.getItem('sb-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
