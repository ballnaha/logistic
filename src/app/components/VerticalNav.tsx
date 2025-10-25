'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  IconButton,
  Typography,
  Drawer,
  Divider,
  useTheme,
} from '@mui/material';
import {
  GridViewOutlined,
  RouteOutlined,
  PersonOutline,
  LocalShippingOutlined,
  BarChartOutlined,
  NotificationsOutlined,
  HomeOutlined,
  MenuOutlined,
  ChevronLeftOutlined,
  DirectionsCar,
  LocalGasStation,
  Inventory,
  Settings,
  Business,
  ManageAccounts,
  Assessment,
  RateReview,
  Calculate,
  Money as MoneyIcon,
} from '@mui/icons-material';
import { useNavigation } from './NavigationContext';
import { useRouter, usePathname } from 'next/navigation';

const VerticalNav: React.FC = () => {
  const { data: session } = useSession();
  const { isNavExpanded, isMobile, isNavOpen, toggleNavigation, closeAllMenus } = useNavigation();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();

  // Refs for scroll functionality
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeMenuItemRef = useRef<HTMLLIElement>(null);

  const menuGroups = [
    {
      title: 'Dashboard',
      items: [
        { icon: <GridViewOutlined />, id: 'dashboard', label: 'Dashboard', href: '/' },
      ]
    },
    {
      title: 'Transactions',
      items: [
        { icon: <LocalGasStation />, id: 'fuel-records', label: 'บันทึกการเติมน้ำมัน', href: '/fuel-records' },
        { icon: <RouteOutlined />, id: 'trip-records', label: 'บันทึกการเดินทาง', href: '/trip-records' },
      ]
    },
    {
      title: 'Reports',
      items: [
        { icon: <LocalGasStation />, id: 'reports-fuel-reports', label: 'รายงานการเติมน้ำมัน', href: '/reports/reports-fuel-records' },
        { icon: <Assessment />, id: 'trip-reports-all-vehicle', label: 'รายงานบันทึกการเดินทาง', href: '/reports/trip-records/all-vehicle' },
        { icon: <PersonOutline />, id: 'reports-driver', label: 'รายงานคนขับรถ', href: '/reports/reports-driver' },
      ]
    },
    {
      title: 'Evaluation',
      items: [
        { icon: <Assessment />, id: 'evaluation', label: 'แบบประเมิน', href: '/evaluation' },
      ]
    },
    {
      title: 'Settings',
      items: [
        { icon: <DirectionsCar />, id: 'vehicles', label: 'จัดการรถ', href: '/vehicles' },
        { icon: <PersonOutline />, id: 'drivers', label: 'จัดการคนขับ', href: '/drivers' },
        { icon: <Business />, id: 'customers', label: 'จัดการลูกค้า', href: '/customers' },
        { icon: <Inventory />, id: 'items', label: 'จัดการพัสดุ', href: '/items' },
      ]
    },
    ...(session?.user?.role === 'admin' ? [{
      title: 'Admin',
      items: [
        { icon: <ManageAccounts />, id: 'users', label: 'จัดการผู้ใช้งาน', href: '/users' },
        { icon: <Settings />, id: 'settings', label: 'ตั้งค่าระบบ', href: '/settings' },
        { icon: <Calculate />, id: 'auto-distance', label: 'คำนวณระยะทางอัตโนมัติ', href: '/customers/auto-distance' },
      ]
    }] : [])
  ];

  // Flatten menu items for easier index calculation
  const allMenuItems = menuGroups.flatMap(group => group.items);

  // หาดัชนีของเมนูที่ตรงกับ URL ปัจจุบัน
  const getActiveIndex = () => {
    // ตรวจสอบ exact match ก่อน
    const exactMatch = allMenuItems.findIndex(item => item.href === pathname);
    if (exactMatch !== -1) return exactMatch;
    
    // ตรวจสอบ path prefix สำหรับ nested routes
    const prefixMatch = allMenuItems.findIndex(item => {
      if (item.href === '/') return false; // ไม่ให้ home page match กับทุก path
      return pathname.startsWith(item.href);
    });
    
    return prefixMatch !== -1 ? prefixMatch : 0; // ถ้าไม่เจอให้ default เป็น 0 (Dashboard)
  };

  const handleListItemClick = (href: string) => {
    router.push(href);
    if (isMobile) {
      closeAllMenus(); // ปิดเมนูหลังจากเลือกใน mobile
    }
  };

  // Auto-scroll to active menu item
  const scrollToActiveMenuItem = useCallback(() => {
    const activeMenuItem = activeMenuItemRef.current;
    const scrollContainer = scrollContainerRef.current;
    
    if (scrollContainer && activeMenuItem) {
      // ตรวจสอบว่าเมนูอยู่ในมุมมองหรือไม่
      const containerRect = scrollContainer.getBoundingClientRect();
      const itemRect = activeMenuItem.getBoundingClientRect();
      
      const isItemVisible = (
        itemRect.top >= containerRect.top &&
        itemRect.bottom <= containerRect.bottom
      );
      
      // Scroll เฉพาะเมื่อเมนูไม่อยู่ในมุมมอง
      if (!isItemVisible) {
        activeMenuItem.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }, []);

  // Scroll to active menu when pathname changes
  useEffect(() => {
    // ใช้ timeout เล็กน้อยเพื่อให้ DOM render เสร็จก่อน
    const timeoutId = setTimeout(() => {
      scrollToActiveMenuItem();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [pathname, scrollToActiveMenuItem]);

  // Check if menu item is active
  const isMenuItemActive = (item: any) => {
    // ตรวจสอบ exact match ก่อน
    if (item.href === pathname) return true;
    
    // ไม่ให้ home page match กับทุก path
    if (item.href === '/') return false;
    
    // กรณีพิเศษ: เฉพาะหน้า auto-distance ไม่ควรให้ customers active
    if (pathname === '/customers/auto-distance' && item.href === '/customers') {
      return false;
    }
    
    // สำหรับ nested routes ให้ตรวจสอบว่า pathname เริ่มต้นด้วย item.href
    // และตัวถัดไปต้องเป็น '/' เพื่อป้องกันการ match บางส่วน
    // เช่น /customers ไม่ควร match กับ /customers-reports
    if (pathname.startsWith(item.href + '/')) {
      return true;
    }
    
    return false;
  };

  // สร้าง content สำหรับ navigation
  const navigationContent = (
    <Box
      sx={{
        width: 240, // Fixed width สำหรับ mobile drawer
        height: '100vh',
        backgroundColor: '#2c2c2c',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #404040',
      }}
    >
      {/* Header with toggle button */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, fontSize: '1rem' }}>
          Logistics
        </Typography>
        <IconButton 
          onClick={toggleNavigation}
          sx={{ 
            color: '#b0b0b0', 
            cursor: 'pointer',
            '&:hover': { 
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              cursor: 'pointer'
            }
          }}
        >
          <ChevronLeftOutlined />
        </IconButton>
      </Box>

      {/* Menu Items */}
      <Box 
        ref={scrollContainerRef}
        sx={{ flex: 1, px: 1, overflow: 'auto' }}
      >
        {menuGroups.map((group, groupIndex) => (
          <Box key={group.title} sx={{ mb: 2 }}>
            {/* Group Title */}
            <Typography 
              variant="caption" 
              sx={{ 
                color: '#888', 
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                px: 2,
                py: 1,
                display: 'block'
              }}
            >
              {group.title}
            </Typography>
            
            {/* Group Items */}
            <List sx={{ py: 0 }}>
              {group.items.map((item) => {
                const isActive = isMenuItemActive(item);
                return (
                  <ListItem 
                    key={item.id} 
                    disablePadding 
                    sx={{ mb: 0.5 }}
                    ref={isActive ? activeMenuItemRef : null}
                  >
                    <ListItemButton
                      selected={isActive}
                      onClick={() => handleListItemClick(item.href)}
                      sx={{
                        minHeight: 44,
                        borderRadius: 2,
                        justifyContent: 'flex-start',
                        px: 2,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        '&.Mui-selected': {
                          backgroundColor: '#007bff',
                          '&:hover': {
                            backgroundColor: '#0056b3',
                          },
                        },
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          cursor: 'pointer',
                          transform: 'translateX(2px)',
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 36,
                          justifyContent: 'center',
                          color: isActive ? 'white' : '#b0b0b0',
                          cursor: 'pointer',
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText 
                        primary={item.label}
                        sx={{
                          '& .MuiListItemText-primary': {
                            color: isActive ? 'white' : '#b0b0b0',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                          }
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
            
            {/* Divider between groups (except last) */}
            {groupIndex < menuGroups.length - 1 && (
              <Divider sx={{ mx: 2, my: 1, borderColor: '#444' }} />
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );

  // Mobile: ใช้ Drawer
  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={isNavOpen}
        onClose={closeAllMenus}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 240,
          },
        }}
      >
        {navigationContent}
      </Drawer>
    );
  }

  // Desktop: ใช้ Fixed position
  return (
    <Box
      sx={{
        width: isNavExpanded ? 240 : 70,
        height: '100vh',
        backgroundColor: '#2c2c2c',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 1000,
        transition: 'width 0.3s ease',
        borderRight: '1px solid #404040',
      }}
    >
      {/* Header with toggle button */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: isNavExpanded ? 'space-between' : 'center' }}>
        {isNavExpanded && (
          <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, fontSize: '1rem' }}>
            Logistic Record
          </Typography>
        )}
        <IconButton 
          onClick={toggleNavigation}
          sx={{ 
            color: '#b0b0b0', 
            cursor: 'pointer',
            '&:hover': { 
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              cursor: 'pointer'
            }
          }}
        >
          {isNavExpanded ? <ChevronLeftOutlined /> : <MenuOutlined />}
        </IconButton>
      </Box>

      {/* Menu Items */}
      <Box 
        ref={scrollContainerRef}
        sx={{ flex: 1, px: 1, overflow: 'auto' }}
      >
        {menuGroups.map((group, groupIndex) => (
          <Box key={group.title} sx={{ mb: isNavExpanded ? 2 : 1 }}>
            {/* Group Title - only show when expanded */}
            {isNavExpanded && (
              <Typography 
                variant="caption" 
                sx={{ 
                  color: '#888', 
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  px: 2,
                  py: 1,
                  display: 'block'
                }}
              >
                {group.title}
              </Typography>
            )}
            
            {/* Group Items */}
            <List sx={{ py: 0 }}>
              {group.items.map((item) => {
                const isActive = isMenuItemActive(item);
                return (
                  <ListItem 
                    key={item.id} 
                    disablePadding 
                    sx={{ mb: 0.5 }}
                    ref={isActive ? activeMenuItemRef : null}
                  >
                    <ListItemButton
                      selected={isActive}
                      onClick={() => handleListItemClick(item.href)}
                      sx={{
                        minHeight: 44,
                        borderRadius: 2,
                        justifyContent: isNavExpanded ? 'flex-start' : 'center',
                        px: isNavExpanded ? 2 : 1,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        '&.Mui-selected': {
                          backgroundColor: '#007bff',
                          '&:hover': {
                            backgroundColor: '#0056b3',
                          },
                        },
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          cursor: 'pointer',
                          transform: isNavExpanded ? 'translateX(2px)' : 'scale(1.05)',
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: isNavExpanded ? 36 : 0,
                          justifyContent: 'center',
                          color: isActive ? 'white' : '#b0b0b0',
                          cursor: 'pointer',
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      {isNavExpanded && (
                        <ListItemText 
                          primary={item.label}
                          sx={{
                            '& .MuiListItemText-primary': {
                              color: isActive ? 'white' : '#b0b0b0',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                            }
                          }}
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
            
            {/* Divider between groups (except last) - only show when expanded */}
            {isNavExpanded && groupIndex < menuGroups.length - 1 && (
              <Divider sx={{ mx: 2, my: 1, borderColor: '#444' }} />
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default VerticalNav;
