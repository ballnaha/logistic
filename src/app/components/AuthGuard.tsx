'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // ยังกำลังโหลด

    if (!session) {
      // ไม่มี session ให้ redirect ไป login
      router.push('/login');
      return;
    }
  }, [session, status, router]);

  // แสดง loading ขณะกำลังตรวจสอบ session
  if (status === 'loading') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
        }}
      >
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="body1" color="text.secondary">
          กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...
        </Typography>
      </Box>
    );
  }

  // ไม่มี session
  if (!session) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
        }}
      >
        <Typography variant="h6" color="text.primary" sx={{ mb: 1 }}>
          กำลังเปลี่ยนเส้นทางไปหน้าเข้าสู่ระบบ...
        </Typography>
        <CircularProgress size={30} />
      </Box>
    );
  }

  // มี session แล้ว แสดง children
  return <>{children}</>;
}
