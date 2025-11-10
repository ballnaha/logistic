'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  CardActionArea,
  CircularProgress,
  Stack,
  Chip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Money as MoneyIcon,
  DirectionsCar as CarIcon,
  Block as BlockIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  ArrowForward as ArrowForwardIcon,
  Route as RouteIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';

interface SettingCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Helper functions for role display
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'ผู้ดูแลระบบ';
      case 'user': return 'ผู้ใช้งานทั่วไป';
      default: return 'ไม่ระบุ';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'user': return 'primary';
      default: return 'default';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <AdminIcon />;
      case 'user': return <PersonIcon />;
      default: return <PersonIcon />;
    }
  };

  // การตั้งค่าที่มีให้ใช้งาน
  const settingCards: SettingCard[] = [
    {
      title: 'ตั้งค่าเบี้ยเลี้ยง',
      description: 'จัดการค่าเบี้ยเลี้ยงต่อวันสำหรับการคำนวณค่าใช้จ่ายในระบบ',
      icon: <MoneyIcon sx={{ fontSize: 40 }} />,
      href: '/settings/allowance',
      color: 'primary',
    },
    {
      title: 'ตั้งค่าอัตราค่าระยะทาง',
      description: 'จัดการค่าใช้จ่ายต่อกิโลเมตรสำหรับการคำนวณค่าขนส่งในระบบ',
      icon: <RouteIcon sx={{ fontSize: 40 }} />,
      href: '/settings/distance-rate',
      color: 'success',
    },
    {
      title: 'ตั้งค่าค่าเที่ยว',
      description: 'จัดการค่าเที่ยวสำหรับการคำนวณค่าใช้จ่ายในระบบ',
      icon: <CarIcon sx={{ fontSize: 40 }} />,
      href: '/settings/trip-fee',
      color: 'warning',
    },

  ];

  // Loading state while checking session
  if (session === undefined) {
    return (
      <Layout showSidebar={false}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  // If no session, redirect to login
  if (!session) {
    router.push('/login');
    return null;
  }

  // Check admin permission after session is loaded
  if (session.user?.role !== 'admin') {
    return (
      <Layout showSidebar={false}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '60vh',
          p: 3 
        }}>
          <Paper
            sx={{
              p: 6,
              borderRadius: 4,
              textAlign: 'center',
              maxWidth: 500,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              border: '1px solid',
              borderColor: 'grey.200',
              background: 'linear-gradient(135deg, #fafafa 0%, #ffffff 100%)',
            }}
          >
            {/* Icon */}
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'error.50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
                border: '2px solid',
                borderColor: 'error.100',
              }}
            >
              <BlockIcon sx={{ fontSize: 40, color: 'error.main' }} />
            </Box>

            {/* Main Message */}
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 600,
                mb: 2,
                color: 'text.primary',
                fontSize: { xs: '1.5rem', sm: '2rem' }
              }}
            >
              ไม่มีสิทธิ์เข้าถึง
            </Typography>

            <Typography 
              variant="body1" 
              sx={{ 
                color: 'text.secondary',
                mb: 3,
                lineHeight: 1.6,
                fontSize: '1.1rem'
              }}
            >
              คุณต้องเป็นผู้ดูแลระบบเท่านั้น<br />
              จึงจะสามารถเข้าถึงหน้าตั้งค่าระบบได้
            </Typography>

            {/* Role Badge */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                สิทธิ์ปัจจุบันของคุณ
              </Typography>
              <Chip
                label={getRoleLabel(session?.user?.role || 'user')}
                color={getRoleColor(session?.user?.role || 'user') as any}
                icon={getRoleIcon(session?.user?.role || 'user')}
                sx={{ 
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  px: 1
                }}
              />
            </Box>

            {/* Back Button */}
            <button
              onClick={() => router.push('/')}
              style={{
                borderRadius: 8,
                border: 'none',
                padding: '12px 32px',
                fontSize: '1rem',
                fontWeight: 500,
                backgroundColor: theme.palette.primary.main,
                color: 'white',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
              }}
            >
              กลับหน้าหลัก
            </button>
          </Paper>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout showSidebar={false}>
      <Box>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: { xs: 'center', sm: 'center' }, 
          mb: 3,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            
            <Typography 
              variant={isMobile ? 'h5' : 'h5'} 
              sx={{ fontWeight: 600 }}
            >
              ตั้งค่าระบบ
            </Typography>
          </Box>
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          จัดการการตั้งค่าต่างๆ ของระบบบริหารจัดการโลจิสติกส์
        </Typography>

        {/* Settings Cards */}
        <Stack 
          direction={{ xs: 'column', sm: 'row' }}
          spacing={3}
          sx={{ mb: 4 }}
        >
          {settingCards.map((setting, index) => (
            <Card
              key={index}
              sx={{
                flex: 1,
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid',
                borderColor: 'grey.200',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                  borderColor: `${setting.color}.300`,
                },
              }}
            >
              <CardActionArea
                onClick={() => router.push(setting.href)}
                sx={{
                  height: '100%',
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 2,
                  minHeight: 280,
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 3,
                    bgcolor: `${setting.color}.50`,
                    border: '2px solid',
                    borderColor: `${setting.color}.200`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: `${setting.color}.main`,
                    mb: 1,
                  }}
                >
                  {setting.icon}
                </Box>

                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600,
                    color: 'text.primary',
                    mb: 1,
                  }}
                >
                  {setting.title}
                </Typography>

                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'text.secondary',
                    lineHeight: 1.6,
                    flex: 1,
                  }}
                >
                  {setting.description}
                </Typography>

                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 1,
                  color: `${setting.color}.main`,
                  mt: 2
                }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    เข้าสู่การตั้งค่า
                  </Typography>
                  <ArrowForwardIcon sx={{ fontSize: 16 }} />
                </Box>
              </CardActionArea>
            </Card>
          ))}
        </Stack>

        {/* Additional Info Card */}
        <Card 
          sx={{ 
            mt: 4, 
            bgcolor: 'info.50', 
            border: '1px solid', 
            borderColor: 'info.200',
            borderRadius: 3
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" color="info.main" gutterBottom>
              ข้อมูลสำคัญ
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              การเปลี่ยนแปลงค่าการตั้งค่าต่างๆ จะมีผลต่อการคำนวณใหม่ในระบบ 
              แต่จะไม่ส่งผลกระทบต่อข้อมูลที่บันทึกไว้แล้วในอดีต 
              กรุณาพิจารณาอย่างรอบคอบก่อนทำการเปลี่ยนแปลง
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Layout>
  );
}