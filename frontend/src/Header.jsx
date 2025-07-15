import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';

export default function Header() {
  const navigate = useNavigate();

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
        <Button variant="contained" color="secondary" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </header>
  );
}
