import type { Metadata } from 'next';
import './styles.css';
export const metadata: Metadata = { title: 'EliabeTech | Acesso', description: 'Sistema de autenticação EliabeTech' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body>{children}</body></html>; }
