import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  TextField,
  Typography
} from '@mui/material';
import useLang from './useLang';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { t } = useLang();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.redirectUrl) {
        if (data.redirectUrl === '/dashboard') {
          navigate('/dashboard');
        } else if (data.redirectUrl === '/owner') {
          navigate('/owner');
        } else {
          window.location.href = data.redirectUrl;
        }
      } else {
        setError(data.error || 'Error');
      }
    } catch (err) {
      setError(t('networkError'));
    }
  };

  return (
    <Card className="login-container">
      <CardContent>
        <Typography variant="h5" gutterBottom>
          {t('loginTitle')}
        </Typography>
        <form onSubmit={handleSubmit}>
          <div className="input-field">
            <TextField
              id="login-username"
              label={t('username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              fullWidth
              margin="normal"
            />
          </div>
          <div className="input-field">
            <TextField
              id="login-password"
              label={t('password')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              margin="normal"
            />
          </div>
          <Button variant="contained" type="submit" fullWidth>
            {t('login')}
          </Button>
        </form>
        <Button
          component={Link}
          to="/register"
          variant="outlined"
          fullWidth
          style={{ marginTop: '1rem' }}
        >
          {t('register')}
        </Button>
        {error && (
          <div className="red-text" style={{ marginTop: '1rem' }}>{error}</div>
        )}
      </CardContent>
    </Card>
  );
}
