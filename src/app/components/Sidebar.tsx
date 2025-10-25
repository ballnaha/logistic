'use client';
import React from 'react';
import {
  Box,
  Typography,
  Divider,
  IconButton,
  TextField,
  InputAdornment,
  Button,
  Drawer,
} from '@mui/material';
import {
  Search,
  Add,
} from '@mui/icons-material';
import { useNavigation } from './NavigationContext';
import FavoritesList from './FavoritesList';

const drawerWidth = 320;

const Sidebar: React.FC = () => {
  const { isNavExpanded, isMobile, isSidebarOpen, closeAllMenus } = useNavigation();

  // สร้าง content สำหรับ sidebar
  const sidebarContent = (
    <>
      {/* Search Bar */}
      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          placeholder="Search..."
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: '#999', fontSize: '1.25rem' }} />
              </InputAdornment>
            ),
            sx: {
              backgroundColor: '#2c2c2c',
              borderRadius: 2,
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
              '& input': {
                color: 'white',
                fontSize: '0.875rem',
                '&::placeholder': {
                  color: '#999',
                  opacity: 1,
                },
              },
            }
          }}
        />
      </Box>
      
      {/* Scrollable Content */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 2 }}>
        <FavoritesList />
      </Box>
      
      {/* Add New Vehicle Button */}
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          startIcon={<Add />}
          sx={{ 
            backgroundColor: '#1a1a1a', 
            color: 'white',
            borderRadius: 2,
            border: '1px solid #333',
            textTransform: 'none',
            py: 1.5,
            '&:hover': {
              backgroundColor: '#2c2c2c',
              borderColor: '#555',
            }
          }}
        >
          Add New Vehicle
        </Button>
      </Box>
    </>
  );

  // Mobile: ใช้ Drawer
  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        anchor="right"
        open={isSidebarOpen}
        onClose={closeAllMenus}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            backgroundColor: '#1a1a1a',
            color: 'white',
            borderLeft: '1px solid #333',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {sidebarContent}
      </Drawer>
    );
  }

  // Desktop: ใช้ Fixed position
  return (
    <Box
      sx={{
        width: drawerWidth,
        height: '100vh',
        backgroundColor: '#1a1a1a',
        color: 'white',
        borderRight: '1px solid #333',
        position: 'fixed',
        left: isNavExpanded ? 240 : 70, // Account for vertical nav width
        transition: 'left 0.3s ease',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {sidebarContent}
    </Box>
  );
};

export default Sidebar;