'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

export type SnackbarType = 'success' | 'info' | 'warning' | 'error';

interface SnackbarState {
  open: boolean;
  message: string;
  type: SnackbarType;
  duration?: number;
}

interface SnackbarContextType {
  showSnackbar: (message: string, type: SnackbarType, duration?: number) => void;
  hideSnackbar: () => void;
  snackbarState: SnackbarState;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    // ใน development mode ให้แสดง warning แทนการ throw error
    if (typeof window !== 'undefined') {
      console.warn('useSnackbar must be used within a SnackbarProvider');
      // Return dummy functions เพื่อป้องกัน error
      return {
        showSnackbar: (message: string, type: SnackbarType, duration?: number) => {
          console.log('Snackbar (fallback):', message, type);
        },
        hideSnackbar: () => {},
        snackbarState: { open: false, message: '', type: 'success' as SnackbarType, duration: 4000 }
      };
    }
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};

interface SnackbarProviderProps {
  children: ReactNode;
}

export const SnackbarProvider: React.FC<SnackbarProviderProps> = ({ children }) => {
  const [snackbarState, setSnackbarState] = useState<SnackbarState>({
    open: false,
    message: '',
    type: 'success',
    duration: 4000,
  });

  const showSnackbar = (message: string, type: SnackbarType, duration = 4000) => {
    setSnackbarState({
      open: true,
      message,
      type,
      duration,
    });
  };

  const hideSnackbar = () => {
    setSnackbarState(prev => ({
      ...prev,
      open: false,
    }));
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar, hideSnackbar, snackbarState }}>
      {children}
    </SnackbarContext.Provider>
  );
};
