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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Search as SearchIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  Map as MapIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';

interface GeocodeResult {
  lat: number;
  lng: number;
  formatted_address: string;
  confidence: number;
  query_used?: string;
  match_level?: string;
  final_score?: number;
  address_components: {
    country?: string;
    state?: string;
    city?: string;
    district?: string;
    subdistrict?: string;
    postcode?: string;
    road?: string;
    house_number?: string;
  };
  type?: string;
  source?: string;
}

export default function TestGeocodingAccuracyPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    address: '',
  });
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [error, setError] = useState('');
  const [apiMeta, setApiMeta] = useState<any>(null);

  // ตัวอย่างข้อมูลลูกค้าสำหรับทดสอบ
  const testCustomers = [
    {
      name: 'บริษัท เค.เอส. เมทัล พริ้นติ้ง จำกัด',
      address: '70/1 หมู่ 4 ตำบลคลองหนึ่ง อำเภอคลองหลวง จังหวัดปทุมธานี 12120',
      expectedLat: '14.0833',
      expectedLng: '100.6167'
    },
    {
      name: 'บริษัท ไทยสแตนดาร์ด อินดัสทรี่ จำกัด',
      address: '123 หมู่ 5 ตำบลลำลูกกา อำเภอลำลูกกา จังหวัดปทุมธานี 12150',
      expectedLat: '13.8500',
      expectedLng: '100.6500'
    },
    {
      name: 'บริษัท ซีพี ออลล์ จำกัด (มหาชน)',
      address: '313 ซีพี ทาวเวอร์ ถนนสีลม แขวงสีลม เขตบางรัก กรุงเทพมหานคร 10500',
      expectedLat: '13.7278',
      expectedLng: '100.5340'
    },
    {
      name: 'บริษัท เซ็นทรัล รีเทล คอร์ปอเรชั่น จำกัด (มหาชน)',
      address: '4, 4/1-4/2, 4/4 ถนนราชดำริ แขวงลุมพินี เขตปทุมวัน กรุงเทพมหานคร 10330',
      expectedLat: '13.7440',
      expectedLng: '100.5390'
    }
  ];

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleTestCustomer = (customer: any) => {
    setFormData({
      companyName: customer.name,
      address: customer.address
    });
  };

  const handleGeocode = async () => {
    if (!formData.address.trim()) {
      setError('กรุณากรอกที่อยู่');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);
    setApiMeta(null);

    try {
      const response = await fetch('/api/geocoding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: formData.address.trim(),
          companyName: formData.companyName.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.data || []);
        setApiMeta(data.meta);
      } else {
        setError(data.error || 'เกิดข้อผิดพลาดในการค้นหาพิกัด');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  const getMatchLevelColor = (matchLevel?: string): 'success' | 'info' | 'warning' | 'error' => {
    switch (matchLevel) {
      case 'exact': return 'success';
      case 'full_address': return 'info';
      case 'district_province': return 'warning';
      case 'province_only': return 'warning';
      case 'partial': return 'error';
      default: return 'error';
    }
  };

  const getMatchLevelText = (matchLevel?: string): string => {
    switch (matchLevel) {
      case 'exact': return 'ตรงทุกประการ';
      case 'full_address': return 'ที่อยู่เต็ม';
      case 'district_province': return 'อำเภอ/จังหวัด';
      case 'province_only': return 'จังหวัดเท่านั้น';
      case 'partial': return 'บางส่วน';
      default: return 'ไม่ทราบ';
    }
  };

  const getSourceIcon = (source?: string) => {
    switch (source) {
      case 'google': return <CheckIcon color="success" />;
      case 'openstreetmap': return <InfoIcon color="info" />;
      default: return <WarningIcon color="warning" />;
    }
  };

  return (
    <Layout showSidebar={false}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          ทดสอบความแม่นยำของการค้นหาพิกัด
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          ทดสอบ Geocoding API ด้วยข้อมูลชื่อบริษัท + ที่อยู่
        </Typography>

        <Grid container spacing={3}>
          {/* ฟอร์มกรอกข้อมูล */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon />
                กรอกข้อมูลลูกค้า
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="ชื่อบริษัท/ลูกค้า"
                  value={formData.companyName}
                  onChange={handleInputChange('companyName')}
                  size="small"
                  fullWidth
                  placeholder="บริษัท เค.เอส. เมทัล พริ้นติ้ง จำกัด"
                />

                <TextField
                  label="ที่อยู่"
                  value={formData.address}
                  onChange={handleInputChange('address')}
                  multiline
                  rows={3}
                  size="small"
                  fullWidth
                  required
                  placeholder="70/1 หมู่ 4 ตำบลคลองหนึ่ง อำเภอคลองหลวง จังหวัดปทุมธานี 12120"
                />

                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                  onClick={handleGeocode}
                  disabled={loading || !formData.address.trim()}
                  size="large"
                  sx={{ mt: 1 }}
                >
                  {loading ? 'กำลังค้นหา...' : 'ค้นหาพิกัด'}
                </Button>
              </Box>
            </Paper>

            {/* ตัวอย่างข้อมูลลูกค้า */}
            <Paper sx={{ p: 3, borderRadius: 2, mt: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                ตัวอย่างข้อมูลลูกค้าสำหรับทดสอบ
              </Typography>
              <List dense>
                {testCustomers.map((customer, index) => (
                  <ListItem
                    key={index}
                    button
                    onClick={() => handleTestCustomer(customer)}
                    sx={{ 
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                  >
                    <ListItemIcon>
                      <BusinessIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={customer.name}
                      secondary={customer.address}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* ผลลัพธ์ */}
          <Grid item xs={12} md={6}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {apiMeta && (
              <Alert 
                severity={apiMeta.is_google_maps ? 'success' : 'info'} 
                sx={{ mb: 2 }}
                icon={getSourceIcon(apiMeta.source)}
              >
                {apiMeta.quota_message}
              </Alert>
            )}

            {results.length > 0 && (
              <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MapIcon />
                  ผลการค้นหา ({results.length} รายการ)
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {results.map((result, index) => (
                    <Card key={index} variant="outlined" sx={{ 
                      borderColor: index === 0 ? 'primary.main' : 'divider',
                      borderWidth: index === 0 ? 2 : 1 
                    }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        {index === 0 && (
                          <Chip 
                            label="แนะนำ" 
                            color="primary" 
                            size="small" 
                            sx={{ mb: 1 }}
                          />
                        )}

                        {/* พิกัด */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <LocationIcon color="primary" fontSize="small" />
                          <Typography variant="h6" color="primary">
                            {result.lat.toFixed(6)}, {result.lng.toFixed(6)}
                          </Typography>
                          {result.final_score && (
                            <Chip 
                              label={`คะแนน: ${result.final_score.toFixed(2)}`} 
                              size="small" 
                              color="info"
                              variant="outlined"
                            />
                          )}
                        </Box>

                        {/* ที่อยู่ */}
                        <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                          {result.formatted_address}
                        </Typography>

                        {/* ข้อมูลเพิ่มเติม */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                          <Chip 
                            label={getMatchLevelText(result.match_level)}
                            color={getMatchLevelColor(result.match_level)}
                            size="small"
                          />
                          <Chip 
                            label={`Confidence: ${(result.confidence * 100).toFixed(0)}%`}
                            size="small"
                            variant="outlined"
                          />
                          {result.query_used && (
                            <Chip 
                              label={`Query: ${result.query_used.substring(0, 30)}...`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>

                        {/* ส่วนประกอบที่อยู่ */}
                        {(result.address_components.road || result.address_components.district) && (
                          <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {[
                                result.address_components.house_number,
                                result.address_components.road,
                                result.address_components.subdistrict,
                                result.address_components.district,
                                result.address_components.state,
                                result.address_components.postcode
                              ].filter(Boolean).join(', ')}
                            </Typography>
                          </Box>
                        )}

                        {/* ลิงก์ Google Maps */}
                        <Button
                          variant="outlined"
                          size="small"
                          href={`https://www.google.com/maps?q=${result.lat},${result.lng}`}
                          target="_blank"
                          sx={{ mt: 1 }}
                        >
                          ดูใน Google Maps
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
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
            1. เลือกข้อมูลลูกค้าจากตัวอย่างที่ให้ไว้ หรือกรอกข้อมูลที่ต้องการทดสอบ
          </Typography>
          <Typography variant="body2" paragraph>
            2. กดปุ่ม "ค้นหาพิกัด" เพื่อดูผลลัพธ์จากระบบ
          </Typography>
          <Typography variant="body2" paragraph>
            3. ตรวจสอบพิกัดที่ได้โดยคลิก "ดูใน Google Maps" และเปรียบเทียบกับตำแหน่งจริง
          </Typography>
          <Typography variant="body2" paragraph>
            4. ผลลัพธ์แรกจะเป็นผลลัพธ์ที่ระบบแนะนำ (มีคะแนนสูงสุด)
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              🎯 เป้าหมายความแม่นยำ:
            </Typography>
            <Typography variant="body2" color="success.main" sx={{ fontWeight: 500 }}>
              • ระดับ "ตรงทุกประการ" หรือ "ที่อยู่เต็ม": ผิดเพี้ยนไม่เกิน 100 เมตร
            </Typography>
            <Typography variant="body2" color="info.main" sx={{ fontWeight: 500 }}>
              • ระดับ "อำเภอ/จังหวัด": ผิดเพี้ยนไม่เกิน 1 กิโลเมตร
            </Typography>
            <Typography variant="body2" color="warning.main" sx={{ fontWeight: 500 }}>
              • ระดับ "จังหวัดเท่านั้น": ผิดเพี้ยนไม่เกิน 10 กิโลเมตร
            </Typography>
          </Box>
        </Box>
      </Box>
    </Layout>
  );
}
