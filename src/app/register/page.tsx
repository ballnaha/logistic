'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  alpha,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  ArrowBack as ArrowBackIcon,
  AccountCircle as AccountCircleIcon,
} from '@mui/icons-material';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    firstName: '',
    lastName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (!formData.username || !formData.password) {
      setError('กรุณากรอก Username และ Password');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Password และ Confirm Password ไม่ตรงกัน');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('สมัครสมาชิกสำเร็จ! บัญชีของคุณยังไม่เปิดใช้งาน กรุณารอผู้ดูแลระบบเปิดใช้งาน จากนั้นจึงเข้าสู่ระบบ. กำลังเปลี่ยนไปหน้า Login...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(result.error || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการสมัครสมาชิก');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        backgroundImage: `
          radial-gradient(circle at 25% 25%, ${alpha('#e3f2fd', 0.4)} 0%, transparent 50%),
          radial-gradient(circle at 75% 75%, ${alpha('#f3e5f5', 0.4)} 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, ${alpha('#e8f5e8', 0.3)} 0%, transparent 50%)
        `,
        position: 'relative',
        py: 4,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            linear-gradient(45deg, transparent 30%, ${alpha('#2196f3', 0.05)} 50%, transparent 70%),
            linear-gradient(-45deg, transparent 30%, ${alpha('#9c27b0', 0.05)} 50%, transparent 70%)
          `,
          pointerEvents: 'none',
        },
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 620, px: 3, position: 'relative', zIndex: 1 }}>
        {/* Register Form */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 4,
            backgroundColor: alpha('#ffffff', 0.9),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha('#ffffff', 0.3)}`,
            boxShadow: `
              0 8px 32px ${alpha('#000000', 0.1)},
              0 2px 16px ${alpha('#000000', 0.08)},
              inset 0 1px 0 ${alpha('#ffffff', 0.6)}
            `,
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                margin: '0 auto 16px',
                borderRadius: '20px',
                background: `linear-gradient(135deg, ${alpha('#2196f3', 0.1)} 0%, ${alpha('#9c27b0', 0.1)} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${alpha('#2196f3', 0.2)}`,
              }}
            >
              <AccountCircleIcon sx={{ fontSize: 28, color: '#2196f3' }} />
            </Box>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 300, 
                color: '#1a1a1a',
                mb: 1,
                letterSpacing: '-0.02em'
              }}
            >
              Create Account
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: alpha('#000000', 0.6),
                fontWeight: 400,
                fontSize: '0.95rem'
              }}
            >
              สร้างบัญชีผู้ใช้สำหรับระบบ Logistic
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' }, mb: 2.5 }}>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label="ชื่อ"
                  name="firstName"
                  variant="outlined"
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={loading}
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: alpha('#ffffff', 0.8),
                      backdropFilter: 'blur(8px)',
                      '& fieldset': {
                        borderColor: alpha('#000000', 0.1),
                        borderWidth: '1px',
                      },
                      '&:hover fieldset': {
                        borderColor: alpha('#2196f3', 0.3),
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#2196f3',
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: alpha('#000000', 0.7),
                      '&.Mui-focused': {
                        color: '#2196f3',
                      },
                    },
                  }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label="นามสกุล"
                  name="lastName"
                  variant="outlined"
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={loading}
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: alpha('#ffffff', 0.8),
                      backdropFilter: 'blur(8px)',
                      '& fieldset': {
                        borderColor: alpha('#000000', 0.1),
                        borderWidth: '1px',
                      },
                      '&:hover fieldset': {
                        borderColor: alpha('#2196f3', 0.3),
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#2196f3',
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: alpha('#000000', 0.7),
                      '&.Mui-focused': {
                        color: '#2196f3',
                      },
                    },
                  }}
                />
              </Box>
            </Box>

            <TextField
              fullWidth
              label="Username *"
              name="username"
              variant="outlined"
              value={formData.username}
              onChange={handleChange}
              sx={{ 
                mb: 2.5,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: alpha('#ffffff', 0.8),
                  backdropFilter: 'blur(8px)',
                  '& fieldset': {
                    borderColor: alpha('#000000', 0.1),
                    borderWidth: '1px',
                  },
                  '&:hover fieldset': {
                    borderColor: alpha('#2196f3', 0.3),
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#2196f3',
                    borderWidth: '2px',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: alpha('#000000', 0.7),
                  '&.Mui-focused': {
                    color: '#2196f3',
                  },
                },
              }}
              disabled={loading}
              autoComplete="username"
            />

            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              variant="outlined"
              value={formData.email}
              onChange={handleChange}
              sx={{ 
                mb: 2.5,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: alpha('#ffffff', 0.8),
                  backdropFilter: 'blur(8px)',
                  '& fieldset': {
                    borderColor: alpha('#000000', 0.1),
                    borderWidth: '1px',
                  },
                  '&:hover fieldset': {
                    borderColor: alpha('#2196f3', 0.3),
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#2196f3',
                    borderWidth: '2px',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: alpha('#000000', 0.7),
                  '&.Mui-focused': {
                    color: '#2196f3',
                  },
                },
              }}
              disabled={loading}
              autoComplete="email"
            />

            <TextField
              fullWidth
              label="Password *"
              name="password"
              type="password"
              variant="outlined"
              value={formData.password}
              onChange={handleChange}
              sx={{ 
                mb: 2.5,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: alpha('#ffffff', 0.8),
                  backdropFilter: 'blur(8px)',
                  '& fieldset': {
                    borderColor: alpha('#000000', 0.1),
                    borderWidth: '1px',
                  },
                  '&:hover fieldset': {
                    borderColor: alpha('#2196f3', 0.3),
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#2196f3',
                    borderWidth: '2px',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: alpha('#000000', 0.7),
                  '&.Mui-focused': {
                    color: '#2196f3',
                  },
                },
                '& .MuiFormHelperText-root': {
                  color: alpha('#000000', 0.5),
                },
              }}
              disabled={loading}
              autoComplete="new-password"
              helperText="ความยาวอย่างน้อย 6 ตัวอักษร"
            />

            <TextField
              fullWidth
              label="Confirm Password *"
              name="confirmPassword"
              type="password"
              variant="outlined"
              value={formData.confirmPassword}
              onChange={handleChange}
              sx={{ 
                mb: 3.5,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: alpha('#ffffff', 0.8),
                  backdropFilter: 'blur(8px)',
                  '& fieldset': {
                    borderColor: alpha('#000000', 0.1),
                    borderWidth: '1px',
                  },
                  '&:hover fieldset': {
                    borderColor: alpha('#2196f3', 0.3),
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#2196f3',
                    borderWidth: '2px',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: alpha('#000000', 0.7),
                  '&.Mui-focused': {
                    color: '#2196f3',
                  },
                },
              }}
              disabled={loading}
              autoComplete="new-password"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                py: 1.8,
                fontSize: '1rem',
                fontWeight: 500,
                borderRadius: 2,
                textTransform: 'none',
                background: `linear-gradient(135deg, #2196f3 0%, #1976d2 100%)`,
                border: `1px solid ${alpha('#2196f3', 0.3)}`,
                boxShadow: `
                  0 4px 16px ${alpha('#2196f3', 0.2)},
                  0 2px 8px ${alpha('#2196f3', 0.1)},
                  inset 0 1px 0 ${alpha('#ffffff', 0.3)}
                `,
                backdropFilter: 'blur(8px)',
                mb: 2.5,
                '&:hover': {
                  background: `linear-gradient(135deg, #1976d2 0%, #1565c0 100%)`,
                  boxShadow: `
                    0 6px 20px ${alpha('#2196f3', 0.25)},
                    0 3px 12px ${alpha('#2196f3', 0.15)},
                    inset 0 1px 0 ${alpha('#ffffff', 0.3)}
                  `,
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  background: alpha('#000000', 0.1),
                  color: alpha('#000000', 0.4),
                },
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {loading ? (
                <>
                  <CircularProgress size={18} sx={{ mr: 1, color: 'currentColor' }} />
                  กำลังสมัครสมาชิก...
                </>
              ) : (
                'สมัครสมาชิก'
              )}
            </Button>

            <Divider 
              sx={{ 
                my: 3,
                borderColor: alpha('#000000', 0.08),
                '&::before, &::after': {
                  borderColor: alpha('#000000', 0.08),
                }
              }}
            >
              <Typography 
                variant="body2" 
                sx={{ 
                  color: alpha('#000000', 0.4),
                  fontSize: '0.85rem',
                  fontWeight: 400
                }}
              >
                หรือ
              </Typography>
            </Divider>

            <Button
              fullWidth    
              variant="text"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/login')}
              
              sx={{
                p: 0,
                minWidth: 'auto',
                color: '#2196f3',
                fontWeight: 500,
                textTransform: 'none',
                
                '&:hover': {
                  backgroundColor: 'transparent',
                  textDecoration: 'underline',
                },
              }}
            >
              กลับไปหน้า Login
            </Button>
          </form>
        </Paper>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              color: alpha('#000000', 0.4),
              fontSize: '0.85rem',
              fontWeight: 400
            }}
          >
            © 2025 Poonsub Can Logistic Record
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
