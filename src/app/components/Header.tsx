'use client';
import React, { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import {
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Phone,
  MoreVert,
  Logout,
  Person,
  Menu as MenuIcon,
  ViewList,
  
} from '@mui/icons-material';
import { useNavigation } from './NavigationContext';

const Header: React.FC = () => {
  const { data: session } = useSession();
  const { isMobile, toggleNavigation, toggleSidebar } = useNavigation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    const isProduction = process.env.NODE_ENV === 'production';
    const envBase = isProduction
      ? process.env.NEXT_PUBLIC_BASE_URL
      : process.env.NEXTAUTH_URL;
    const baseUrl = (envBase || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
    await signOut({
      callbackUrl: `${baseUrl}/login`,
      redirect: true
    });
  };

  // สร้าง initials จาก username หรือใช้ default
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const userInitials = session?.user?.username 
    ? getInitials(session.user.username) 
    : 'U';

  return (
    <AppBar
      position="static"
      sx={{ 
        backgroundColor: 'white',
        color: 'black',
        boxShadow: 'none',
        borderBottom: '1px solid #e0e0e0',
        zIndex: 1
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        {/* Left side - Mobile menu buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Mobile hamburger menus */}
          {isMobile && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={toggleNavigation} size="large">
                <MenuIcon />
              </IconButton>
            </Box>
          )}
        </Box>
        
        {/* Right side - User info & Action buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
          {/* User Avatar & Info */}
          <Avatar sx={{ width: 40, height: 40 }}>{userInitials}</Avatar>
          <Box sx={{ 
            display: { xs: 'none', sm: 'block' }, 
            textAlign: 'right',
            minWidth: 0 // ป้องกันการล้น
          }}>
            <Typography 
              variant="subtitle2" 
              component="div" 
              sx={{ 
                fontWeight: 600,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 150
              }}
            >
              {session?.user?.username || 'ผู้ใช้งาน'}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'text.secondary',
                lineHeight: 1
              }}
            >
              {session?.user?.role || 'user'}
            </Typography>
          </Box>
          
          {/* More menu */}
          <IconButton onClick={handleMenuClick} size="medium">
            <MoreVert />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              <ListItemText>ออกจากระบบ</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
