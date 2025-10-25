'use client';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';

interface NavigationContextType {
  isNavExpanded: boolean;
  isMobile: boolean;
  isNavOpen: boolean;
  isSidebarOpen: boolean;
  toggleNavigation: () => void;
  toggleSidebar: () => void;
  closeAllMenus: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // เริ่มต้นค่า state ตาม device type
  const [isNavExpanded, setIsNavExpanded] = useState(() => {
    // ถ้าเป็น SSR จะ default เป็น true สำหรับ desktop
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 768; // md breakpoint = 768px
  });
  const [isNavOpen, setIsNavOpen] = useState(false); // สำหรับ mobile drawer
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // สำหรับ mobile sidebar

  // ปรับ default state ตาม screen size
  useEffect(() => {
    if (isMobile) {
      setIsNavExpanded(false);
      setIsNavOpen(false);
      setIsSidebarOpen(false);
    } else {
      setIsNavExpanded(true);
      setIsNavOpen(false);
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  const toggleNavigation = () => {
    if (isMobile) {
      setIsNavOpen(!isNavOpen);
      if (isSidebarOpen) setIsSidebarOpen(false); // ปิด sidebar เมื่อเปิด nav
    } else {
      setIsNavExpanded(!isNavExpanded);
    }
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(!isSidebarOpen);
      if (isNavOpen) setIsNavOpen(false); // ปิด nav เมื่อเปิด sidebar
    }
  };

  const closeAllMenus = () => {
    setIsNavOpen(false);
    setIsSidebarOpen(false);
  };

  return (
    <NavigationContext.Provider value={{ 
      isNavExpanded, 
      isMobile, 
      isNavOpen, 
      isSidebarOpen, 
      toggleNavigation, 
      toggleSidebar, 
      closeAllMenus 
    }}>
      {children}
    </NavigationContext.Provider>
  );
};
