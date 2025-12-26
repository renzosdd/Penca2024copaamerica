import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
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
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6 } }}>
      <Card sx={{ borderRadius: 3, boxShadow: { xs: 2, sm: 6 } }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <Typography variant="h5">{t('loginTitle')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('login')}
              </Typography>
            </Stack>
            <Stack component="form" spacing={2} onSubmit={handleSubmit}>
              <TextField
                id="login-username"
                label={t('username')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                fullWidth
                autoComplete="username"
              />
              <TextField
                id="login-password"
                label={t('password')}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                autoComplete="current-password"
              />
              <Button variant="contained" type="submit" fullWidth size="large">
                {t('login')}
              </Button>
            </Stack>
            <Button
              component={Link}
              to="/register"
              variant="outlined"
              fullWidth
              size="large"
            >
              {t('register')}
            </Button>
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
