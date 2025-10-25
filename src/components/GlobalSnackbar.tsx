'use client';
import React, { useEffect } from 'react';
import { Snackbar, Alert, Box, Typography } from '@mui/material';
import { 
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useSnackbar, SnackbarType } from '../contexts/SnackbarContext';

const getSnackbarConfig = (type: SnackbarType) => {
  const configs = {
    success: {
      icon: <CheckCircleIcon sx={{ fontSize: '1.5rem' }} />,
      title: 'SUCCESS',
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.08)',
      iconColor: '#22c55e',
      titleColor: '#15803d',
      messageColor: '#166534'
    },
    info: {
      icon: <InfoIcon sx={{ fontSize: '1.5rem' }} />,
      title: 'INFO',
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
      iconColor: '#3b82f6',
      titleColor: '#1d4ed8',
      messageColor: '#1e40af'
    },
    warning: {
      icon: <WarningIcon sx={{ fontSize: '1.5rem' }} />,
      title: 'WARNING',
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.08)',
      iconColor: '#f59e0b',
      titleColor: '#d97706',
      messageColor: '#b45309'
    },
    error: {
      icon: <ErrorIcon sx={{ fontSize: '1.5rem' }} />,
      title: 'ERROR',
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
      iconColor: '#ef4444',
      titleColor: '#dc2626',
      messageColor: '#b91c1c'
    }
  };
  return configs[type];
};

export const GlobalSnackbar: React.FC = () => {
  const { snackbarState, hideSnackbar } = useSnackbar();
  const { open, message, type, duration } = snackbarState;

  const config = getSnackbarConfig(type);

  useEffect(() => {
    if (open && duration) {
      const timer = setTimeout(() => {
        hideSnackbar();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [open, duration, hideSnackbar]);

  return (
    <Snackbar
      open={open}
      onClose={hideSnackbar}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{ 
        mt: 8,
        '& .MuiSnackbar-root': {
          position: 'relative'
        }
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          minWidth: 420,
          maxWidth: 600,
          backgroundColor: config.backgroundColor,
          borderRadius: 2,
          border: `1px solid ${config.borderColor}20`,
          borderLeftWidth: 4,
          borderLeftColor: config.borderColor,
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
          padding: '16px 20px',
          position: 'relative',
          backdropFilter: 'blur(8px)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 2,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
            pointerEvents: 'none'
          }
        }}
      >
        {/* Icon */}
        <Box
          sx={{
            color: config.iconColor,
            mr: 2,
            mt: 0.25,
            flexShrink: 0
          }}
        >
          {config.icon}
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{
              color: config.titleColor,
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.5px',
              mb: 0.5,
              textTransform: 'uppercase'
            }}
          >
            {config.title}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: config.messageColor,
              fontSize: '0.875rem',
              lineHeight: 1.4,
              fontWeight: 500
            }}
          >
            {message}
          </Typography>
        </Box>

        {/* Close Button */}
        <Box
          onClick={hideSnackbar}
          sx={{
            color: config.iconColor,
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '50%',
            ml: 1,
            mt: -0.5,
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.08)'
            },
            transition: 'background-color 0.2s ease'
          }}
        >
          <CloseIcon sx={{ fontSize: '1.25rem' }} />
        </Box>
      </Box>
    </Snackbar>
  );
};
