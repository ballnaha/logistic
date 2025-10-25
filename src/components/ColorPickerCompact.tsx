'use client';
import React, { useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';

interface ColorPickerCompactProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  required?: boolean;
  size?: 'small' | 'medium';
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

const ColorPickerCompact: React.FC<ColorPickerCompactProps> = ({ 
  label, 
  value, 
  onChange, 
  required = false,
  size = 'small'
}) => {
  const getSelectedColorInfo = () => {
    return ALL_COLOR_OPTIONS.find(
      color => color.value === value || color.name === value
    );
  };

  const selectedColorInfo = getSelectedColorInfo();

  const handleChange = (event: any) => {
    onChange(event.target.value);
  };

  const renderColorChip = (colorInfo: typeof ALL_COLOR_OPTIONS[0]) => {
    if (colorInfo.hex === 'transparent') {
      return (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          width: '100%'
        }}>
          <Box sx={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: '2px solid #e0e0e0',
            background: 'linear-gradient(45deg, transparent 40%, #e0e0e0 40%, #e0e0e0 60%, transparent 60%)',
            position: 'relative',
            flexShrink: 0,
            '&::after': {
              content: '"✕"',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '10px',
              color: '#666',
              fontWeight: 'bold'
            }
          }} />
          <span>{colorInfo.name}</span>
        </Box>
      );
    }

    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        width: '100%'
      }}>
        <Box sx={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          bgcolor: colorInfo.hex,
          border: '1px solid #e0e0e0',
          flexShrink: 0
        }} />
        <span>{colorInfo.name}</span>
      </Box>
    );
  };

  return (
    <FormControl fullWidth size={size} required={required}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        onChange={handleChange}
        label={label}
        renderValue={(selected) => {
          const colorInfo = ALL_COLOR_OPTIONS.find(c => c.value === selected);
          if (!colorInfo) return selected;
          return renderColorChip(colorInfo);
        }}
      >
        {ALL_COLOR_OPTIONS.map((color) => (
          <MenuItem key={color.value} value={color.value}>
            {renderColorChip(color)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default ColorPickerCompact;
