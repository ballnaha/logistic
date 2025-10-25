'use client';
import dynamic from 'next/dynamic';
import { Box, CircularProgress } from '@mui/material';

const LoginPage = dynamic(() => import('../login/LoginPageComponent'), {
  ssr: false,
  loading: () => (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
      }}
    >
      <CircularProgress />
    </Box>
  ),
});

export default LoginPage;
