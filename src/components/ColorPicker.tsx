'use client';
import React, { useState } from 'react';
import {
  Box,
  TextField,
  Typography,
  Chip,
} from '@mui/material';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  required?: boolean;
}

// ตัวเลือก-สี
const NO_COLOR_OPTION = { name: '-สี', value: '', hex: 'transparent', textColor: '#666666' };

// สีรถยอดนิยมในประเทศไทย
const POPULAR_CAR_COLORS = [
  { name: 'ขาว', value: 'White', hex: '#FFFFFF', textColor: '#000000' },
  { name: 'ดำ', value: 'Black', hex: '#000000', textColor: '#FFFFFF' },
  { name: 'เงิน', value: 'Silver', hex: '#C0C0C0', textColor: '#000000' },
  { name: 'เทา', value: 'Gray', hex: '#808080', textColor: '#FFFFFF' },
  { name: 'แดง', value: 'Red', hex: '#DC143C', textColor: '#FFFFFF' },
  { name: 'น้ำเงิน', value: 'Blue', hex: '#0066CC', textColor: '#FFFFFF' },
  { name: 'เขียว', value: 'Green', hex: '#228B22', textColor: '#FFFFFF' },
  { name: 'เหลือง', value: 'Yellow', hex: '#FFD700', textColor: '#000000' },
  { name: 'ส้ม', value: 'Orange', hex: '#FF8C00', textColor: '#FFFFFF' },
  { name: 'น้ำตาล', value: 'Brown', hex: '#8B4513', textColor: '#FFFFFF' },
  { name: 'ม่วง', value: 'Purple', hex: '#800080', textColor: '#FFFFFF' },
  { name: 'ทอง', value: 'Gold', hex: '#FFD700', textColor: '#000000' },
  { name: 'ครีม', value: 'Cream', hex: '#F5F5DC', textColor: '#000000' },
  { name: 'ชมพู', value: 'Pink', hex: '#FF69B4', textColor: '#FFFFFF' },
  { name: 'น้ำเงินเข้ม', value: 'Navy Blue', hex: '#000080', textColor: '#FFFFFF' },
  { name: 'เทาเข้ม', value: 'Dark Gray', hex: '#2F2F2F', textColor: '#FFFFFF' },
];

// รวมตัวเลือกทั้งหมด
const ALL_COLOR_OPTIONS = [NO_COLOR_OPTION, ...POPULAR_CAR_COLORS];

const ColorPicker: React.FC<ColorPickerProps> = ({ 
  label, 
  value, 
  onChange, 
  required = false 
}) => {
  const [customColor, setCustomColor] = useState(value || '');

  const handleColorSelect = (color: string) => {
    setCustomColor(color);
    onChange(color);
  };

  const handleCustomColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = event.target.value;
    setCustomColor(newColor);
    onChange(newColor);
  };

  const getSelectedColorInfo = () => {
    const predefinedColor = ALL_COLOR_OPTIONS.find(
      color => color.value === value || color.name === value
    );
    return predefinedColor;
  };

  const selectedColorInfo = getSelectedColorInfo();

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
        {label} {required && <span style={{ color: '#d32f2f' }}>*</span>}
      </Typography>
      
      {/* Selected Color Display */}
      {selectedColorInfo && (
        <Box sx={{ mb: 2 }}>
          <Chip
            label={selectedColorInfo.name}
            variant={selectedColorInfo.hex === 'transparent' ? 'outlined' : 'filled'}
            sx={{
              bgcolor: selectedColorInfo.hex === 'transparent' ? 'transparent' : selectedColorInfo.hex,
              color: selectedColorInfo.textColor,
              fontWeight: 500,
              height: 32,
              fontSize: '0.875rem',
              border: selectedColorInfo.hex === 'transparent' 
                ? '2px solid #e0e0e0' 
                : `2px solid ${selectedColorInfo.hex}`,
              '& .MuiChip-label': { px: 2 }
            }}
          />
        </Box>
      )}

      {/* Minimal Color Grid - Full Width */}
      <Box 
        sx={{ 
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          mb: 2,
          justifyContent: 'flex-start'
        }}
      >
        {ALL_COLOR_OPTIONS.map((color) => (
          <Box
            key={color.value || 'no-color'}
            onClick={() => handleColorSelect(color.value)}
            sx={{
              cursor: 'pointer',
              width: { xs: 24, sm: 28, md: 32 },
              height: { xs: 24, sm: 28, md: 32 },
              borderRadius: '50%',
              bgcolor: color.hex === 'transparent' ? '#f5f5f5' : color.hex,
              border: value === color.value ? '3px solid #1976d2' : '2px solid #e0e0e0',
              transition: 'all 0.2s ease',
              position: 'relative',
              // สำหรับตัวเลือก-สี
              ...(color.hex === 'transparent' && {
                background: 'repeating-linear-gradient(45deg, #f5f5f5, #f5f5f5 2px, #e0e0e0 2px, #e0e0e0 4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '&::before': {
                  content: '"✕"',
                  color: '#666',
                  fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
                  fontWeight: 'bold'
                }
              }),
              '&:hover': {
                transform: 'scale(1.1)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 2
              },
              '&::after': (value === color.value && color.hex !== 'transparent') ? {
                content: '"✓"',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: color.textColor,
                fontWeight: 'bold',
                fontSize: '1rem',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
              } : {}
            }}
            title={color.name}
          />
        ))}
      </Box>

      {/* Custom Color Input - Compact */}
      <TextField
        fullWidth
        variant="outlined"
        placeholder="หรือกรอกสีอื่นๆ เช่น เงินเมทัลลิค, ขาวมุก"
        value={customColor}
        onChange={handleCustomColorChange}
        size="small"
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 1,
            fontSize: '0.875rem'
          }
        }}
      />
    </Box>
  );
};

export default ColorPicker;
