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
            gap: { xs: 1.25, sm: 2 },
            py: 0,
            flexWrap: 'nowrap',
            minHeight: { xs: 72, sm: 76 }
          }}
        >
          <Box
            component={Link}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              alignSelf: 'stretch',
              textDecoration: 'none',
              flex: '1 1 auto',
              minWidth: 0
            }}
          >
            <Box
              component="img"
              src="/images/Logo.png"
              alt="Penca"
              sx={{
                height: { xs: 64, sm: 68 },
                maxHeight: '100%',
                width: 'auto',
                mr: 1
              }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 0.75, sm: 1 },
              flexWrap: 'nowrap',
              justifyContent: 'flex-end',
              flex: '0 0 auto'
            }}
          >
            <LangToggle />
            {['/dashboard', '/admin/edit'].includes(location.pathname) && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleLogout}
                size="small"
                sx={{
                  whiteSpace: 'nowrap',
                  px: { xs: 1.75, sm: 2 }
                }}
              >
                {t('logout')}
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
