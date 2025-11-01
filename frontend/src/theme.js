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
      default: '#e8edf3',
      paper: 'rgba(255, 255, 255, 0.92)'
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
          backgroundImage:
            'linear-gradient(180deg, rgba(15, 23, 42, 0.08) 0%, rgba(15, 23, 42, 0.02) 60%), url("/images/pitch-texture.svg")',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '100vh'
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
