'use client';
import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Avatar,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Paper,
} from '@mui/material';
import {
  PhotoCamera,
  Delete as DeleteIcon,
  CloudUpload,
} from '@mui/icons-material';

interface ImageUploadProps {
  type: 'car' | 'driver';
  value?: string;
  onChange: (url: string) => void;
  label: string;
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  type,
  value,
  onChange,
  label,
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ฟังก์ชันสำหรับจัดการ URL รูปภาพ
  const getImageUrl = (url: string) => {
    if (!url) return url;
    
    // หาก URL เป็น blob: (preview) ให้ใช้เลย
    if (url.startsWith('blob:')) {
      return url;
    }
    
    // หาก URL เป็น /uploads/... ในโหมด production ให้ใช้ API เลย
    if (url.startsWith('/uploads/')) {
      if (process.env.NODE_ENV === 'production') {
        return `/api/serve-image?path=${encodeURIComponent(url)}`;
      } else {
        return url;
      }
    }
    
    return url;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ตรวจสอบประเภทไฟล์
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('รองรับเฉพาะไฟล์ JPG, PNG และ WebP เท่านั้น');
      return;
    }

    // ตรวจสอบขนาดไฟล์ (สูงสุด 15MB)
    const maxSize = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSize) {
      setError('ขนาดไฟล์ต้องไม่เกิน 15MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        onChange(result.url);
      } else {
        setError(result.error || 'เกิดข้อผิดพลาดในการอัปโหลด');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('เกิดข้อผิดพลาดในการอัปโหลด');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onChange('');
    setError(null);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const getAvatarSize = () => {
    return type === 'car' ? { width: 120, height: 90 } : { width: 100, height: 100 };
  };

  const avatarSize = getAvatarSize();

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 500 }}>
        {label}
      </Typography>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled || uploading}
      />

      {/* Upload area */}
      <Paper
        elevation={1}
        sx={{
          p: 2,
          borderRadius: 2,
          border: '2px dashed #e0e0e0',
          textAlign: 'center',
          cursor: disabled || uploading ? 'default' : 'pointer',
          '&:hover': {
            borderColor: disabled || uploading ? '#e0e0e0' : 'primary.main',
            backgroundColor: disabled || uploading ? 'transparent' : 'rgba(25, 118, 210, 0.04)',
          },
          transition: 'all 0.2s ease',
        }}
        onClick={!disabled && !uploading ? handleUploadClick : undefined}
      >
        {value ? (
          <Box sx={{ position: 'relative', display: 'inline-block' }}>
            <Avatar
              src={getImageUrl(value)}
              sx={{
                ...avatarSize,
                mx: 'auto',
                mb: 1,
              }}
              variant={type === 'car' ? 'rounded' : 'circular'}
              onError={(e) => {
                console.error('❌ Image load error in ImageUpload:', value);
                // หาก fallback API ยังล้มเหลว ใน development mode ลอง static file
                if (value && value.includes('api/serve-image') && process.env.NODE_ENV === 'development') {
                  console.log('🔄 Fallback API failed, trying static file for:', value);
                  const urlParams = new URLSearchParams(value.split('?')[1]);
                  const originalPath = urlParams.get('path');
                  if (originalPath) {
                    const target = e.target as HTMLImageElement;
                    if (target) {
                      target.src = originalPath;
                    }
                  }
                }
              }}
              onLoad={() => {
                console.log('✅ Image loaded successfully in ImageUpload:', value);
              }}
            />
            {!disabled && (
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                sx={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  backgroundColor: 'error.main',
                  color: 'white',
                  width: 28,
                  height: 28,
                  '&:hover': {
                    backgroundColor: 'error.dark',
                  },
                }}
                size="small"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
            <Typography variant="caption" display="block" color="text.secondary">
              คลิกเพื่อเปลี่ยนรูปภาพ
            </Typography>
          </Box>
        ) : (
          <Box>
            {uploading ? (
              <Box sx={{ py: 2 }}>
                <CircularProgress size={40} sx={{ mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  กำลังอัปโหลด...
                </Typography>
              </Box>
            ) : (
              <Box sx={{ py: 2 }}>
                <CloudUpload sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  คลิกเพื่อเลือกรูปภาพ
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  รองรับ JPG, PNG, WebP (สูงสุด 15MB)
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}


    </Box>
  );
};

export default ImageUpload;
