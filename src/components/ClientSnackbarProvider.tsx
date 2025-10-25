'use client';
import { SnackbarProvider } from '../contexts/SnackbarContext';
import { GlobalSnackbar } from './GlobalSnackbar';

interface ClientSnackbarProviderProps {
  children: React.ReactNode;
}

export default function ClientSnackbarProvider({ children }: ClientSnackbarProviderProps) {
  return (
    <SnackbarProvider>
      {children}
      <GlobalSnackbar />
    </SnackbarProvider>
  );
}
