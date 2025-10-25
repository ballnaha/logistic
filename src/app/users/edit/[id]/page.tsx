'use client';
import React, { useState, useEffect, use } from 'react';
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
  CircularProgress,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Save as SaveIcon,
  Visibility,
  VisibilityOff,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import Layout from '../../../components/Layout';
import { useSnackbar } from '../../../../contexts/SnackbarContext';

interface UserFormData {
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
}

interface UserEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditUserPage({ params }: UserEditPageProps) {
  const resolvedParams = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    isActive: true,
  });

  const [errors, setErrors] = useState<Partial<UserFormData>>({});
  const [originalData, setOriginalData] = useState<UserFormData | null>(null);

  // Check if user is admin or editing own profile
  const isAdmin = session?.user?.role === 'admin';
  const isOwnProfile = parseInt(session?.user?.id || '0') === parseInt(resolvedParams.id);
  const canEdit = isAdmin || isOwnProfile;

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/users/${resolvedParams.id}`);
      const result = await response.json();

      if (response.ok) {
        const userData = {
          username: result.data.username,
          password: '',
          confirmPassword: '',
          email: result.data.email || '',
          firstName: result.data.firstName || '',
          lastName: result.data.lastName || '',
          role: result.data.role,
          isActive: result.data.isActive,
        };
        setFormData(userData);
        setOriginalData(userData);
      } else {
        showSnackbar(result.error || 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้', 'error');
        router.push('/users');
      }
    } catch (error) {
      showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูล', 'error');
      router.push('/users');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Partial<UserFormData> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'กรุณากรอก Username';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username ต้องมีอย่างน้อย 3 ตัวอักษร';
    }

    if (formData.password) {
      if (formData.password.length < 6) {
        newErrors.password = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'กรุณายืนยันรหัสผ่าน';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'รหัสผ่านไม่ตรงกัน';
      }
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

  const handleActiveChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, isActive: event.target.checked }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {
        username: formData.username.trim(),
        email: formData.email.trim() || null,
        firstName: formData.firstName.trim() || null,
        lastName: formData.lastName.trim() || null,
      };

      // Only include password if changed
      if (formData.password) {
        updateData.password = formData.password;
      }

      // Only admin can change role and isActive
      if (isAdmin) {
        updateData.role = formData.role;
        updateData.isActive = formData.isActive;
      }

      const response = await fetch(`/api/users/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (response.ok) {
        showSnackbar('อัปเดตข้อมูลผู้ใช้งานสำเร็จ', 'success');
        if (isAdmin && !isOwnProfile) {
          router.push('/users');
        } else {
          // Refresh the data
          fetchUser();
        }
      } else {
        showSnackbar(result.error || 'ไม่สามารถอัปเดตข้อมูลผู้ใช้งานได้', 'error');
      }
    } catch (error) {
      showSnackbar('เกิดข้อผิดพลาดในการอัปเดตข้อมูล', 'error');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!canEdit) {
      router.push('/users');
      return;
    }
    fetchUser();
  }, [canEdit, router]);

  if (!canEdit) {
    return (
      <Layout showSidebar={false}>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            ไม่มีสิทธิ์เข้าถึงหน้านี้
          </Alert>
        </Box>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout showSidebar={false}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress />
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
              {isOwnProfile ? 'แก้ไขโปรไฟล์' : `แก้ไขผู้ใช้งาน: ${originalData?.username}`}
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
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                ความปลอดภัย
              </Typography>
              <Alert severity="info" sx={{ mb: 3 }}>
                หากไม่ต้องการเปลี่ยนรหัสผ่าน ให้เว้นช่องนี้ว่างไว้
              </Alert>

              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
                gap: 3, 
                mb: 4 
              }}>
                <TextField
                  fullWidth
                  label="รหัสผ่านใหม่"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  error={!!errors.password}
                  helperText={errors.password}
                  placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
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
                  label="ยืนยันรหัสผ่านใหม่"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange('confirmPassword')}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword}
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                  disabled={!formData.password}
                  size="small"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                          disabled={!formData.password}
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {/* Role and Status - Only for admin */}
              {isAdmin && (
                <>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                    สิทธิ์การใช้งาน
                  </Typography>

                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
                    gap: 3, 
                    mb: 4,
                    alignItems: 'start'
                  }}>
                    <FormControl fullWidth>
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

                    <Box sx={{ pt: 1 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.isActive}
                            onChange={handleActiveChange}
                            color="primary"
                            size="small"
                          />
                        }
                        label="เปิดใช้งาน"
                      />
                    </Box>
                  </Box>
                </>
              )}

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
                  disabled={saving}
                  sx={{ px: 4 }}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={saving}
                  startIcon={<SaveIcon />}
                  sx={{ px: 4 }}
                >
                  {saving ? 'กำลังบันทึก...' : 'อัปเดต'}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Layout>
  );
}
