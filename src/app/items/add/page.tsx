'use client';
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  InputAdornment,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Inventory as InventoryIcon,
  Description as DescriptionIcon,
  Category as CategoryIcon,
  AttachMoney as MoneyIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Layout from '../../components/Layout';
import { useSnackbar } from '../../../contexts/SnackbarContext';

// Common unit options
const unitOptions = [
  'SH'
];


export default function AddItemPage() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const { data: session } = useSession();

  // Form state
  const [formData, setFormData] = useState({
    ptPart: '',
    ptDesc1: '',
    ptDesc2: '',
    ptUm: 'SH',
    ptPrice: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Prevent scroll wheel on number inputs
  const handleNumberInputWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  // Handle input change
  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.ptPart.trim()) {
      newErrors.ptPart = 'กรุณากรอกรหัสพัสดุ';
    }

    if (!formData.ptDesc1.trim()) {
      newErrors.ptDesc1 = 'กรุณากรอกคำอธิบายหลัก';
    }

    if (!formData.ptUm.trim()) {
      newErrors.ptUm = 'กรุณาเลือกหน่วยนับ';
    }

    if (formData.ptPrice && (isNaN(parseFloat(formData.ptPrice)) || parseFloat(formData.ptPrice) < 0)) {
      newErrors.ptPrice = 'กรุณากรอกราคาเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      showSnackbar('กรุณาตรวจสอบข้อมูลที่กรอก', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          ptPrice: formData.ptPrice ? parseFloat(formData.ptPrice) : null,
          isActive: true, // พัสดุใหม่จะเปิดใช้งานโดยอัตโนมัติ
          createdBy: session?.user?.name || session?.user?.email || 'System',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showSnackbar('เพิ่มข้อมูลพัสดุสำเร็จ', 'success');
        router.push('/items');
      } else {
        showSnackbar(result.error || 'ไม่สามารถเพิ่มข้อมูลพัสดุได้', 'error');
      }
    } catch (error) {
      showSnackbar('เกิดข้อผิดพลาดในการเพิ่มข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    router.push('/items');
  };

  return (
    <Layout showSidebar={false}>
      <Box>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2
        }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <InventoryIcon color="primary" />
              เพิ่มพัสดุใหม่
            </Typography>
            
          </Box>
          
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            href="/items"
            sx={{ borderRadius: 2 }}
          >
            กลับ
          </Button>
        </Box>

        {/* Form */}
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <form onSubmit={handleSubmit}>
            {/* Basic Information */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <InventoryIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  ข้อมูลพื้นฐาน
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                  <TextField
                    fullWidth
                    label="รหัสพัสดุ"
                    value={formData.ptPart}
                    onChange={handleChange('ptPart')}
                    error={!!errors.ptPart}
                    helperText={errors.ptPart || 'รหัสพัสดุต้องไม่ซ้ำกัน'}
                    required
                    size="small"
                    
                  />

                  <FormControl fullWidth size="small" error={!!errors.ptUm}>
                    <InputLabel required>หน่วยนับ</InputLabel>
                    <Select
                      value={formData.ptUm}
                      label="หน่วยนับ"
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, ptUm: e.target.value }));
                        if (errors.ptUm) {
                          setErrors(prev => ({ ...prev, ptUm: '' }));
                        }
                      }}
                     
                    >
                      {unitOptions.map((unit) => (
                        <MenuItem key={unit} value={unit}>
                          {unit}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.ptUm && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5, mx: 1.75 }}>
                        {errors.ptUm}
                      </Typography>
                    )}
                  </FormControl>
                </Box>

                <TextField
                  fullWidth
                  label="คำอธิบายหลัก"
                  value={formData.ptDesc1}
                  onChange={handleChange('ptDesc1')}
                  error={!!errors.ptDesc1}
                  helperText={errors.ptDesc1 || 'ชื่อหรือคำอธิบายหลักของพัสดุ'}
                  required
                  size="small"
                  
                />

                <TextField
                  fullWidth
                  label="คำอธิบายรอง"
                  value={formData.ptDesc2}
                  onChange={handleChange('ptDesc2')}
                  helperText="คำอธิบายเพิ่มเติม (ไม่จำเป็น)"
                  size="small"
                  multiline
                  rows={2}
                  
                />

                <TextField
                    fullWidth
                    label="ราคา"
                    value={formData.ptPrice}
                    onChange={handleChange('ptPrice')}
                    onWheel={handleNumberInputWheel}
                    error={!!errors.ptPrice}
                    helperText={errors.ptPrice || 'ราคาต่อหน่วย'}
                    type="number"
                    size="small"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          บาท
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{ 
                      step: "0.01", 
                      min: "0",
                      style: { textAlign: 'left' }
                    }}
                    
                  />
              </Box>
            </Box>



            {/* Action Buttons */}
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              justifyContent: 'flex-end',
              pt: 3,
              borderTop: '1px solid',
              borderColor: 'grey.200'
            }}>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                disabled={loading}
                sx={{ minWidth: 120 }}
              >
                ยกเลิก
              </Button>
              
              <Button
                type="submit"
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                disabled={loading}
                sx={{ minWidth: 120 }}
              >
                {loading ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </Layout>
  );
}
