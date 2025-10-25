import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2196f3', // น้ำเงิน
      light: '#64b5f6',
      dark: '#1976d2',
    },
    secondary: {
      main: '#1a1a1a', // ดำ
      light: '#333333',
      dark: '#000000',
    },
    background: {
      default: '#f5f7fa', // ขาว-เทาอ่อน
      paper: '#ffffff', // ขาว
    },
    text: {
      primary: '#1a1a1a', // ดำ
      secondary: '#666666', // เทา
    }
  },
  typography: {
    fontFamily: '"Prompt", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontFamily: '"Prompt", sans-serif',
    },
    h2: {
      fontWeight: 600,
      fontFamily: '"Prompt", sans-serif',
    },
    h3: {
      fontWeight: 600,
      fontFamily: '"Prompt", sans-serif',
    },
    h4: {
      fontWeight: 600,
      fontFamily: '"Prompt", sans-serif',
    },
    h5: {
      fontWeight: 500,
      fontFamily: '"Prompt", sans-serif',
    },
    h6: {
      fontWeight: 500,
      fontFamily: '"Prompt", sans-serif',
    },
    body1: {
      fontFamily: '"Prompt", sans-serif',
      fontWeight: 400,
    },
    body2: {
      fontFamily: '"Prompt", sans-serif',
      fontWeight: 400,
    },
    button: {
      fontFamily: '"Prompt", sans-serif',
      fontWeight: 500,
    },
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1a1a1a', // สีดำ
          borderRight: '1px solid #333333',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff', // สีขาว
          color: '#1a1a1a', // ข้อความสีดำ
          boxShadow: 'none',
          borderBottom: '1px solid #e0e0e0',
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          fontFamily: '"Prompt", sans-serif',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: '"Prompt", sans-serif',
          borderRadius: 8,
        },
      },
    },
  },
});

export default theme;
