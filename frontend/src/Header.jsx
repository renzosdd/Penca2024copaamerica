import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AppBar, Box, Button, Container, Toolbar } from '@mui/material';
import useLang from './useLang';
import LangToggle from './LangToggle';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLang();

  const handleLogout = async () => {
    try {
      await fetch('/logout', { method: 'POST' });
    } catch (err) {
      // ignore errors and redirect anyway
    }
    navigate('/');
  };

  return (
    <AppBar position="sticky" color="inherit" sx={{ borderBottom: theme => `1px solid ${theme.palette.divider}` }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ justifyContent: 'space-between', gap: 2, py: 1 }}>
          <Box component={Link} to="/" sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <Box component="img" src="/images/Logo.png" alt="Penca" sx={{ height: 40, mr: 1 }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LangToggle />
            {location.pathname !== '/' && (
              <Button variant="contained" color="primary" onClick={handleLogout} size="small">
                {t('logout')}
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
