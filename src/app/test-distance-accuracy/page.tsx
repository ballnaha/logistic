'use client';
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import {
  Calculate as CalculateIcon,
  Map as MapIcon,
  Speed as SpeedIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';

export default function TestDistanceAccuracyPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    originLat: '13.537051',   // PSC
    originLng: '100.2173051', // PSC
    destLat: '',
    destLng: '',
  });
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  // ตัวอย่างพิกัดสำหรับทดสอบ
  const testLocations = [
    {
      name: 'สนามบินสุวรรณภูมิ',
      lat: '13.681108',
      lng: '100.747283',
      expectedDistance: '~50 กม.' // ระยะทางประมาณจาก Google Maps
    },
    {
      name: 'MBK Center',
      lat: '13.744677',
      lng: '100.530441',
      expectedDistance: '~30 กม.'
    },
    {
      name: 'ตลาดจตุจักร',
      lat: '13.799632',
      lng: '100.549271',
      expectedDistance: '~35 กม.'
    },
    {
      name: 'พาราไดซ์ พาร์ค ศรีราชา',
      lat: '13.172882',
      lng: '100.928612',
      expectedDistance: '~75 กม.'
    }
  ];

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleTestLocation = (location: any) => {
    setFormData(prev => ({
      ...prev,
      destLat: location.lat,
      destLng: location.lng
    }));
  };

  const handleCalculateDistance = async () => {
    if (!formData.originLat || !formData.originLng || !formData.destLat || !formData.destLng) {
      setError('กรุณากรอกพิกัดครบถ้วน');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/distance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originLat: parseFloat(formData.originLat),
          originLng: parseFloat(formData.originLng),
          destLat: parseFloat(formData.destLat),
          destLng: parseFloat(formData.destLng),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'เกิดข้อผิดพลาดในการคำนวณระยะทาง');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'google': return 'success';
      case 'openstreetmap': return 'info';
      case 'haversine': return 'warning';
      default: return 'default';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'google': return 'Google Maps';
      case 'openstreetmap': return 'OpenStreetMap';
      case 'haversine': return 'คำนวณเส้นตรง';
      default: return source;
    }
  };

  return (
    <Layout showSidebar={false}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          ทดสอบความแม่นยำของระยะทาง
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          เปรียบเทียบระยะทางที่คำนวณได้กับ Google Maps จริง
        </Typography>

        <Grid container spacing={3}>
          {/* ฟอร์มกรอกพิกัด */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationIcon />
                กรอกพิกัด
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="จุดเริ่มต้น - ละติจูด"
                    value={formData.originLat}
                    onChange={handleInputChange('originLat')}
                    type="number"
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="จุดเริ่มต้น - ลองจิจูด"
                    value={formData.originLng}
                    onChange={handleInputChange('originLng')}
                    type="number"
                    size="small"
                    fullWidth
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="จุดหมาย - ละติจูด"
                    value={formData.destLat}
                    onChange={handleInputChange('destLat')}
                    type="number"
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="จุดหมาย - ลองจิจูด"
                    value={formData.destLng}
                    onChange={handleInputChange('destLng')}
                    type="number"
                    size="small"
                    fullWidth
                  />
                </Box>

                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CalculateIcon />}
                  onClick={handleCalculateDistance}
                  disabled={loading}
                  size="large"
                  sx={{ mt: 1 }}
                >
                  {loading ? 'กำลังคำนวณ...' : 'คำนวณระยะทาง'}
                </Button>
              </Box>
            </Paper>

            {/* ตัวอย่างพิกัดสำหรับทดสอบ */}
            <Paper sx={{ p: 3, borderRadius: 2, mt: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                ตัวอย่างพิกัดสำหรับทดสอบ
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {testLocations.map((location, index) => (
                  <Button
                    key={index}
                    variant="outlined"
                    onClick={() => handleTestLocation(location)}
                    sx={{ 
                      justifyContent: 'space-between',
                      textTransform: 'none',
                      p: 1.5
                    }}
                  >
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {location.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {location.lat}, {location.lng}
                      </Typography>
                    </Box>
                    <Chip 
                      label={location.expectedDistance} 
                      size="small" 
                      color="primary" 
                      variant="outlined" 
                    />
                  </Button>
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* ผลลัพธ์ */}
          <Grid item xs={12} md={6}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {result && (
              <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MapIcon />
                  ผลการคำนวณ
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* ระยะทาง */}
                  <Card variant="outlined">
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <SpeedIcon color="primary" />
                        <Typography variant="h6">ระยะทาง</Typography>
                      </Box>
                      <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                        {result.data.distance} กม.
                      </Typography>
                      <Chip 
                        label={getSourceLabel(result.data.source)}
                        color={getSourceColor(result.data.source)}
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </CardContent>
                  </Card>

                  {/* ระยะเวลา */}
                  {result.data.duration && (
                    <Card variant="outlined">
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <TimeIcon color="info" />
                          <Typography variant="h6">ระยะเวลา</Typography>
                        </Box>
                        <Typography variant="h5" color="info.main" sx={{ fontWeight: 600 }}>
                          {Math.round(result.data.duration / 60)} นาที
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ({result.data.duration} วินาที)
                        </Typography>
                      </CardContent>
                    </Card>
                  )}

                  {/* ข้อมูลเพิ่มเติม */}
                  <Card variant="outlined">
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        ข้อมูลเพิ่มเติม
                      </Typography>
                      
                      {result.meta?.quota_message && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          {result.meta.quota_message}
                        </Typography>
                      )}
                      
                      {result.data.warning && (
                        <Alert severity="warning" sx={{ mt: 1, py: 0.5 }}>
                          <Typography variant="caption">
                            {result.data.warning}
                          </Typography>
                        </Alert>
                      )}

                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        พิกัดต้นทาง: {result.meta.coordinates.origin.lat}, {result.meta.coordinates.origin.lng}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        พิกัดปลายทาง: {result.meta.coordinates.destination.lat}, {result.meta.coordinates.destination.lng}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              </Paper>
            )}
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        <Box sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            📋 วิธีการทดสอบความแม่นยำ
          </Typography>
          <Typography variant="body2" paragraph>
            1. เลือกพิกัดจากตัวอย่างที่ให้ไว้ หรือกรอกพิกัดที่ต้องการทดสอบ
          </Typography>
          <Typography variant="body2" paragraph>
            2. กดปุ่ม "คำนวณระยะทาง" เพื่อดูผลลัพธ์จากระบบ
          </Typography>
          <Typography variant="body2" paragraph>
            3. เปิด Google Maps ในเบราว์เซอร์ และใส่พิกัดเดียวกันเพื่อเปรียบเทียบ
          </Typography>
          <Typography variant="body2" paragraph>
            4. ตรวจสอบว่าระยะทางที่ได้จากระบบใกล้เคียงกับ Google Maps หรือไม่
          </Typography>
          <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
            🎯 เป้าหมาย: ระยะทางจากระบบควรใกล้เคียงกับ Google Maps ±5%
          </Typography>
        </Box>
      </Box>
    </Layout>
  );
}
