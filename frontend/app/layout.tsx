import type { Metadata } from 'next';
import { Providers } from './providers';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Ritswap — Swap your way to the astral plane',
  description: 'Swap, provide liquidity, and stake on Ritual Chain.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
