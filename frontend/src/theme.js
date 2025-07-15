import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#6200ee',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#03dac6',
      contrastText: '#000000'
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff'
    },
    error: {
      main: '#b00020',
      contrastText: '#ffffff'
    },
    text: {
      primary: '#000000'
    }
  },
  shape: {
    borderRadius: 8
  },
  typography: {
    fontFamily: "'Roboto', sans-serif"
  }
});

export default theme;
