import type { Metadata } from 'next';
import './globals.css';
import AuthProvider from '../components/auth/AuthProvider';
export const metadata: Metadata = { title: 'Payment Approval System', description: 'Payment requests, role-based approvals, and a complete audit trail.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AuthProvider>{children}</AuthProvider></body></html>;
}
