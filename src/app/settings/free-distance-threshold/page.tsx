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
  Block as BlockIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Route as RouteIcon,
} from '@mui/icons-material';
import Layout from '../../components/Layout';
import { useSnackbar } from '../../../contexts/SnackbarContext';

export default function FreeDistanceThresholdSettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showSnackbar } = useSnackbar();
  
  const [freeDistanceThreshold, setFreeDistanceThreshold] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const hasFetchedRef = React.useRef(false); // Track if data has been fetched

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

  // โหลดข้อมูลระยะทางขั้นต่ำปัจจุบัน
  const fetchFreeDistanceThreshold = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/system-settings/free_distance_threshold');
      const result = await response.json();

      if (result.success) {
        setFreeDistanceThreshold(result.data.value.toString());
      } else {
        showSnackbar('ไม่สามารถดึงข้อมูลระยะทางขั้นต่ำได้', 'error');
      }
    } catch (error) {
      console.error('Error fetching free distance threshold:', error);
      showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  };

  // บันทึกระยะทางขั้นต่ำใหม่
  const handleSaveFreeDistanceThreshold = async () => {
    // ตรวจสอบความถูกต้องของข้อมูล
    const threshold = parseFloat(freeDistanceThreshold);
    if (isNaN(threshold) || threshold < 0) {
      showSnackbar('กรุณาระบุระยะทางขั้นต่ำที่ถูกต้อง', 'error');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/system-settings/free_distance_threshold', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value: threshold,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSnackbar('บันทึกระยะทางขั้นต่ำเรียบร้อยแล้ว', 'success');
        // อัปเดตค่าที่แสดงผล
        setFreeDistanceThreshold(result.data.value.toString());
      } else {
        showSnackbar(result.error || 'ไม่สามารถบันทึกระยะทางขั้นต่ำได้', 'error');
      }
    } catch (error) {
      console.error('Error saving free distance threshold:', error);
      showSnackbar('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
      setSaving(false);
    }
  };

  // โหลดข้อมูลเมื่อเริ่มต้น (ไม่ reload เมื่อเปลี่ยน tab)
  useEffect(() => {
    // Only check when session has loaded (not undefined)
    if (session === undefined) return;
    
    // If no session, redirect to login
    if (!session) {
      router.push('/login');
      return;
    }
    
    // If admin, fetch free distance threshold (only once on mount)
    if (session.user?.role === 'admin' && !hasFetchedRef.current) {
      fetchFreeDistanceThreshold();
      hasFetchedRef.current = true; // Mark as fetched to prevent reload on tab change
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]); // Only depend on session to check auth, but fetch only once

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
              จึงจะสามารถเข้าถึงหน้าตั้งค่าระยะทางขั้นต่ำได้
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
            <RouteIcon fontSize="large" color="info" />
            <Typography 
              variant={isMobile ? 'h5' : 'h5'} 
              sx={{ fontWeight: 600 }}
            >
              ตั้งค่าระยะทางขั้นต่ำ
            </Typography>
          </Box>
        </Box>

        <Stack spacing={3} direction={{ xs: 'column', lg: 'row' }} alignItems="flex-start">
          {/* ฟอร์มตั้งค่า */}
          <Paper sx={{ p: 3, flex: 1, minWidth: { xs: '100%', lg: '60%' } }}>
            <Typography variant="h6" gutterBottom>
              ระยะทางขั้นต่ำ
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="ระยะทางขั้นต่ำ"
                value={freeDistanceThreshold}
                onChange={(e) => setFreeDistanceThreshold(e.target.value)}
                type="number"
                inputProps={{
                  min: 0,
                  step: 1,
                }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">กม.</InputAdornment>,
                }}
                helperText={`ระบุระยะทางที่ไม่คิดค่าระยะทาง (ปัจจุบัน: 0-${parseFloat(freeDistanceThreshold || '0').toLocaleString('th-TH')} กม.แรกไม่คิดเงิน)`}
                disabled={saving}
              />
            </Box>

            <Alert severity="info" sx={{ mb: 3, fontSize: '0.875rem' }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>วิธีการคำนวณ:</strong>
              </Typography>
              <Typography variant="body2" component="div">
                • ระยะทางรวมทั้งเดือน <strong>0 - {freeDistanceThreshold || '0'} กม.</strong> = <strong>ไม่คิดค่าระยะทาง</strong><br />
                • ระยะทางรวมทั้งเดือน <strong>หลัง {freeDistanceThreshold || '0'} กม.</strong> = <strong>คิดค่าระยะทาง × อัตรา (1.2 บาท/กม.)</strong>
              </Typography>
            </Alert>

            <Button
              variant="contained"
              size="large"
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              onClick={handleSaveFreeDistanceThreshold}
              disabled={saving || !freeDistanceThreshold}
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
            <Card sx={{ bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
              <CardContent>
                <Typography variant="h6" color="info.dark" gutterBottom>
                  ข้อมูลปัจจุบัน
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    ระยะทางที่ไม่คิดเงิน
                  </Typography>
                  <Typography variant="h4" color="info.dark" fontWeight="bold">
                    0 - {parseFloat(freeDistanceThreshold || '0').toLocaleString('th-TH', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })} กม.
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    (ระยะทางรวมต่อเดือน)
                  </Typography>
                </Box>

                
              </CardContent>
            </Card>

            {/* ตัวอย่างการคำนวณ */}
            <Card sx={{ bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
              <CardContent>
                <Typography variant="h6" color="text.primary" gutterBottom>
                  ตัวอย่างการคำนวณ
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {(() => {
                  const threshold = parseFloat(freeDistanceThreshold || '0');
                  // ใช้ระยะทางที่มากกว่า threshold เสมอ เพื่อไม่ให้เกิดค่าลบ
                  const exampleDistance = Math.max(threshold + 500, 2000);
                  const chargeableDistance = exampleDistance - threshold;
                  const rate = 1.2;
                  const cost = chargeableDistance * rate;
                  
                  return (
                    <>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        สมมติระยะทางรวมในเดือน = <strong>{exampleDistance.toLocaleString('th-TH')} กม.</strong><br />
                        อัตราค่าระยะทาง = <strong>{rate} บาท/กม.</strong>
                      </Typography>

                      <Box sx={{ bgcolor: 'white', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'grey.300' }}>
                        <Typography variant="body2" component="div" color="text.primary">
                          • ระยะทาง 0-{threshold.toLocaleString('th-TH')} กม. = <strong style={{ color: '#2e7d32' }}>0 บาท</strong><br />
                          • ระยะทาง {threshold.toLocaleString('th-TH')}-{exampleDistance.toLocaleString('th-TH')} กม. = ({exampleDistance.toLocaleString('th-TH')} - {threshold.toLocaleString('th-TH')}) × {rate}<br />
                          &nbsp;&nbsp;= <strong style={{ color: '#d32f2f' }}>{cost.toLocaleString('th-TH', { maximumFractionDigits: 2 })} บาท</strong>
                        </Typography>
                      </Box>
                    </>
                  );
                })()}
                
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </Box>
    </Layout>
  );
}
