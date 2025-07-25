import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';
import Admin from './Admin';
import OwnerPanel from './OwnerPanel';
import Header from './Header';
import Footer from './Footer';
 
export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/owner" element={<OwnerPanel />} />
          <Route path="/admin/edit" element={<Admin />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </ThemeProvider>
  );
}
