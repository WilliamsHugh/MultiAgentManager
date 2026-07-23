import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Multi-Agent Manager',
  description: 'Dashboard quản lý hệ thống Multi-Agent với Freebuff + Opencode',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
