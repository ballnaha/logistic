'use client';
import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  Alert,
  Paper,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  LocationOn as LocationIcon,
  MyLocation as MyLocationIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface GeocodeResult {
  lat: number;
  lng: number;
  formatted_address: string;
  confidence: number;
  query_used?: string;
  match_level?: string;
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

interface AddressGeocoderProps {
  companyName?: string;
  address?: string;
  onLocationSelect: (lat: number, lng: number, formattedAddress?: string) => Promise<void> | void;
  disabled?: boolean;
}

export default function AddressGeocoder({ 
  companyName, 
  address, 
  onLocationSelect,
  disabled = false 
}: AddressGeocoderProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [error, setError] = useState<string>('');
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [apiSource, setApiSource] = useState<string>('');
  const [quotaMessage, setQuotaMessage] = useState<string>('');

  const handleSearch = async () => {
    if (!address?.trim()) {
      setError('กรุณากรอกที่อยู่ก่อนค้นหา');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    // สร้าง timeout สำหรับการค้นหาพิกัด
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 วินาที timeout
    
    try {
      const response = await fetch('/api/geocoding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          address: address.trim(),
          companyName: companyName?.trim(),
        }),
      });

      clearTimeout(timeoutId);
      
      const result = await response.json();

      if (result.success) {
        // แสดงแค่ผลลัพธ์เดียวที่แม่นยำที่สุด
        const bestResult = result.data && result.data.length > 0 ? [result.data[0]] : [];
        setResults(bestResult);
        
        // เก็บข้อมูล API source และข้อความโควต้า
        setApiSource(result.meta?.source || 'unknown');
        setQuotaMessage(result.meta?.quota_message || '');
        
        if (bestResult.length === 0) {
          setError('ไม่พบข้อมูลพิกัดสำหรับที่อยู่นี้ กรุณาตรวจสอบที่อยู่อีกครั้ง');
        }
      } else {
        setError(result.error || 'เกิดข้อผิดพลาดในการค้นหาพิกัด');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      
      if (err.name === 'AbortError') {
        setError('การค้นหาหมดเวลา กรุณาลองใหม่อีกครั้ง');
      } else {
        setError('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่');
      }
      console.error('Geocoding error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = async (result: GeocodeResult) => {
    setCalculatingDistance(true);
    try {
      await onLocationSelect(result.lat, result.lng, result.formatted_address);
    } finally {
      setCalculatingDistance(false);
    }
    setOpen(false);
    setResults([]);
    setError('');
  };

  const handleOpen = () => {
    setOpen(true);
    // ค้นหาทันทีถ้ามีที่อยู่
    if (address?.trim()) {
      setTimeout(handleSearch, 100);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setResults([]);
    setError('');
    setLoading(false);
    setApiSource('');
    setQuotaMessage('');
  };

  const formatConfidence = (confidence: number): string => {
    if (confidence >= 0.8) return 'สูง';
    if (confidence >= 0.5) return 'ปานกลาง';
    return 'ต่ำ';
  };

  const getConfidenceColor = (confidence: number): 'success' | 'warning' | 'error' => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.5) return 'warning';
    return 'error';
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

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<LocationIcon />}
        onClick={handleOpen}
        disabled={disabled || !address?.trim()}
        size="small"
        sx={{
          textTransform: 'none',
          fontSize: '0.875rem',
          px: 2,
          py: 0.5,
          minWidth: 'auto',
          borderRadius: 1,
          '&:disabled': {
            opacity: 0.5,
          },
        }}
      >
        ค้นหาพิกัด
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '80vh',
          }
        }}
      >
        <DialogTitle sx={{ py: 1.5, px: 2, fontSize: '1rem' }}>
          ค้นหาพิกัด
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          {/* แสดงคำที่ค้นหา */}
          {(companyName?.trim() || address?.trim()) && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                คำที่ค้นหา:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {[companyName?.trim(), address?.trim()].filter(Boolean).join(' ')}
              </Typography>
            </Box>
          )}

          {/* Auto Search on Open - ลบปุ่มค้นหาออก */}

          {/* Error Message - minimal */}
          {error && (
            <Alert severity="warning" sx={{ mb: 2, py: 0.5, fontSize: '0.875rem' }}>
              {error}
            </Alert>
          )}

          {/* ลบ Quota Message ออก */}

          {/* Results */}
          {results.length > 0 && (
            <Box>
              {/* ลบ header ออก */}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {results.map((result, index) => (
                  <Paper
                    key={index}
                    elevation={1}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {/* Address - minimal */}
                    <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.4 }}>
                      {result.formatted_address}
                    </Typography>
                    
                    {/* Use Button - minimal */}
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={calculatingDistance ? <CircularProgress size={16} color="inherit" /> : <LocationIcon />}
                      onClick={() => handleLocationSelect(result)}
                      disabled={calculatingDistance}
                      sx={{ textTransform: 'none', mt: 1 }}
                      fullWidth
                    >
                      {calculatingDistance ? 'คำนวณ...' : 'เลือกใช้'}
                    </Button>
                  </Paper>
                ))}
              </Box>
            </Box>
          )}

          {/* Loading State - minimal */}
          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">กำลังค้นหา...</Typography>
            </Box>
          )}

          {/* ลบ Empty State ออก */}
        </DialogContent>

        {/* ลบ DialogActions ออก - ใช้ ESC หรือ click outside เพื่อปิด */}
      </Dialog>
    </>
  );
}
