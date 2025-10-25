'use client';
import dynamic from 'next/dynamic';
import React from 'react';

const Layout = dynamic(() => import('./Layout'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: '#f8f9fa'
    }}>
      {/* Static loading layout */}
      <div style={{
        width: '70px',
        height: '100vh',
        backgroundColor: '#2c2c2c',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 1000,
      }} />
      
      <div style={{
        width: '320px',
        height: '100vh',
        backgroundColor: '#1a1a1a',
        position: 'fixed',
        left: '70px',
        top: 0,
        zIndex: 999,
      }} />
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        marginLeft: '390px',
      }}>
        <div style={{
          height: '64px',
          backgroundColor: 'white',
          borderBottom: '1px solid #e0e0e0',
        }} />
        
        <div style={{
          flexGrow: 1,
          backgroundColor: '#f8f9fa',
          padding: '24px',
        }}>
          Loading...
        </div>
      </div>
    </div>
  )
});

interface DynamicLayoutProps {
  children: React.ReactNode;
}

export default function DynamicLayout({ children }: DynamicLayoutProps) {
  return <Layout>{children}</Layout>;
}
