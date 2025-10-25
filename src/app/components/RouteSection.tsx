'use client';
import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';

interface RouteData {
  id: string;
  packages: string;
  distance: string;
  time: string;
  weight: string;
  volume: string;
  startLocation: string;
  endLocation: string;
  status: 'on-route' | 'completed' | 'pending';
}

const RouteSection: React.FC = () => {

  const routes: RouteData[] = [
    {
      id: '107-591',
      packages: '138 packages',
      distance: '0.62 mi',
      time: '10 min',
      weight: '2,160 lbs',
      volume: '3,357 ft³',
      startLocation: '2972 Westheimer Rd. Santa Ana → 75 Rucker Ave',
      endLocation: 'Fort Buchanan Blvd',
      status: 'on-route'
    },
    {
      id: '109-270',
      packages: '107 packages',
      distance: '1.2 mi',
      time: '15 min', 
      weight: '1,890 lbs',
      volume: '2,847 ft³',
      startLocation: '6900 Murray Ave → 163 W John St, Gilroy, CA 95020',
      endLocation: 'Fort CA 96960',
      status: 'completed'
    },
    {
      id: '112-791',
      packages: '86 packages',
      distance: '2.1 mi',
      time: '22 min',
      weight: '2,340 lbs',
      volume: '3,192 ft³',
      startLocation: '230 Maycock Rd → 8225 Arroyo Cir Suite 21, Gilroy, CA 95020',
      endLocation: 'Gliny CA 96960',
      status: 'pending'
    },
    {
      id: '128-612',
      packages: '129 packages',
      distance: '1.8 mi',
      time: '18 min',
      weight: '2,100 lbs',
      volume: '2,950 ft³',
      startLocation: '6215 Engle Way → 905 1st St, Gilroy, CA 95020',
      endLocation: 'Downtown',
      status: 'pending'
    }
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
          Routes
        </Typography>
      </Box>

      <Box sx={{ p: 3 }}>
        {/* Now on the way section */}
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 3, color: '#1a1a1a' }}>
          NOW ON THE WAY
        </Typography>

        {/* Map Area */}
        <Box sx={{ 
          height: 250, 
          backgroundColor: '#f8f9fa', 
          borderRadius: 2, 
          mb: 4,
          position: 'relative',
          border: '1px solid #e9ecef',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Simple map placeholder */}
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cg fill='%23e9ecef' fill-opacity='0.5'%3E%3Cpath d='M0 0h40v40H0z' fill='none' stroke='%23dee2e6' stroke-width='1'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '40px 40px'
          }} />
          
          {/* Route visualization */}
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '20%',
            right: '20%',
            height: '4px',
            backgroundColor: '#007bff',
            borderRadius: '2px',
            transform: 'translateY(-50%)',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: '-8px',
              top: '50%',
              width: '16px',
              height: '16px',
              backgroundColor: '#28a745',
              borderRadius: '50%',
              transform: 'translateY(-50%)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              right: '-8px',
              top: '50%',
              width: '16px',
              height: '16px',
              backgroundColor: '#dc3545',
              borderRadius: '50%',
              transform: 'translateY(-50%)',
            }
          }} />
          
          {/* Distance and Time Info */}
          <Box sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            backgroundColor: 'white',
            borderRadius: 2,
            p: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#007bff' }}>
                0.62 mi
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Distance
              </Typography>
            </Box>
            <Box sx={{ width: 1, height: 24, backgroundColor: '#e9ecef' }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#28a745' }}>
                10 min
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Time Left
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Route List */}
        <Box>
          {routes.map((route, index) => (
            <Box key={route.id} sx={{ 
              mb: 3,
              p: 3,
              backgroundColor: '#f8f9fa',
              borderRadius: 2,
              border: '1px solid #e9ecef'
            }}>
              {/* Route Header */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                  ID: {route.id} • {route.packages}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6c757d', mt: 0.5 }}>
                  {route.startLocation}
                </Typography>
                {index === 0 && (
                  <Typography variant="caption" sx={{ color: '#6c757d', fontSize: '0.75rem' }}>
                    12/10/22
                  </Typography>
                )}
              </Box>
              
              {/* Route Stats Layout */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 150px', minWidth: '120px' }}>
                  <Typography variant="body2" sx={{ color: '#6c757d', mb: 0.5, fontSize: '0.75rem' }}>
                    Distance
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                    {route.distance}
                  </Typography>
                </Box>
                <Box sx={{ flex: '1 1 150px', minWidth: '120px' }}>
                  <Typography variant="body2" sx={{ color: '#6c757d', mb: 0.5, fontSize: '0.75rem' }}>
                    Time Left
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                    {route.time}
                  </Typography>
                </Box>
                <Box sx={{ flex: '1 1 150px', minWidth: '120px' }}>
                  <Typography variant="body2" sx={{ color: '#6c757d', mb: 0.5, fontSize: '0.75rem' }}>
                    Weight
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                    {route.weight}
                  </Typography>
                </Box>
                <Box sx={{ flex: '1 1 150px', minWidth: '120px' }}>
                  <Typography variant="body2" sx={{ color: '#6c757d', mb: 0.5, fontSize: '0.75rem' }}>
                    Volume
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                    {route.volume}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default RouteSection;