'use client';
import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Chip, CircularProgress, Button } from '@mui/material';
import { DirectionsCar, Schedule, Route } from '@mui/icons-material';

interface MiniMapProps {
  customerLat?: number;
  customerLong?: number;
  customerName?: string;
  onRouteDistanceChange?: (distance: number | null) => void;
}

interface RouteInfo {
  distance: number;
  duration: number; // in seconds
  polyline?: string;
}

const MiniMap: React.FC<MiniMapProps> = ({ customerLat, customerLong, customerName, onRouteDistanceChange }) => {
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Company location (Poonsubcan)
  const COMPANY_LAT = 13.537051;
  const COMPANY_LONG = 100.2173051;

  // Calculate route using OSRM (Open Source Routing Machine)
  const calculateRoute = async () => {
    if (!customerLat || !customerLong) return;

    setLoading(true);
    setError(null);
    
    // Create AbortController for cancellation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${COMPANY_LONG},${COMPANY_LAT};${customerLong},${customerLat}?overview=full&geometries=geojson`;
      
      const response = await fetch(url, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceInKm = route.distance / 1000; // Convert to km
        const newRouteInfo = {
          distance: distanceInKm,
          duration: route.duration, // in seconds
          polyline: JSON.stringify(route.geometry)
        };
        setRouteInfo(newRouteInfo);
        
        // Send distance back to parent component
        if (onRouteDistanceChange) {
          onRouteDistanceChange(distanceInKm);
        }
      } else {
        setError('ไม่สามารถคำนวณเส้นทางได้');
        if (onRouteDistanceChange) {
          onRouteDistanceChange(null);
        }
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setError('การคำนวณเส้นทางใช้เวลานานเกินไป');
      } else {
        setError('เกิดข้อผิดพลาดในการคำนวณเส้นทาง');
      }
      console.error('Route calculation error:', err);
      if (onRouteDistanceChange) {
        onRouteDistanceChange(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // OSRM route calculation is kept for distance/time data
  // No more Leaflet map initialization - using Google Maps iframe instead

  // Calculate route when coordinates change
  useEffect(() => {
    if (customerLat && customerLong) {
      const timeoutId = setTimeout(() => {
        calculateRoute();
      }, 100); // Debounce to prevent multiple rapid calls

      return () => clearTimeout(timeoutId);
    }
  }, [customerLat, customerLong]);

  // No cleanup needed for iframe - browser handles it automatically

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} ชม. ${minutes} นาที`;
    }
    return `${minutes} นาที`;
  };

  if (!customerLat || !customerLong) {
    return (
      <Paper sx={{ p: 3, borderRadius: 2, bgcolor: 'grey.50' }}>
        <Typography variant="body2" color="text.secondary" align="center">
          กรุณากรอกพิกัด GPS เพื่อแสดงแผนที่และคำนวณเส้นทาง
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ 
      p: 2, 
      borderRadius: 2, 
      bgcolor: 'white',
      border: '1px solid',
      borderColor: 'grey.200',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      {/* Compact Header with Route Info */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="subtitle1" sx={{ 
          fontWeight: 600, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          color: 'primary.main'
        }}>
          <Route fontSize="small" />
          แผนที่เส้นทาง
        </Typography>
        
        {/* Compact Route Info */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="caption">กำลังคำนวณ...</Typography>
            </Box>
          ) : error ? (
            <Typography variant="caption" color="error.main">{error}</Typography>
          ) : routeInfo ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <DirectionsCar fontSize="small" color="primary" />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {routeInfo.distance.toFixed(1)} กม.
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Schedule fontSize="small" color="secondary" />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatDuration(routeInfo.duration)}
                </Typography>
              </Box>
            </>
          ) : null}
        </Box>
      </Box>

      {/* Google Maps iframe - ฟรีแบบเก่า */}
      <Box 
        sx={{ 
          height: 400, 
          width: '100%', 
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'grey.300',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <iframe
          src={`https://maps.google.com/maps?width=100%25&height=400&hl=th&q=${customerLat},${customerLong}+(${encodeURIComponent(customerName || 'ลูกค้า')})&t=&z=13&ie=UTF8&iwloc=B&output=embed`}
          width="100%"
          height="100%"
          style={{ 
            border: 'none',
            borderRadius: '4px'
          }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Google Maps with Customer Location"
        />

      </Box>
      
      {/* Navigation buttons */}
      <Box sx={{ 
        mt: 2, 
        display: 'flex', 
        gap: 1,
        justifyContent: 'center'
      }}>
        <Button
          variant="contained"
          color="primary"
          href={`https://www.google.com/maps/dir/${COMPANY_LAT},${COMPANY_LONG}/${customerLat},${customerLong}`}
          target="_blank"
          sx={{ flex: 1, maxWidth: 200 }}
        >
          🗺️ เปิดใน Google Maps
        </Button>
        
        
      </Box>
      
      {/* Detailed Legend */}
      <Box sx={{ 
        mt: 1.5, 
        display: 'flex', 
        flexDirection: 'column',
        gap: 1
      }}>
        {/* Route info */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            🏢 พูนทรัพย์แคน → 🎯 {customerName || 'ลูกค้า'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            © Google Maps
          </Typography>
        </Box>
        
        {/* Coordinates */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary">
            🏢 บริษัท: {COMPANY_LAT.toFixed(4)}, {COMPANY_LONG.toFixed(4)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            🎯 ลูกค้า: {customerLat.toFixed(4)}, {customerLong.toFixed(4)}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default MiniMap;
