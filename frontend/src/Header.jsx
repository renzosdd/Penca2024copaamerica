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
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{ borderBottom: theme => `1px solid ${theme.palette.divider}`, backdropFilter: 'blur(10px)' }}
    >
      <Container maxWidth="lg">
        <Toolbar
          disableGutters
          sx={{
            justifyContent: 'space-between',
            gap: 2,
            py: 1,
            flexWrap: 'wrap',
            rowGap: 1.5,
            minHeight: 'auto'
          }}
        >
          <Box
            component={Link}
            to="/"
            sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexGrow: { xs: 1, sm: 0 } }}
          >
            <Box component="img" src="/images/Logo.png" alt="Penca" sx={{ height: { xs: 32, sm: 40 }, mr: 1 }} />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
              width: { xs: '100%', sm: 'auto' }
            }}
          >
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
