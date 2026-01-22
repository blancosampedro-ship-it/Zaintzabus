import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { OperadorProvider } from '@/contexts/OperadorContext';

export const metadata: Metadata = {
  title: 'ZaintzaBus - Gestión de Mantenimiento',
  description: 'Plataforma de gestión de mantenimiento para Lurraldebus',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased">
        <AuthProvider>
          <OperadorProvider>{children}</OperadorProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
