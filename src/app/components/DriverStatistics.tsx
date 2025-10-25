'use client';
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  Schedule,
  LocalShipping,
  Warning,
} from '@mui/icons-material';

interface StatisticItem {
  category: string;
  value: string;
  percentage: number;
  color: string;
  time?: string;
}

const DriverStatistics: React.FC = () => {
  const timeCategories: StatisticItem[] = [
    { category: 'On the Way', value: '39.7%', percentage: 39.7, color: '#4caf50', time: '3 hr 10 min' },
    { category: 'Unloading', value: '28.3%', percentage: 28.3, color: '#2196f3', time: '2 hr 15 min' },
    { category: 'Loading', value: '17.4%', percentage: 17.4, color: '#ff9800', time: '1 hr 23 min' },
    { category: 'Waiting', value: '14.6%', percentage: 14.6, color: '#9e9e9e', time: '1 hr 10 min' },
  ];

  const weeklyStats = [
    { day: 'W', hours: 8.5, maxHours: 12 },
    { day: 'M', hours: 7.2, maxHours: 12 },
    { day: 'GM', hours: 9.1, maxHours: 12 },
    { day: 'Y', hours: 11.8, maxHours: 12 },
  ];

  return (
    <Box sx={{ 
      backgroundColor: 'white',
      borderRadius: 2,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      overflow: 'hidden',
      height: 'fit-content'
    }}>
      {/* Header */}
      <Box sx={{ p: 3, borderBottom: '1px solid #e9ecef' }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
          Driver Statistics
        </Typography>
      </Box>

      <Box sx={{ p: 3 }}>
        {/* Average Time per Category */}
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 3, color: '#8b8b8b', fontSize: '0.75rem' }}>
          AVERAGE TIME PER DAY BY CATEGORY
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="caption" sx={{ color: '#8b8b8b' }}>W</Typography>
          <Typography variant="caption" sx={{ color: '#8b8b8b' }}>M</Typography>
          <Typography variant="caption" sx={{ color: '#8b8b8b' }}>GM</Typography>
          <Typography variant="caption" sx={{ color: '#8b8b8b' }}>Y</Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          {timeCategories.map((item, index) => (
            <Box key={index} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                  {item.category}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
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
                  height: 6, 
                  borderRadius: 3,
                  backgroundColor: '#f5f5f5',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: item.color,
                    borderRadius: 3
                  }
                }}
              />
            </Box>
          ))}
        </Box>

        {/* Working Time Info Box */}
        <Box sx={{
          backgroundColor: '#f8f9fa',
          borderRadius: 2,
          p: 2.5,
          border: '1px solid #e9ecef',
          mb: 4
        }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#8b8b8b', fontSize: '0.75rem' }}>
            WORKING TIME PER DAY
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
              6 hr 32 min
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: '#8b8b8b', fontSize: '0.75rem' }}>
              Average
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#1a1a1a', fontSize: '0.75rem' }}>
              8 hr 30 min
            </Typography>
          </Box>
        </Box>

        {/* Weekly Working Time Chart */}
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#8b8b8b', fontSize: '0.75rem' }}>
          WORKING TIME PER DAY
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'end', gap: 2, height: 100, mb: 2 }}>
          {weeklyStats.map((stat, index) => (
            <Box key={index} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ 
                width: '100%', 
                height: `${(stat.hours / stat.maxHours) * 80}px`,
                backgroundColor: index === 3 ? '#4caf50' : '#e0e0e0',
                borderRadius: '3px 3px 0 0',
                mb: 1,
                minHeight: '20px'
              }} />
              <Typography variant="caption" sx={{ color: '#8b8b8b', fontSize: '0.75rem' }}>
                {stat.day}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="caption" sx={{ color: '#8b8b8b', fontSize: '0.75rem' }}>
            ● Working Time
          </Typography>
          <Typography variant="caption" sx={{ color: '#8b8b8b', fontSize: '0.75rem' }}>
            Average Working Time
          </Typography>
        </Box>

        {/* Current Status Cards - 2x2 Layout */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* First Row */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Box sx={{ 
              flex: 1,
              p: 2, 
              backgroundColor: '#e8f5e8', 
              borderRadius: 2,
              textAlign: 'center',
              minHeight: '80px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#4caf50', mb: 0.5 }}>
                39.7%
              </Typography>
              <Typography variant="caption" sx={{ color: '#8b8b8b', fontSize: '0.75rem' }}>
                On the Way
              </Typography>
            </Box>
            
            <Box sx={{ 
              flex: 1,
              p: 2, 
              backgroundColor: '#e3f2fd', 
              borderRadius: 2,
              textAlign: 'center',
              minHeight: '80px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#2196f3', mb: 0.5 }}>
                28.3%
              </Typography>
              <Typography variant="caption" sx={{ color: '#8b8b8b', fontSize: '0.75rem' }}>
                Unloading
              </Typography>
            </Box>
          </Box>
          
          {/* Second Row */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Box sx={{ 
              flex: 1,
              p: 2, 
              backgroundColor: '#fff3e0', 
              borderRadius: 2,
              textAlign: 'center',
              minHeight: '80px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#ff9800', mb: 0.5 }}>
                17.4%
              </Typography>
              <Typography variant="caption" sx={{ color: '#8b8b8b', fontSize: '0.75rem' }}>
                Loading
              </Typography>
            </Box>
            
            <Box sx={{ 
              flex: 1,
              p: 2, 
              backgroundColor: '#f5f5f5', 
              borderRadius: 2,
              textAlign: 'center',
              minHeight: '80px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#9e9e9e', mb: 0.5 }}>
                14.6%
              </Typography>
              <Typography variant="caption" sx={{ color: '#8b8b8b', fontSize: '0.75rem' }}>
                Waiting
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default DriverStatistics;
