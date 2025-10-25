'use client';
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  Card,
  CardContent,
  Divider,
  Chip,
} from '@mui/material';
import { LocationOn as LocationIcon } from '@mui/icons-material';

export default function DebugDistancePage() {
  const [geocodeResult, setGeocodeResult] = useState<any>(null);
  const [distanceResult, setDistanceResult] = useState<any>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [fixedTestResult, setFixedTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // ข้อมูลทดสอบที่คุณให้มา
  const [companyName, setCompanyName] = useState('บริษัท เค. เอส โลหะการพิมพ์ จำกัด');
  const [address, setAddress] = useState('27 หมู่ 4 ถนนพหลโยธิน จ. ปทุมธานี');
  
  // พิกัดบริษัท PSC
  const PSC_LAT = 13.537051;
  const PSC_LNG = 100.2173051;

  const testGeocode = async () => {
    setLoading(true);
    setGeocodeResult(null);
    setDistanceResult(null);
    
    try {
      console.log('🔍 Testing geocoding with:', { companyName, address });
      
      const response = await fetch('/api/geocoding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address,
          companyName: companyName
        })
      });
      
      const result = await response.json();
      setGeocodeResult(result);
      
      console.log('🔍 Geocoding result:', result);
      
      // ถ้าได้พิกัดแล้ว ให้ทดสอบ distance ต่อ
      if (result.success && result.data?.[0]) {
        const target = result.data[0];
        await testDistance(target.lat, target.lng);
      }
      
    } catch (error) {
      console.error('Geocoding error:', error);
      setGeocodeResult({ success: false, error: 'เกิดข้อผิดพลาด' });
    } finally {
      setLoading(false);
    }
  };

  const testDistance = async (targetLat: number, targetLng: number) => {
    try {
      console.log(`📏 Testing distance: PSC (${PSC_LAT}, ${PSC_LNG}) → Target (${targetLat}, ${targetLng})`);
      
      const response = await fetch('/api/distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originLat: PSC_LAT,
          originLng: PSC_LNG,
          destLat: targetLat,
          destLng: targetLng
        })
      });
      
      const result = await response.json();
      setDistanceResult(result);
      
      console.log('📏 Distance result:', result);
      
    } catch (error) {
      console.error('Distance error:', error);
      setDistanceResult({ success: false, error: 'เกิดข้อผิดพลาด' });
    }
  };

  // Manual distance test
  const testManualDistance = async () => {
    // ทดสอบด้วยพิกัดที่รู้จักในปทุมธานี
    const knownLat = 14.0206; // ประมาณกลางปทุมธานี
    const knownLng = 100.5256;
    
    await testDistance(knownLat, knownLng);
  };

  // Test multiple geocoding strategies
  const testMultipleGeocoding = async () => {
    setLoading(true);
    setTestResults(null);
    
    try {
      console.log('🧪 Testing multiple geocoding strategies...');
      
      const response = await fetch('/api/test-specific-geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testCase: 'ks_metal' })
      });
      
      const result = await response.json();
      setTestResults(result);
      
      console.log('🧪 Multiple geocoding test results:', result);
      
    } catch (error) {
      console.error('Multiple geocoding test error:', error);
      setTestResults({ success: false, error: 'เกิดข้อผิดพลาด' });
    } finally {
      setLoading(false);
    }
  };

  // Test fixed geocoding
  const testFixedGeocoding = async () => {
    setLoading(true);
    setFixedTestResult(null);
    
    try {
      console.log('🔧 Testing fixed geocoding implementation...');
      
      const response = await fetch('/api/test-fixed-geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName,
          address: address
        })
      });
      
      const result = await response.json();
      setFixedTestResult(result);
      
      console.log('🔧 Fixed geocoding test result:', result);
      
    } catch (error) {
      console.error('Fixed geocoding test error:', error);
      setFixedTestResult({ success: false, error: 'เกิดข้อผิดพลาด' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 3, textAlign: 'center' }}>
        🐛 Debug Distance Calculation
      </Typography>

      {/* Test Data */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          📝 ข้อมูลทดสอบ
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            label="ชื่อบริษัท"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            variant="outlined"
            size="small"
          />
          <TextField
            fullWidth
            label="ที่อยู่"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            variant="outlined"
            size="small"
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button
            variant="contained"
            onClick={testGeocode}
            disabled={loading}
            startIcon={<LocationIcon />}
          >
            ทดสอบ Geocoding + Distance
          </Button>
          
          <Button
            variant="outlined"
            onClick={testManualDistance}
            disabled={loading}
          >
            ทดสอบ Distance (พิกัดปทุมธานี)
          </Button>
          
          <Button
            variant="contained"
            color="warning"
            onClick={testMultipleGeocoding}
            disabled={loading}
          >
            🧪 ทดสอบ 10 วิธีค้นหาพิกัด
          </Button>
          
          <Button
            variant="contained"
            color="success"
            onClick={testFixedGeocoding}
            disabled={loading}
          >
            ✅ ทดสอบการแก้ไขแล้ว
          </Button>
        </Box>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>PSC coordinates:</strong> {PSC_LAT}, {PSC_LNG}<br />
            <strong>Expected distance to ปทุมธานี:</strong> ~88.5 km (จาก Google Maps Web)
          </Typography>
        </Alert>
      </Paper>

      {/* Geocoding Results */}
      {geocodeResult && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            🗺️ ผลลัพธ์ Geocoding
          </Typography>
          
          {geocodeResult.success ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                ✅ Geocoding สำเร็จ! Source: {geocodeResult.meta?.source || 'unknown'}
              </Alert>
              
              {geocodeResult.data?.[0] && (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                      📍 พิกัดที่พบ:
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {geocodeResult.data[0].formatted_address}
                    </Typography>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Latitude
                        </Typography>
                        <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
                          {geocodeResult.data[0].lat.toFixed(6)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Longitude
                        </Typography>
                        <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
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
              ❌ Geocoding ล้มเหลว: {geocodeResult.error}
            </Alert>
          )}
        </Paper>
      )}

      {/* Distance Results */}
      {distanceResult && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            📏 ผลลัพธ์ Distance Calculation
          </Typography>
          
          {distanceResult.success ? (
            <Box>
              <Alert 
                severity={distanceResult.data.distance > 200 ? 'warning' : 'success'} 
                sx={{ mb: 2 }}
                action={
                  <Chip 
                    label={distanceResult.data.source} 
                    color={distanceResult.data.source === 'google' ? 'success' : 'info'} 
                    size="small" 
                  />
                }
              >
                Distance: {distanceResult.data.distance} km
                {distanceResult.data.distance > 200 && ' ⚠️ ดูมากเกินไป!'}
              </Alert>
              
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        ระยะทาง
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {distanceResult.data.distance} กม.
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        แหล่งข้อมูล
                      </Typography>
                      <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                        {distanceResult.data.source === 'google' ? '🌟 Google Maps' : 
                         distanceResult.data.source === 'openstreetmap' ? '📍 OpenStreetMap' : 
                         '📐 Haversine'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        ความแตกต่างจาก Google Web
                      </Typography>
                      <Typography variant="h6" sx={{ 
                        color: Math.abs(distanceResult.data.distance - 88.5) > 50 ? 'error.main' : 'success.main' 
                      }}>
                        {Math.abs(distanceResult.data.distance - 88.5).toFixed(1)} กม.
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ) : (
            <Alert severity="error">
              ❌ Distance calculation ล้มเหลว: {distanceResult.error}
            </Alert>
          )}
        </Paper>
      )}

      {/* Multiple Geocoding Test Results */}
      {testResults && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            🧪 ผลลัพธ์การทดสอบ 10 วิธีค้นหา
          </Typography>
          
          {testResults.success ? (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                ทดสอบ {testResults.data.totalQueries} วิธี → สำเร็จ {testResults.data.successfulQueries} วิธี → 
                อยู่ในปทุมธานี {testResults.data.pathumThaniResults} วิธี
              </Alert>
              
              {testResults.data.bestResults.length > 0 ? (
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'success.main' }}>
                    ✅ วิธีที่ได้ผลลัพธ์ในปทุมธานี:
                  </Typography>
                  
                  {testResults.data.bestResults.map((result: any, index: number) => (
                    <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                          วิธีที่ {index + 1}: {result.query}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          📍 {result.location.formatted_address}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Chip 
                            size="small" 
                            label={`${result.location.lat.toFixed(6)}, ${result.location.lng.toFixed(6)}`} 
                            color="primary" 
                          />
                          <Chip 
                            size="small" 
                            label="✅ ในปทุมธานี" 
                            color="success" 
                          />
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => testDistance(result.location.lat, result.location.lng)}
                          >
                            ทดสอบระยะทาง
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Alert severity="warning">
                  ❌ ไม่พบวิธีค้นหาที่ให้ผลลัพธ์ในปทุมธานี
                </Alert>
              )}
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="body2" color="text.secondary">
                ดูรายละเอียดครบถ้วนใน Browser Console (F12)
              </Typography>
            </Box>
          ) : (
            <Alert severity="error">
              ❌ การทดสอบล้มเหลว: {testResults.error}
            </Alert>
          )}
        </Paper>
      )}

      {/* Fixed Geocoding Test Results */}
      {fixedTestResult && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, border: '2px solid', borderColor: fixedTestResult.success ? 'success.main' : 'error.main' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            ✅ ผลลัพธ์การทดสอบหลังแก้ไข
          </Typography>
          
          {fixedTestResult.success ? (
            <Box>
              <Alert severity={fixedTestResult.data.validation.overall_success ? 'success' : 'warning'} sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {fixedTestResult.data.validation.overall_success ? 
                    '🎉 การแก้ไขสำเร็จ! ระบบทำงานถูกต้องแล้ว' : 
                    '⚠️ ยังต้องปรับปรุงเพิ่มเติม'
                  }
                </Typography>
              </Alert>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                {/* Geocoding Results */}
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      📍 Geocoding
                      {fixedTestResult.data.validation.coordinates_valid ? 
                        <Chip label="✅ ถูกต้อง" color="success" size="small" /> :
                        <Chip label="❌ ผิด" color="error" size="small" />
                      }
                    </Typography>
                    
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Query:</strong> {fixedTestResult.data.geocoding.query_used}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Address:</strong> {fixedTestResult.data.geocoding.formatted_address}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Coordinates:</strong> {fixedTestResult.data.geocoding.coordinates.lat.toFixed(6)}, {fixedTestResult.data.geocoding.coordinates.lng.toFixed(6)}
                    </Typography>
                    <Chip 
                      size="small" 
                      label={fixedTestResult.data.geocoding.is_in_pathum_thani ? "✅ ในปทุมธานี" : "❌ นอกปทุมธานี"} 
                      color={fixedTestResult.data.geocoding.is_in_pathum_thani ? "success" : "error"} 
                    />
                  </CardContent>
                </Card>
                
                {/* Distance Results */}
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      📏 Distance
                      {fixedTestResult.data.validation.distance_valid ? 
                        <Chip label="✅ ถูกต้อง" color="success" size="small" /> :
                        <Chip label="❌ ผิด" color="error" size="small" />
                      }
                    </Typography>
                    
                    <Typography variant="h4" sx={{ fontWeight: 600, color: fixedTestResult.data.validation.distance_valid ? 'success.main' : 'error.main', mb: 1 }}>
                      {fixedTestResult.data.distance.value} กม.
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Source:</strong> {fixedTestResult.data.distance.source}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Expected:</strong> {fixedTestResult.data.distance.target_distance} กม.
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Range:</strong> {fixedTestResult.data.distance.expected_range}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          ) : (
            <Alert severity="error">
              ❌ การทดสอบล้มเหลว: {fixedTestResult.error}
              {fixedTestResult.details && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  รายละเอียด: {fixedTestResult.details}
                </Typography>
              )}
            </Alert>
          )}
        </Paper>
      )}

      {/* Debug Info */}
      <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'warning.50' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'warning.main' }}>
          🔍 วิธีการ Debug
        </Typography>
        <Box component="ol" sx={{ pl: 3 }}>
          <Box component="li" sx={{ mb: 1 }}>
            <Typography variant="body2">
              เปิด Browser Console (F12) เพื่อดู logs
            </Typography>
          </Box>
          <Box component="li" sx={{ mb: 1 }}>
            <Typography variant="body2">
              ดูว่า Geocoding ได้พิกัดถูกต้องหรือไม่
            </Typography>
          </Box>
          <Box component="li" sx={{ mb: 1 }}>
            <Typography variant="body2">
              ตรวจสอบว่าใช้ Google Maps หรือ OpenStreetMap
            </Typography>
          </Box>
          <Box component="li">
            <Typography variant="body2">
              เปรียบเทียบผลลัพธ์กับ Google Maps Web
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
