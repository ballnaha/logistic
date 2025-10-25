'use client';
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Divider,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

interface QuotaStatus {
  month: string;
  usage: {
    geocoding: number;
    distance: number;
    total: number;
  };
  limits: {
    quota_limit: number;
    warning_threshold: number;
  };
  status: {
    is_quota_exceeded: boolean;
    is_near_limit: boolean;
    remaining: number;
    percentage_used: number;
  };
  can_use_google_maps: boolean;
}

export default function TestGoogleMapsPage() {
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [geocodeResult, setGeocodeResult] = useState<any>(null);
  const [distanceResult, setDistanceResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testAddress, setTestAddress] = useState('173 หมู่ 8 ต.หนองกุ่ม อ.บ่อพลอย จ.กาญจนบุรี');
  const [testLat, setTestLat] = useState('14.346500');
  const [testLng, setTestLng] = useState('99.495600');

  // ตรวจสอบสถานะโควต้า
  const checkQuotaStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/quota-tracker');
      const result = await response.json();
      
      if (result.success) {
        setQuotaStatus(result.data);
      }
    } catch (error) {
      console.error('Error checking quota:', error);
    } finally {
      setLoading(false);
    }
  };

  // ทดสอบ geocoding
  const testGeocode = async () => {
    if (!testAddress.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/geocoding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: testAddress,
          companyName: 'บริษัท ทดสอบ จำกัด'
        })
      });
      
      const result = await response.json();
      setGeocodeResult(result);
      
      // รีเฟรชสถานะโควต้าหลังจากใช้งาน
      await checkQuotaStatus();
    } catch (error) {
      console.error('Error testing geocode:', error);
    } finally {
      setLoading(false);
    }
  };

  // ทดสอบ distance calculation
  const testDistance = async () => {
    if (!testLat.trim() || !testLng.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originLat: 13.537051, // พิกัดบริษัท PSC (Updated)
          originLng: 100.2173051,
          destLat: parseFloat(testLat),
          destLng: parseFloat(testLng)
        })
      });
      
      const result = await response.json();
      setDistanceResult(result);
      
      // รีเฟรชสถานะโควต้าหลังจากใช้งาน
      await checkQuotaStatus();
    } catch (error) {
      console.error('Error testing distance:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    checkQuotaStatus();
  }, []);

  const getStatusColor = (status: QuotaStatus) => {
    if (status.status.is_quota_exceeded) return 'error';
    if (status.status.is_near_limit) return 'warning';
    return 'success';
  };

  const getStatusIcon = (status: QuotaStatus) => {
    if (status.status.is_quota_exceeded) return <ErrorIcon />;
    if (status.status.is_near_limit) return <WarningIcon />;
    return <CheckCircleIcon />;
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 3, textAlign: 'center' }}>
        🧪 ทดสอบระบบ Google Maps API
      </Typography>

      {/* Quota Status */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            📊 สถานะโควต้า Google Maps
          </Typography>
          <Button 
            variant="outlined" 
            onClick={checkQuotaStatus}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : undefined}
          >
            รีเฟรช
          </Button>
        </Box>

        {quotaStatus ? (
          <Box>
            <Alert 
              severity={getStatusColor(quotaStatus)} 
              icon={getStatusIcon(quotaStatus)}
              sx={{ mb: 2 }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {quotaStatus.can_use_google_maps 
                  ? '✅ สามารถใช้ Google Maps ได้' 
                  : '🔴 เกินโควต้า - จะใช้ OpenStreetMap แทน'
                }
              </Typography>
              <Typography variant="body2">
                เดือน {quotaStatus.month}: ใช้ไป {quotaStatus.usage.total}/{quotaStatus.limits.quota_limit} ครั้ง 
                ({quotaStatus.status.percentage_used}%)
              </Typography>
            </Alert>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                    {quotaStatus.usage.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ใช้งานทั้งหมด
                  </Typography>
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main" sx={{ fontWeight: 600 }}>
                    {quotaStatus.status.remaining}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    เหลือใช้ได้
                  </Typography>
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main" sx={{ fontWeight: 600 }}>
                    {quotaStatus.limits.quota_limit}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    โควต้าทั้งหมด
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        ) : (
          <Alert severity="info">
            กำลังโหลดข้อมูลโควต้า...
          </Alert>
        )}
      </Paper>

      {/* Geocoding Test */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          🗺️ ทดสอบ Geocoding
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
          <TextField
            fullWidth
            label="ที่อยู่ที่ต้องการทดสอบ"
            value={testAddress}
            onChange={(e) => setTestAddress(e.target.value)}
            variant="outlined"
            size="small"
          />
          <Button
            variant="contained"
            onClick={testGeocode}
            disabled={loading || !testAddress.trim()}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <LocationIcon />}
            sx={{ minWidth: 120 }}
          >
            ทดสอบ
          </Button>
        </Box>

        {geocodeResult && (
          <Box>
            {geocodeResult.success ? (
              <Box>
                <Alert 
                  severity="success" 
                  sx={{ mb: 2 }}
                  action={
                    geocodeResult.meta?.is_google_maps ? (
                      <Chip label="Google Maps" color="success" size="small" />
                    ) : (
                      <Chip label="OpenStreetMap" color="info" size="small" />
                    )
                  }
                >
                  ✅ ค้นหาพิกัดสำเร็จ!
                  {geocodeResult.meta?.quota_message && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {geocodeResult.meta.quota_message}
                    </Typography>
                  )}
                </Alert>

                {geocodeResult.data?.[0] && (
                  <Card variant="outlined" sx={{ mt: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                        📍 ผลลัพธ์:
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {geocodeResult.data[0].formatted_address}
                      </Typography>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            ละติจูด
                          </Typography>
                          <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            {geocodeResult.data[0].lat.toFixed(6)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            ลองจิจูด
                          </Typography>
                          <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            {geocodeResult.data[0].lng.toFixed(6)}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                )}
              </Box>
            ) : (
              <Alert severity="error">
                ❌ เกิดข้อผิดพลาด: {geocodeResult.error}
              </Alert>
            )}
          </Box>
        )}
      </Paper>

      {/* Distance Test */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          📏 ทดสอบ Distance Calculation
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
          <TextField
            label="ละติจูด"
            value={testLat}
            onChange={(e) => setTestLat(e.target.value)}
            variant="outlined"
            size="small"
            type="number"
            inputProps={{ step: "any" }}
          />
          <TextField
            label="ลองจิจูด"
            value={testLng}
            onChange={(e) => setTestLng(e.target.value)}
            variant="outlined"
            size="small"
            type="number"
            inputProps={{ step: "any" }}
          />
          <Button
            variant="contained"
            onClick={testDistance}
            disabled={loading || !testLat.trim() || !testLng.trim()}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <LocationIcon />}
            sx={{ minWidth: 150 }}
          >
            คำนวณระยะทาง
          </Button>
        </Box>

        {distanceResult && (
          <Box>
            {distanceResult.success ? (
              <Box>
                <Alert 
                  severity="success" 
                  sx={{ mb: 2 }}
                  action={
                    distanceResult.meta?.is_google_maps ? (
                      <Chip label="Google Maps" color="success" size="small" />
                    ) : (
                      <Chip label={distanceResult.data?.source || 'OpenStreetMap'} color="info" size="small" />
                    )
                  }
                >
                  ✅ คำนวณระยะทางสำเร็จ!
                  {distanceResult.meta?.quota_message && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {distanceResult.meta.quota_message}
                    </Typography>
                  )}
                </Alert>

                <Card variant="outlined" sx={{ mt: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                      📏 ผลลัพธ์:
                    </Typography>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          ระยะทาง
                        </Typography>
                        <Typography variant="h4" sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'primary.main' }}>
                          {distanceResult.data.distance} กม.
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          แหล่งข้อมูล
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                          {distanceResult.data.source === 'google' ? '🌟 Google Maps' : 
                           distanceResult.data.source === 'openstreetmap' ? '📍 OpenStreetMap' : 
                           '📐 คำนวณเส้นตรง'}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ) : (
              <Alert severity="error">
                ❌ เกิดข้อผิดพลาด: {distanceResult.error}
              </Alert>
            )}
          </Box>
        )}
      </Paper>

      {/* Instructions */}
      <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'info.50' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'info.main' }}>
          📋 วิธีการใช้งาน
        </Typography>
        <Box component="ol" sx={{ pl: 3 }}>
          <Box component="li" sx={{ mb: 1 }}>
            <Typography variant="body2">
              ตรวจสอบสถานะโควต้า Google Maps ด้านบน
            </Typography>
          </Box>
          <Box component="li" sx={{ mb: 1 }}>
            <Typography variant="body2">
              ใส่ที่อยู่ที่ต้องการทดสอบ แล้วกดปุ่ม "ทดสอบ"
            </Typography>
          </Box>
          <Box component="li" sx={{ mb: 1 }}>
            <Typography variant="body2">
              ดูผลลัพธ์ว่าใช้ Google Maps หรือ OpenStreetMap
            </Typography>
          </Box>
          <Box component="li">
            <Typography variant="body2">
              เมื่อเกิน 9,500 ครั้งต่อเดือน ระบบจะเปลี่ยนเป็น OpenStreetMap อัตโนมัติ
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
