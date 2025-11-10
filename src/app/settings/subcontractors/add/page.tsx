'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Notes as NotesIcon,
  ArrowBack as BackIcon,
  Badge as BadgeIcon,

} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import Layout from '../../../components/Layout';
import { useSnackbar } from '../../../../contexts/SnackbarContext';

export default function AddSubcontractorPage() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const { data: session } = useSession();

  // Form state
  const [formData, setFormData] = useState({
    subcontractorCode: '',
    subcontractorName: '',
    contactPerson: '',
    phone: '',
    address: '',
    remark: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  // Validation
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.subcontractorCode.trim()) {
      newErrors.subcontractorCode = 'กรุณาระบุรหัสผู้รับจ้างช่วง';
    }

    if (!formData.subcontractorName.trim()) {
      newErrors.subcontractorName = 'กรุณาระบุชื่อผู้รับจ้างช่วง';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      showSnackbar('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/subcontractors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        showSnackbar('เพิ่มผู้รับจ้างช่วงเรียบร้อยแล้ว', 'success');
        router.push('/settings/subcontractors');
      } else {
        showSnackbar(result.error || 'ไม่สามารถเพิ่มผู้รับจ้างช่วงได้', 'error');
      }
    } catch (error) {
      console.error('Error adding subcontractor:', error);
      showSnackbar('เกิดข้อผิดพลาดในการเพิ่มข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    router.push('/settings/subcontractors');
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
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              เพิ่มผู้รับจ้างช่วงใหม่
            </Typography>
            <Typography variant="body2" color="text.secondary">
              กรอกข้อมูลผู้รับจ้างช่วงใหม่ในระบบ
            </Typography>
          </Box>
          
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            href="/settings/subcontractors"
            sx={{ borderRadius: 2 }}
          >
            กลับ
          </Button>
        </Box>

        {/* Form */}
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BadgeIcon sx={{ mr: 1 }} />
                ข้อมูลทั่วไป
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                <TextField
                  required
                  fullWidth
                  label="รหัสผู้รับจ้างช่วง"
                  value={formData.subcontractorCode}
                  onChange={handleChange('subcontractorCode')}
                  error={!!errors.subcontractorCode}
                  helperText={errors.subcontractorCode}
                  disabled={loading}
                  placeholder='แนะนำให้ขึ้นด้วยด้วย 8xxxx เช่น 80001'
                  size="small"
                  InputProps={{
                    startAdornment: <BadgeIcon sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />

                <TextField
                  required
                  fullWidth
                  label="ชื่อผู้รับจ้างช่วง"
                  value={formData.subcontractorName}
                  onChange={handleChange('subcontractorName')}
                  error={!!errors.subcontractorName}
                  helperText={errors.subcontractorName}
                  disabled={loading}
                  size="small"
                  InputProps={{
                    startAdornment: <BusinessIcon sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PersonIcon sx={{ mr: 1 }} />
                ข้อมูลติดต่อ
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                <TextField
                  fullWidth
                  label="ผู้ติดต่อ"
                  value={formData.contactPerson}
                  onChange={handleChange('contactPerson')}
                  disabled={loading}
                  size="small"
                  InputProps={{
                    startAdornment: <PersonIcon sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />

                <TextField
                  fullWidth
                  label="เบอร์โทรศัพท์"
                  value={formData.phone}
                  onChange={handleChange('phone')}
                  disabled={loading}
                  size="small"
                  InputProps={{
                    startAdornment: <PhoneIcon sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              </Box>

              <Box sx={{ mt: 3 }}>
                <TextField
                  fullWidth
                  label="ที่อยู่"
                  size="small"
                  value={formData.address}
                  onChange={handleChange('address')}
                  disabled={loading}
                  multiline
                  rows={3}
                  InputProps={{
                    startAdornment: (
                      <LocationIcon sx={{ mr: 1, color: 'action.active', alignSelf: 'flex-start', mt: 2 }} />
                    ),
                  }}
                />
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <NotesIcon sx={{ mr: 1 }} />
                หมายเหตุ
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <TextField
                fullWidth
                label="หมายเหตุ"
                size="small"
                value={formData.remark}
                onChange={handleChange('remark')}
                disabled={loading}
                multiline
                rows={4}
                placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)"
              />
            </Box>

            {/* Action Buttons */}
            <Divider sx={{ my: 3 }} />
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
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
                startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
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
