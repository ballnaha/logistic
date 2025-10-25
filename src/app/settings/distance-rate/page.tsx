'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  InputAdornment,
  Card,
  CardContent,
  useMediaQuery,
  useTheme,
  Stack,
  Chip,
} from '@mui/material';
import { 
  Save as SaveIcon, 
  Settings as SettingsIcon,
  Block as BlockIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  DirectionsCar as CarIcon,
} from '@mui/icons-material';
import Layout from '../../components/Layout';
import { useSnackbar } from '../../../contexts/SnackbarContext';

export default function DistanceRateSettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showSnackbar } = useSnackbar();
  
  const [distanceRate, setDistanceRate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  // โหลดข้อมูลค่าอัตราระยะทางปัจจุบัน
  const fetchDistanceRate = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/distance-rate');
      const result = await response.json();

      if (result.success) {
        setDistanceRate(result.data.distanceRate.toString());
      } else {
        showSnackbar('ไม่สามารถดึงข้อมูลค่าอัตราระยะทางได้', 'error');
      }
    } catch (error) {
      console.error('Error fetching distance rate:', error);
      showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  };

  // บันทึกค่าอัตราระยะทางใหม่
  const handleSaveDistanceRate = async () => {
    // ตรวจสอบความถูกต้องของข้อมูล
    const rate = parseFloat(distanceRate);
    if (isNaN(rate) || rate < 0) {
      showSnackbar('กรุณาระบุค่าอัตราระยะทางที่ถูกต้อง', 'error');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/settings/distance-rate', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          distanceRate: rate,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSnackbar('บันทึกค่าอัตราระยะทางเรียบร้อยแล้ว', 'success');
        // อัปเดตค่าที่แสดงผล
        setDistanceRate(result.data.distanceRate.toString());
      } else {
        showSnackbar(result.error || 'ไม่สามารถบันทึกค่าอัตราระยะทางได้', 'error');
      }
    } catch (error) {
      console.error('Error saving distance rate:', error);
      showSnackbar('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
      setSaving(false);
    }
  };

  // โหลดข้อมูลเมื่อเริ่มต้น
  useEffect(() => {
    // Only check when session has loaded (not undefined)
    if (session === undefined) return;
    
    // If no session, redirect to login
    if (!session) {
      router.push('/login');
      return;
    }
    
    // If admin, fetch distance rate
    if (session.user?.role === 'admin') {
      fetchDistanceRate();
    }
  }, [session, router]);

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

  // Check admin permission after session is loaded
  if (session && session.user?.role !== 'admin') {
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
              จึงจะสามารถเข้าถึงหน้าตั้งค่าอัตราระยะทางได้
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
            <Button
              variant="contained"
              onClick={() => router.push('/')}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 500,
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                '&:hover': {
                  boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                }
              }}
            >
              กลับหน้าหลัก
            </Button>
          </Paper>
        </Box>
      </Layout>
    );
  }

  // แสดง Loading
  if (loading) {
    return (
      <Layout showSidebar={false}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
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
            <CarIcon fontSize="large" color="primary" />
            <Typography 
              variant={isMobile ? 'h5' : 'h5'} 
              sx={{ fontWeight: 600 }}
            >
              ตั้งค่าอัตราค่าระยะทาง
            </Typography>
          </Box>
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          จัดการค่าใช้จ่ายต่อกิโลเมตรสำหรับการคำนวณค่าขนส่งในระบบ
        </Typography>

        <Stack spacing={3} direction={{ xs: 'column', lg: 'row' }} alignItems="flex-start">
          {/* ฟอร์มตั้งค่า */}
          <Paper sx={{ p: 3, flex: 1, minWidth: { xs: '100%', lg: '60%' } }}>
            <Typography variant="h6" gutterBottom>
              อัตราค่าระยะทาง
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="ค่าใช้จ่ายต่อกิโลเมตร"
                value={distanceRate}
                onChange={(e) => setDistanceRate(e.target.value)}
                type="number"
                inputProps={{
                  min: 0,
                  step: 0.01,
                }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">บาท/กม.</InputAdornment>,
                }}
                helperText="ระบุจำนวนเงินค่าใช้จ่ายต่อกิโลเมตรในหน่วยบาท"
                disabled={saving}
              />
            </Box>

            <Button
              variant="contained"
              size="large"
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              onClick={handleSaveDistanceRate}
              disabled={saving || !distanceRate}
              sx={{ 
                minWidth: 120,
                background: `linear-gradient(135deg, #2196f3 0%, #1976d2 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, #1976d2 0%, #1565c0 100%)`,
                },
              }}
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </Paper>

          {/* ข้อมูลสรุป */}
          <Box sx={{ 
            width: { xs: '100%', lg: '400px' },
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
            <Card sx={{ bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
              <CardContent>
                <Typography variant="h6" color="success.main" gutterBottom>
                  ข้อมูลปัจจุบัน
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    อัตราค่าระยะทางปัจจุบัน
                  </Typography>
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    {parseFloat(distanceRate || '0').toLocaleString('th-TH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} บาท
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ต่อกิโลเมตร
                  </Typography>
                </Box>

                <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
                  การเปลี่ยนแปลงค่าอัตราระยะทางจะมีผลต่อการคำนวณใหม่ในระบบ 
                  แต่จะไม่ส่งผลกระทบต่อข้อมูลการเดินทางที่บันทึกไว้แล้ว
                </Alert>
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </Box>
    </Layout>
  );
}