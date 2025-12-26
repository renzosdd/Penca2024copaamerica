import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1f6feb',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#03dac6',
      contrastText: '#001219'
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff'
    },
    error: {
      main: '#b00020',
      contrastText: '#ffffff'
    },
    text: {
      primary: '#0f172a'
    }
  },
  shape: {
    borderRadius: 12
  },
  typography: {
    fontFamily: "'Roboto', sans-serif"
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#ffffff'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backdropFilter: 'blur(6px)'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16
        }
      }
    }
  }
});

export default theme;
