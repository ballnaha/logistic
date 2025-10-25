'use client';
import React from 'react';
import { Chip, Box } from '@mui/material';

interface ColorChipProps {
  color: string;
  size?: 'small' | 'medium';
}

// ตัวเลือก-สี
const NO_COLOR_OPTION = { name: '-สี', value: '', hex: 'transparent', textColor: '#666666' };

// สีรถยอดนิยมในประเทศไทย (เหมือนกับใน ColorPicker)
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

const ColorChip: React.FC<ColorChipProps> = ({ color, size = 'small' }) => {
  if (!color) {
    // กรณี-สี - แสดงสัญลักษณ์ ✕
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: size === 'small' ? 16 : 20,
            height: size === 'small' ? 16 : 20,
            borderRadius: '50%',
            background: 'repeating-linear-gradient(45deg, #f5f5f5, #f5f5f5 2px, #e0e0e0 2px, #e0e0e0 4px)',
            border: '2px solid #e0e0e0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&::before': {
              content: '"✕"',
              color: '#666',
              fontSize: size === 'small' ? '0.6rem' : '0.75rem',
              fontWeight: 'bold'
            }
          }}
        />
        <Chip 
          label="-สี" 
          size={size}
          variant="outlined"
          sx={{
            color: '#666666',
            fontWeight: 500,
            '& .MuiChip-label': {
              px: 1.5
            }
          }}
        />
      </Box>
    );
  }

  // หาสีที่ตรงกับรายการที่กำหนด
  const colorInfo = ALL_COLOR_OPTIONS.find(
    c => c.value === color || c.name === color || c.value.toLowerCase() === color.toLowerCase()
  );

  if (colorInfo) {
    // กรณี-สี
    if (colorInfo.hex === 'transparent') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: size === 'small' ? 16 : 20,
              height: size === 'small' ? 16 : 20,
              borderRadius: '50%',
              background: 'repeating-linear-gradient(45deg, #f5f5f5, #f5f5f5 2px, #e0e0e0 2px, #e0e0e0 4px)',
              border: '2px solid #e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&::before': {
                content: '"✕"',
                color: '#666',
                fontSize: size === 'small' ? '0.6rem' : '0.75rem',
                fontWeight: 'bold'
              }
            }}
          />
          <Chip 
            label={colorInfo.name} 
            size={size}
            variant="outlined"
            sx={{
              color: colorInfo.textColor,
              fontWeight: 500,
              '& .MuiChip-label': {
                px: 1.5
              }
            }}
          />
        </Box>
      );
    }

    // กรณีมีสี
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: size === 'small' ? 16 : 20,
            height: size === 'small' ? 16 : 20,
            borderRadius: '50%',
            bgcolor: colorInfo.hex,
            border: '2px solid #e0e0e0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />

      </Box>
    );
  }

  // สำหรับสีที่ไม่อยู่ในรายการ
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        sx={{
          width: size === 'small' ? 16 : 20,
          height: size === 'small' ? 16 : 20,
          borderRadius: '50%',
          bgcolor: '#f5f5f5',
          border: '2px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '8px',
        }}
      >
        🎨
      </Box>
      <Chip 
        label={color} 
        size={size}
        variant="outlined"
        sx={{ fontWeight: 500 }}
      />
    </Box>
  );
};

export default ColorChip;
