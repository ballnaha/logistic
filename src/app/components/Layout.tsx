'use client';
import React from 'react';
import { Box, Backdrop } from '@mui/material';
import VerticalNav from './VerticalNav';
import Sidebar from './Sidebar';
import Header from './Header';
import Breadcrumbs from './Breadcrumbs';
import { NavigationProvider, useNavigation } from './NavigationContext';

interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  customSidebar?: React.ReactNode;
}

const LayoutContent: React.FC<LayoutProps> = ({ children, showSidebar = true, customSidebar }) => {
  const { isNavExpanded, isMobile, isNavOpen, isSidebarOpen, closeAllMenus } = useNavigation();
  
  // คำนวณ margin สำหรับ desktop (รวม custom sidebar)
  const getMarginLeft = () => {
    if (isMobile) return 0; // Mobile ไม่มี margin
    const navWidth = isNavExpanded ? 240 : 70;
    const defaultSidebarWidth = showSidebar ? 320 : 0;
    const customSidebarWidth = customSidebar ? 280 : 0; // custom sidebar ก็กว้าง 280px
    return `${navWidth + defaultSidebarWidth + customSidebarWidth}px`;
  };
  
  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Mobile Backdrop */}
      {isMobile && (isNavOpen || isSidebarOpen) && (
        <Backdrop
          open={true}
          onClick={closeAllMenus}
          sx={{
            zIndex: (theme) => theme.zIndex.drawer - 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
        />
      )}

      {/* Left Vertical Navigation */}
      <VerticalNav />
      
      {/* Sidebar */}
      {showSidebar && <Sidebar />}
      {customSidebar}
      
      {/* Main Content Area */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        flexGrow: 1,
        ml: getMarginLeft(),
        transition: 'margin-left 0.3s ease',
        minWidth: 0, // ป้องกัน overflow ใน mobile
      }}>
        <Header />
        
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            bgcolor: '#f8f9fa',
            overflow: 'auto',
            minHeight: 0, // ป้องกัน layout ยืด
          }}
        >
          {/* Breadcrumbs */}
          <Box sx={{ px: { xs: 2, sm: 3 } }}>
            <Breadcrumbs />
          </Box>
          
          {/* Main Content */}
          <Box sx={{ p: { xs: 2, sm: 3 }, pt: 0 }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

const Layout: React.FC<LayoutProps> = ({ children, showSidebar = true, customSidebar }) => {
  return (
    <NavigationProvider>
      <LayoutContent showSidebar={showSidebar} customSidebar={customSidebar}>
        {children}
      </LayoutContent>
    </NavigationProvider>
  );
};

export default Layout;
