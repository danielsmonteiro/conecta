import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HealthMatch',
  description: 'Plataforma de gestão de plantões e profissionais de saúde',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
