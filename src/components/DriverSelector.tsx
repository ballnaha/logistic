'use client';
import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Box,
  Typography,
  CircularProgress,
  Chip,
  FormHelperText,
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';

interface DriverOption {
  id: number;
  driverName: string;
  driverLicense: string;
  driverImage?: string;
  isActive: boolean;
}

interface DriverSelectorProps {
  value?: number | string;
  onChange: (driverId: number | null, driver?: DriverOption) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  placeholder?: string;
  showImage?: boolean;
  showLicense?: boolean;
  activeOnly?: boolean;
}

// ฟังก์ชันสำหรับจัดการ URL รูปภาพ
const getImageUrl = (url: string) => {
  if (!url) return url;
  
  if (url.startsWith('blob:')) {
    return url;
  }
  
  if (url.startsWith('/uploads/')) {
    if (process.env.NODE_ENV === 'production') {
      return `/api/serve-image?path=${encodeURIComponent(url)}`;
    } else {
      return url;
    }
  }
  
  return url;
};

const DriverSelector: React.FC<DriverSelectorProps> = ({
  value = '',
  onChange,
  label = 'เลือกคนขับ',
  required = false,
  disabled = false,
  error,
  helperText,
  size = 'medium',
  fullWidth = true,
  placeholder = 'เลือกคนขับ...',
  showImage = true,
  showLicense = true,
  activeOnly = true,
}) => {
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string>('');

  // โหลดรายการคนขับ
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        setLoading(true);
        setFetchError('');
        
        const queryParams = new URLSearchParams({
          activeOnly: activeOnly.toString(),
        });

        const response = await fetch(`/api/drivers/options?${queryParams}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch drivers');
        }

        const data = await response.json();
        setDrivers(data.drivers || []);
      } catch (error) {
        console.error('Error fetching drivers:', error);
        setFetchError('เกิดข้อผิดพลาดในการโหลดรายการคนขับ');
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
  }, [activeOnly]);

  const handleChange = (event: any) => {
    const selectedId = event.target.value;
    
    if (selectedId === '') {
      onChange(null);
      return;
    }

    const selectedDriver = drivers.find(driver => driver.id === selectedId);
    onChange(selectedId, selectedDriver);
  };

  const selectedDriver = drivers.find(driver => driver.id === value);

  return (
    <FormControl 
      fullWidth={fullWidth} 
      size={size} 
      error={!!error}
      disabled={disabled}
    >
      <InputLabel required={required}>
        {label}
      </InputLabel>
      
      <Select
        value={value || ''}
        label={label}
        onChange={handleChange}
        disabled={disabled || loading}
        displayEmpty
        renderValue={(selected) => {
          if (!selected || selected === '') {
            return (
              <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                {loading ? 'กำลังโหลด...' : placeholder}
              </Typography>
            );
          }

          if (selectedDriver) {
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {showImage && (
                  <Avatar
                    src={selectedDriver.driverImage ? getImageUrl(selectedDriver.driverImage) : undefined}
                    sx={{ width: 24, height: 24 }}
                  >
                    <PersonIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                )}
                <Box>
                  <Typography variant="body2" component="span">
                    {selectedDriver.driverName}
                  </Typography>
                  {showLicense && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      {selectedDriver.driverLicense}
                    </Typography>
                  )}
                </Box>
                {!selectedDriver.isActive && (
                  <Chip 
                    label="ไม่ใช้งาน" 
                    size="small" 
                    color="default" 
                    sx={{ ml: 1 }}
                  />
                )}
              </Box>
            );
          }

          return selected;
        }}
      >
        {/* Loading state */}
        {loading && (
          <MenuItem disabled>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} />
              <Typography>กำลังโหลดรายการคนขับ...</Typography>
            </Box>
          </MenuItem>
        )}

        {/* Error state */}
        {fetchError && (
          <MenuItem disabled>
            <Typography color="error">{fetchError}</Typography>
          </MenuItem>
        )}

        {/* Empty state */}
        {!loading && !fetchError && drivers.length === 0 && (
          <MenuItem disabled>
            <Typography color="text.secondary">ไม่พบรายการคนขับ</Typography>
          </MenuItem>
        )}

        {/* Empty option */}
        {!loading && !fetchError && drivers.length > 0 && (
          <MenuItem value="">
            <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
              {placeholder}
            </Typography>
          </MenuItem>
        )}

        {/* Driver options */}
        {!loading && !fetchError && drivers.map((driver) => (
          <MenuItem key={driver.id} value={driver.id}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              {showImage && (
                <Avatar
                  src={driver.driverImage ? getImageUrl(driver.driverImage) : undefined}
                  sx={{ width: 32, height: 32 }}
                >
                  <PersonIcon />
                </Avatar>
              )}
              
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" component="div">
                  {driver.driverName}
                </Typography>
                {showLicense && (
                  <Typography variant="caption" color="text.secondary">
                    ใบขับขี่: {driver.driverLicense}
                  </Typography>
                )}
              </Box>

              {!driver.isActive && (
                <Chip 
                  label="ไม่ใช้งาน" 
                  size="small" 
                  color="default" 
                />
              )}
            </Box>
          </MenuItem>
        ))}
      </Select>

      {(error || helperText) && (
        <FormHelperText>
          {error || helperText}
        </FormHelperText>
      )}
    </FormControl>
  );
};

export default DriverSelector;