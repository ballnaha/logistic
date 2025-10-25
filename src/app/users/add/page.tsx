'use client';
import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Alert,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Visibility,
  VisibilityOff,
  ArrowBack as BackIcon,
  } from '@mui/icons-material';
import Layout from '../../components/Layout';
import { useSnackbar } from '../../../contexts/SnackbarContext';

interface UserFormData {
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function AddUserPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    firstName: '',
    lastName: '',
    role: 'user',
  });

  const [errors, setErrors] = useState<Partial<UserFormData>>({});

  // Check if user is admin
  const isAdmin = session?.user?.role === 'admin';

  const validateForm = () => {
    const newErrors: Partial<UserFormData> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'กรุณากรอก Username';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username ต้องมีอย่างน้อย 3 ตัวอักษร';
    }

    if (!formData.password) {
      newErrors.password = 'กรุณากรอกรหัสผ่าน';
    } else if (formData.password.length < 6) {
      newErrors.password = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'กรุณายืนยันรหัสผ่าน';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'รหัสผ่านไม่ตรงกัน';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof UserFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleRoleChange = (event: any) => {
    setFormData(prev => ({ ...prev, role: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          password: formData.password,
          email: formData.email.trim() || null,
          firstName: formData.firstName.trim() || null,
          lastName: formData.lastName.trim() || null,
          role: formData.role,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showSnackbar('สร้างผู้ใช้งานสำเร็จ', 'success');
        router.push('/users');
      } else {
        showSnackbar(result.error || 'ไม่สามารถสร้างผู้ใช้งานได้', 'error');
      }
    } catch (error) {
      showSnackbar('เกิดข้อผิดพลาดในการสร้างผู้ใช้งาน', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            ไม่มีสิทธิ์เข้าถึงหน้านี้
          </Alert>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout showSidebar={false}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 3,
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                เพิ่มผู้ใช้งานใหม่
              </Typography>
            </Box>
            
            <Button
              variant="outlined"
              startIcon={<BackIcon />}
              href="/users"
              sx={{ borderRadius: 2 }}
            >
              กลับ
            </Button>
          </Box>

        {/* Form */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 4 }}>
            <Box component="form" onSubmit={handleSubmit}>
              {/* Basic Information */}
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                ข้อมูลพื้นฐาน
              </Typography>

              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
                gap: 3, 
                mb: 4 
              }}>
                <TextField
                  fullWidth
                  label="Username *"
                  value={formData.username}
                  onChange={handleInputChange('username')}
                  error={!!errors.username}
                  helperText={errors.username}
                  placeholder="กรอก username สำหรับเข้าสู่ระบบ"
                  size="small"
                />

                <TextField
                  fullWidth
                  label="อีเมล"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  error={!!errors.email}
                  helperText={errors.email}
                  placeholder="กรอกอีเมล (ไม่บังคับ)"
                  size="small"
                />

                <TextField
                  fullWidth
                  label="ชื่อ"
                  value={formData.firstName}
                  onChange={handleInputChange('firstName')}
                  placeholder="กรอกชื่อ (ไม่บังคับ)"
                  size="small"
                />

                <TextField
                  fullWidth
                  label="นามสกุล"
                  value={formData.lastName}
                  onChange={handleInputChange('lastName')}
                  placeholder="กรอกนามสกุล (ไม่บังคับ)"
                  size="small"
                />
              </Box>

              {/* Security */}
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                ความปลอดภัย
              </Typography>

              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
                gap: 3, 
                mb: 4 
              }}>
                <TextField
                  fullWidth
                  label="รหัสผ่าน *"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  error={!!errors.password}
                  helperText={errors.password}
                  placeholder="กรอกรหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
                  size="small"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="ยืนยันรหัสผ่าน *"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange('confirmPassword')}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword}
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                  size="small"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {/* Role */}
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                สิทธิ์การใช้งาน
              </Typography>

              <Box sx={{ mb: 4 }}>
                <FormControl sx={{ minWidth: { xs: '100%', md: '50%' } }}>
                  <InputLabel>บทบาท *</InputLabel>
                  <Select
                    value={formData.role}
                    label="บทบาท *"
                    onChange={handleRoleChange}
                    size="small"
                  >
                    <MenuItem value="user">ผู้ใช้งานทั่วไป</MenuItem>
                    
                    <MenuItem value="admin">ผู้ดูแลระบบ</MenuItem>
                  </Select>
                </FormControl>
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
                  onClick={() => router.back()}
                  disabled={loading}
                  sx={{ px: 4 }}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  startIcon={<SaveIcon />}
                  sx={{ px: 4 }}
                >
                  {loading ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Layout>
  );
}
