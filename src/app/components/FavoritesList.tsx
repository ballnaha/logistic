'use client';
import React, { useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Typography,
  Chip,
  Collapse,
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  FavoriteOutlined,
  LocalShippingOutlined,
  DirectionsCarOutlined,
} from '@mui/icons-material';

interface Driver {
  id: string;
  name: string;
  vehicle: string;
  status: 'ON THE WAY' | 'LOADING' | 'WAITING';
  avatar: string;
}

interface FavoritesListProps {
  className?: string;
}

const FavoritesList: React.FC<FavoritesListProps> = ({ className }) => {
  const [expandedSections, setExpandedSections] = useState({
    favorites: true,
    trucks: true,
    vans: false,
  });

  // ข้อมูลจำลอง
  const favoritesData: Driver[] = [
    { id: '1', name: 'Nolan Dokidis', vehicle: 'Mercedes-Benz Sprinter', status: 'ON THE WAY', avatar: 'ND' },
    { id: '2', name: 'Ahmad Mango', vehicle: 'Volkswagen Transporter', status: 'LOADING', avatar: 'AM' },
    { id: '3', name: 'James Lubin', vehicle: 'Volkswagen Transporter', status: 'ON THE WAY', avatar: 'JL' },
    { id: '4', name: 'Talan Dorwart', vehicle: 'Mercedes-Benz Metris', status: 'WAITING', avatar: 'TD' },
  ];

  const trucksData: Driver[] = [
    { id: '5', name: 'Jacob Vetrovs', vehicle: 'Volvo FL', status: 'ON THE WAY', avatar: 'JV' },
    { id: '6', name: 'Zain Vetrovs', vehicle: 'Mercedes-Benz Atego', status: 'WAITING', avatar: 'ZV' },
    { id: '7', name: 'Jayion Rhiel Madsen', vehicle: 'Volvo FL', status: 'ON THE WAY', avatar: 'JRM' },
  ];

  const vansData: Driver[] = [
    { id: '8', name: 'Corey Septimus', vehicle: 'Ford Transit', status: 'LOADING', avatar: 'CS' },
    { id: '9', name: 'Adison Carder', vehicle: 'Mercedes Sprinter', status: 'ON THE WAY', avatar: 'AC' },
  ];

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ON THE WAY': return '#4caf50';
      case 'LOADING': return '#ff9800';
      case 'WAITING': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const renderDriverList = (drivers: Driver[], title: string, sectionKey: keyof typeof expandedSections, icon: React.ReactNode) => (
    <Box sx={{ mb: 1 }}>
      <ListItemButton
        onClick={() => toggleSection(sectionKey)}
        sx={{
          py: 0.5,
          px: 0,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 36, color: '#999999' }}>
          {icon}
        </ListItemIcon>
        <ListItemText
          primary={
            <Typography variant="subtitle2" sx={{ 
              fontWeight: 'bold', 
              color: '#999999', 
              fontSize: '0.75rem',
              textTransform: 'uppercase'
            }}>
              {title}
            </Typography>
          }
        />
        {expandedSections[sectionKey] ? 
          <ExpandLess sx={{ color: '#999999', fontSize: '1rem' }} /> : 
          <ExpandMore sx={{ color: '#999999', fontSize: '1rem' }} />
        }
      </ListItemButton>
      
      <Collapse in={expandedSections[sectionKey]} timeout="auto" unmountOnExit>
        <List component="div" disablePadding dense>
          {drivers.map((driver) => (
            <ListItem key={driver.id} disablePadding>
              <ListItemButton
                sx={{
                  px: 0,
                  py: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      fontSize: '0.75rem',
                      bgcolor: '#007bff'
                    }}
                  >
                    {driver.avatar}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="body2" sx={{ 
                        fontWeight: 500, 
                        fontSize: '0.875rem', 
                        color: 'white',
                        lineHeight: 1.2
                      }}>
                        {driver.name}
                      </Typography>
                      <Chip
                        label={driver.status}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: '9px',
                          backgroundColor: getStatusColor(driver.status),
                          color: 'white',
                          fontWeight: 600,
                          '& .MuiChip-label': {
                            px: 1,
                          }
                        }}
                      />
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" sx={{ 
                      color: '#cccccc', 
                      fontSize: '0.75rem',
                      lineHeight: 1.2
                    }}>
                      {driver.vehicle}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Collapse>
    </Box>
  );

  return (
    <Box 
      className={className}
      sx={{ 
        width: '100%', 
        bgcolor: 'transparent',
        borderRadius: 1,
      }}
    >
      <List sx={{ py: 0 }}>
        {renderDriverList(favoritesData, 'FAVORITES', 'favorites', <FavoriteOutlined />)}
        {renderDriverList(trucksData, 'TRUCKS', 'trucks', <LocalShippingOutlined />)}
        {renderDriverList(vansData, 'VANS', 'vans', <DirectionsCarOutlined />)}
      </List>
    </Box>
  );
};

export default FavoritesList;
