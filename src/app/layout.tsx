import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AURA — AI Personal Style OS',
  description: 'AURA: Your wardrobe, weather, calendar, and taste — connected by AI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
