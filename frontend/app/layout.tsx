import type { Metadata } from 'next';
import { Providers } from './providers';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'RitDex — The new Dawn of Dex\'s',
  description: 'Swap, provide liquidity, and stake on Ritual Chain.',
  icons: { icon: '/icon.svg' },
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
