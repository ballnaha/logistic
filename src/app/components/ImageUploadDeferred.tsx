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

interface ImageUploadDeferredProps {
  type: 'car' | 'driver';
  value?: string;
  onChange: (file: File | null, previewUrl?: string) => void;
  label: string;
  disabled?: boolean;
}

const ImageUploadDeferred: React.FC<ImageUploadDeferredProps> = ({
  type,
  value,
  onChange,
  label,
  disabled = false,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  
  // ฟังก์ชันสำหรับจัดการ URL รูปภาพ
  const getImageUrl = (url: string) => {
    // หาก URL เป็น blob: (preview) ให้ใช้เลย
    if (url.startsWith('blob:')) {
      return url;
    }
    
    // หาก URL เป็น /uploads/... ในโหมด production ให้ใช้ API เลย
    if (url.startsWith('/uploads/')) {
      // ตรวจสอบว่าเป็น production environment หรือไม่
      if (process.env.NODE_ENV === 'production') {
        // ใช้ fallback API โดยตรงใน production
        return `/api/serve-image?path=${encodeURIComponent(url)}`;
      } else {
        // ใน development ใช้ static file serving ปกติ
        return url;
      }
    }
    
    return url;
  };
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setError(null);
    
    // สร้าง preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // ส่งไฟล์และ preview URL กลับ
    onChange(file, url);
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setError(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
        {label}
      </Typography>
      
      <Paper
        elevation={1}
        sx={{
          p: 2,
          border: '2px dashed',
          borderColor: previewUrl ? 'primary.main' : 'grey.300',
          borderRadius: 2,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': disabled ? {} : {
            borderColor: 'primary.main',
            bgcolor: 'primary.50',
          },
          opacity: disabled ? 0.6 : 1,
        }}
        onClick={handleClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          style={{ display: 'none' }}
          disabled={disabled}
        />

        {previewUrl ? (
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={getImageUrl(previewUrl)}
              variant={type === 'car' ? 'rounded' : 'circular'}
              sx={{
                width: type === 'car' ? 120 : 80,
                height: type === 'car' ? 90 : 80,
                mx: 'auto',
                mb: 2,
                border: '2px solid',
                borderColor: 'grey.200',
              }}
              onError={(e) => {
                console.error('❌ Image load error:', previewUrl);
                console.error('Error event:', e);
                
                // หาก fallback API ยังล้มเหลว ใน development mode ลอง static file
                if (previewUrl && previewUrl.includes('api/serve-image') && process.env.NODE_ENV === 'development') {
                  console.log('🔄 Fallback API failed, trying static file for:', previewUrl);
                  // Extract original path from API URL
                  const urlParams = new URLSearchParams(previewUrl.split('?')[1]);
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
                console.log('✅ Image loaded successfully:', previewUrl);
              }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
              <Button
                size="small"
                startIcon={<PhotoCamera />}
                variant="outlined"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
                disabled={disabled}
              >
                เปลี่ยน
              </Button>
              
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                disabled={disabled}
                sx={{ 
                  '&:hover': { 
                    backgroundColor: 'rgba(211, 47, 47, 0.08)' 
                  } 
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CloudUpload 
              sx={{ 
                fontSize: 48, 
                color: 'grey.400',
                mb: 1
              }} 
            />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              คลิกเพื่อเลือกรูปภาพ
            </Typography>
            <Typography variant="caption" color="text.secondary">
              รองรับ JPG, PNG, WebP (สูงสุด 15MB)
            </Typography>
          </Box>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

// ฟังก์ชันสำหรับอัปโหลดไฟล์
export const uploadImageFile = async (file: File, type: 'car' | 'driver'): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'เกิดข้อผิดพลาดในการอัปโหลด');
  }

  const result = await response.json();
  return result.url;
};

export default ImageUploadDeferred;
