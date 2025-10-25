'use client';
import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Chip,
} from '@mui/material';

interface StatisticItem {
  category: string;
  value: string;
  percentage: number;
  color: string;
  time?: string;
}

const RightPanel: React.FC = () => {
  const timeCategories: StatisticItem[] = [
    { category: 'On the Way', value: '39.7%', percentage: 39.7, color: '#4caf50', time: '3 hr 10 min' },
    { category: 'Unloading', value: '28.3%', percentage: 28.3, color: '#2196f3', time: '2 hr 15 min' },
    { category: 'Loading', value: '17.4%', percentage: 17.4, color: '#ff9800', time: '1 hr 23 min' },
    { category: 'Waiting', value: '14.6%', percentage: 14.6, color: '#f44336', time: '1 hr 10 min' },
  ];

  const weeklyStats = [
    { day: 'M', hours: 8.5, maxHours: 12, isSelected: false },
    { day: 'T', hours: 7.2, maxHours: 12, isSelected: false },
    { day: 'W', hours: 9.1, maxHours: 12, isSelected: false },
    { day: 'TH', hours: 6.8, maxHours: 12, isSelected: false },
    { day: 'F', hours: 8.9, maxHours: 12, isSelected: false },
    { day: 'S', hours: 10.2, maxHours: 12, isSelected: true },
    { day: 'Y', hours: 5.4, maxHours: 12, isSelected: false },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Driver Statistics Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1a1a1a' }}>
          Driver Statistics
        </Typography>
      </Box>

      {/* Average Time per Category */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle2" sx={{ 
          fontWeight: 600, 
          mb: 2, 
          fontSize: '0.75rem', 
          color: '#8b8b8b',
          textTransform: 'uppercase'
        }}>
          AVERAGE TIME PER DAY BY CATEGORY
        </Typography>
        
        {/* Days headers */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, px: 1 }}>
          {['W', 'TH', 'F', 'S'].map((day) => (
            <Typography key={day} variant="caption" sx={{ color: '#8b8b8b', fontSize: '0.75rem' }}>
              {day}
            </Typography>
          ))}
        </Box>

        {timeCategories.map((item, index) => (
          <Box key={index} sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem', color: '#1a1a1a' }}>
                {item.category}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a' }}>
                  {item.time}
                </Typography>
                <Typography variant="body2" sx={{ color: '#8b8b8b', fontSize: '0.875rem' }}>
                  {item.value}
                </Typography>
              </Box>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={item.percentage} 
              sx={{ 
                height: 8, 
                borderRadius: 4,
                backgroundColor: '#f0f0f0',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: item.color,
                  borderRadius: 4
                }
              }}
            />
          </Box>
        ))}
      </Box>

      {/* Working Time Per Day */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle2" sx={{ 
          fontWeight: 600, 
          mb: 3, 
          fontSize: '0.75rem', 
          color: '#8b8b8b',
          textTransform: 'uppercase'
        }}>
          WORKING TIME PER DAY
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'end', gap: 0.5, height: 120, mb: 2 }}>
          {weeklyStats.map((stat, index) => (
            <Box key={index} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ 
                width: '100%', 
                height: `${(stat.hours / stat.maxHours) * 100}px`,
                backgroundColor: stat.isSelected ? '#1a1a1a' : '#e0e0e0',
                borderRadius: '3px 3px 0 0',
                mb: 1,
                minHeight: '10px',
                maxHeight: '100px'
              }} />
              <Typography variant="caption" sx={{ 
                color: '#8b8b8b', 
                fontSize: '0.75rem',
                fontWeight: stat.isSelected ? 600 : 400
              }}>
                {stat.day}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Legend */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, backgroundColor: '#1a1a1a', borderRadius: '50%' }} />
            <Typography variant="caption" sx={{ color: '#8b8b8b', fontSize: '0.75rem' }}>
              Working Time
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: '#8b8b8b', fontSize: '0.75rem' }}>
            Average Working Time
          </Typography>
        </Box>

        {/* Time info */}
        <Box sx={{ 
          backgroundColor: '#1a1a1a', 
          borderRadius: 2, 
          p: 2, 
          color: 'white',
          mb: 2
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
              6 hr 32 min
            </Typography>
            <Typography variant="caption" sx={{ color: '#ccc', fontSize: '0.75rem' }}>
              8 hr 30 min
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            {['W', 'TH', 'F', 'S'].map((day) => (
              <Typography key={day} variant="caption" sx={{ color: '#ccc', fontSize: '0.75rem' }}>
                {day}
              </Typography>
            ))}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'end', gap: 0.5, height: 40 }}>
            {[40, 60, 80, 45, 70, 90, 35].map((height, index) => (
              <Box key={index} sx={{ 
                flex: 1, 
                height: `${height}%`, 
                backgroundColor: index === 5 ? '#fff' : '#555',
                borderRadius: '2px 2px 0 0'
              }} />
            ))}
          </Box>
          
          {/* Date indicator */}
          <Box sx={{ 
            position: 'absolute',
            bottom: -10,
            right: 10,
            backgroundColor: '#1a1a1a',
            color: 'white',
            px: 1,
            py: 0.5,
            borderRadius: 1,
            fontSize: '0.75rem'
          }}>
            <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
              3/12/22
            </Typography>
            <br />
            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#ccc' }}>
              Average
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default RightPanel;