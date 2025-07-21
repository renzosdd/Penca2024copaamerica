import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@mui/material';
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
    <header>
      <div className="container">
        <Link to="/" className="logo">
          <img src="/images/Logo.png" alt="Logo" className="logo-img" />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <LangToggle />
          {location.pathname !== '/' && (
            <Button variant="contained" color="secondary" onClick={handleLogout}>
              {t('logout')}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
