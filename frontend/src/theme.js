import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#E20015',
      light: '#FF3333',
      dark: '#B0000F',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#1B1B1B',
      light: '#333333',
      dark: '#000000',
    },
    background: {
      default: '#F0F2F5',
      paper: '#FFFFFF',
    },
    success: {
      main: '#00884A',
      light: '#E8F5E9',
    },
    warning: {
      main: '#FF8C00',
      light: '#FFF3E0',
    },
    error: {
      main: '#E20015',
      light: '#FFEBEE',
    },
    info: {
      main: '#0077B6',
      light: '#E3F2FD',
    },
    text: {
      primary: '#1B1B1B',
      secondary: '#5F6368',
    },
    divider: '#E0E0E0',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
      color: '#5F6368',
    },
    body2: {
      color: '#5F6368',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
          border: '1px solid rgba(0,0,0,0.06)',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 24px',
        },
        contained: {
          boxShadow: '0 2px 8px rgba(226,0,21,0.3)',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(226,0,21,0.4)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          backgroundColor: '#F8F9FA',
          color: '#1B1B1B',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
  },
});

export default theme;
