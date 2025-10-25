'use client';
import { usePathname } from 'next/navigation';
import AuthGuard from './AuthGuard';

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

// หน้าที่ไม่ต้องผ่าน AuthGuard
const PUBLIC_ROUTES = ['/login', '/register'];

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const pathname = usePathname();

  // ถ้าเป็นหน้า public ไม่ต้องผ่าน AuthGuard
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

  if (isPublicRoute) {
    return <>{children}</>;
  }

  // หน้าอื่นๆ ต้องผ่าน AuthGuard
  return (
    <AuthGuard>
      {children}
    </AuthGuard>
  );
}
