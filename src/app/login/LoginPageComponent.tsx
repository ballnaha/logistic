'use client';
import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
  Login as LoginIcon,
  PersonAdd as PersonAddIcon,
  Lock as LockIcon,
} from '@mui/icons-material';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!username || !password) {
      setError('กรุณากรอก Username และ Password');
      setLoading(false);
      return;
    }

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Username หรือ Password ไม่ถูกต้อง');
      } else if (result?.ok) {
        // เข้าสู่ระบบสำเร็จ
        const session = await getSession();
        console.log('Login successful:', session);
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        // Desktop: Split layout with image left, form right
        '@media (min-width: 768px)': {
          flexDirection: 'row',
        },
        // Mobile: Stack vertically
        '@media (max-width: 767px)': {
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          backgroundImage: `
            radial-gradient(circle at 25% 25%, ${alpha('#e3f2fd', 0.4)} 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, ${alpha('#f3e5f5', 0.4)} 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, ${alpha('#e8f5e8', 0.3)} 0%, transparent 50%)
          `,
        },
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
          // Only show overlay on mobile
          '@media (min-width: 768px)': {
            display: 'none',
          },
        },
      }}
    >
      {/* Left Section - Image (Desktop only) */}
      <Box
        sx={{
          // Desktop: Left half with image and unified background
          '@media (min-width: 768px)': {
            flex: '0 0 50%',
            backgroundColor: '#f8f9fa',
            background: `linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)`,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: 'url(/images/login_bg2.png)',
              backgroundPosition: 'center',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              opacity: 0.9,
              zIndex: 1,
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(135deg, ${alpha('#2196f3', 0.02)} 0%, ${alpha('#9c27b0', 0.02)} 100%)`,
              pointerEvents: 'none',
              zIndex: 2,
            },
          },
          // Mobile: Hide image section
          '@media (max-width: 767px)': {
            display: 'none',
          },
        }}
      />

      {/* Right Section - Login Form */}
      <Box
        sx={{
          // Desktop: Right half with form - unified background
          '@media (min-width: 768px)': {
            flex: '0 0 50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)`,
            padding: 4,
          },
          // Mobile: Full width
          '@media (max-width: 767px)': {
            width: '100%',
            maxWidth: 600,
            px: 3,
            position: 'relative',
            zIndex: 1,
            margin: '0 auto',
          },
        }}
      >
        <Box 
          sx={{ 
            width: '100%', 
            // Wider login box
            '@media (min-width: 768px)': {
              maxWidth: 480,
            },
            '@media (max-width: 767px)': {
              maxWidth: 500,
            },
          }}
        >
        {/* Login Form */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, sm: 6 },
            borderRadius: 3,
            // Desktop: Enhanced styling with better theme integration
            '@media (min-width: 768px)': {
              backgroundColor: '#ffffff',
              border: `1px solid ${alpha('#2196f3', 0.1)}`,
              boxShadow: `
                0 12px 40px ${alpha('#2196f3', 0.08)},
                0 4px 20px ${alpha('#000000', 0.06)},
                inset 0 1px 0 ${alpha('#ffffff', 0.8)}
              `,
              backdropFilter: 'blur(8px)',
            },
            // Mobile: Enhanced glassmorphism
            '@media (max-width: 767px)': {
              backgroundColor: alpha('#ffffff', 0.95),
              backdropFilter: 'blur(24px)',
              border: `1px solid ${alpha('#2196f3', 0.2)}`,
              boxShadow: `
                0 12px 40px ${alpha('#2196f3', 0.1)},
                0 4px 20px ${alpha('#000000', 0.08)},
                inset 0 1px 0 ${alpha('#ffffff', 0.7)}
              `,
            },
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 300, 
                color: '#1a1a1a',
                mb: 1,
                letterSpacing: '-0.02em'
              }}
            >
              Logistic Record
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: alpha('#000000', 0.6),
                fontWeight: 400,
                fontSize: '0.95rem'
              }}
            >
              เข้าสู่ระบบ
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              variant="outlined"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              label="Password"
              type="password"
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              autoComplete="current-password"
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
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                'เข้าสู่ระบบ'
              )}
            </Button>
          </form>

          <Divider 
            sx={{ 
              my: 4,
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

          <Box sx={{ textAlign: 'center' }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: alpha('#000000', 0.6),
                mb: 2.5,
                fontSize: '0.9rem'
              }}
            >
              ยังไม่มีบัญชีผู้ใช้?
            </Typography>
            <Button
              variant="text"
              onClick={() => router.push('/register')}
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
              สมัครสมาชิก
            </Button>
          </Box>
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
    </Box>
  );
}

export default LoginPage;
