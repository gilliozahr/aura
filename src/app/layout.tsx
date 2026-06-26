import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AURA — Personal Style Intelligence',
  description: 'AURA v0.2: AI Personal Style Operating System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
