'use client';
import React from 'react';
import {
  Box,
  Typography,
  Chip,
} from '@mui/material';

interface VehicleCardProps {
  vehicleName: string;
  payload: string;
  loadVolume: string;
  loadLength: string;
  loadHeight: string;
  documents: string;
  vehicleImage?: string;
}

const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicleName = "Volkswagen Transporter",
  payload = "2,885 lbs",
  loadVolume = "353.937 ft³",
  loadLength = "117 in",
  loadHeight = "67 in",
  documents = "STR1244",
  vehicleImage = "/images/truck.png"
}) => {
  return (
    <Box sx={{ 
      backgroundColor: 'white',
      borderRadius: 2,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      overflow: 'hidden',
      mb: 3
    }}>
      <Box sx={{ p: 3 }}>
        {/* Vehicle Title */}
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: '#1a1a1a' }}>
          {vehicleName}
        </Typography>

        <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Vehicle Image */}
          <Box sx={{ flex: { md: '7' }, width: '100%' }}>
            <Box sx={{ 
              height: 300,
              borderRadius: 2,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef'
            }}>
              <Box
                component="img"
                src="/images/truck.png"
                alt="Volkswagen Transporter"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  maxWidth: '100%',
                  maxHeight: '100%'
                }}
              />
            </Box>
          </Box>
          
          {/* Vehicle Stats */}
          <Box sx={{ flex: { md: '5' }, width: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Stats Layout - 2x2 */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* First Row */}
                <Box sx={{ display: 'flex', gap: 3 }}>
                  {/* Payload */}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ color: '#8b8b8b', mb: 1, fontSize: '0.75rem' }}>
                      Payload
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>
                      {payload}
                    </Typography>
                  </Box>
                  
                  {/* Load Volume */}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ color: '#8b8b8b', mb: 1, fontSize: '0.75rem' }}>
                      Load Volume
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>
                      {loadVolume}
                    </Typography>
                  </Box>
                </Box>
                
                {/* Second Row */}
                <Box sx={{ display: 'flex', gap: 3 }}>
                  {/* Load Length */}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ color: '#8b8b8b', mb: 1, fontSize: '0.75rem' }}>
                      Load Length
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>
                      {loadLength}
                    </Typography>
                  </Box>
                  
                  {/* Load Width */}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ color: '#8b8b8b', mb: 1, fontSize: '0.75rem' }}>
                      Load Width
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>
                      {loadHeight}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              {/* Documents */}
              <Box sx={{ 
                backgroundColor: '#f8f9fa', 
                borderRadius: 2, 
                p: 2,
                border: '1px solid #e9ecef',
                textAlign: 'center'
              }}>
                <Typography variant="body2" sx={{ color: '#8b8b8b', mb: 1, fontSize: '0.75rem' }}>
                  Documents
                </Typography>
                <Typography variant="h5" sx={{ 
                  fontWeight: 700, 
                  fontFamily: 'monospace',
                  color: '#1a1a1a',
                  backgroundColor: '#fff',
                  border: '1px solid #dee2e6',
                  borderRadius: 1,
                  py: 1,
                  px: 2,
                  display: 'inline-block'
                }}>
                  {documents}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default VehicleCard;
