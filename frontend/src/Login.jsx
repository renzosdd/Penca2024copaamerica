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
    <Container
      maxWidth="sm"
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: { xs: 'calc(100vh - 160px)', md: 'calc(100vh - 200px)' },
        py: { xs: 6, md: 10 }
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420, borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={3}>
            <Typography variant="h5" textAlign="center">
              {t('loginTitle')}
            </Typography>
            <Stack component="form" onSubmit={handleSubmit} spacing={2}>
              <TextField
                id="login-username"
                label={t('username')}
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                fullWidth
              />
              <TextField
                id="login-password"
                label={t('password')}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                fullWidth
              />
              <Button variant="contained" type="submit" fullWidth>
                {t('login')}
              </Button>
            </Stack>
            <Button component={Link} to="/register" variant="outlined" fullWidth>
              {t('register')}
            </Button>
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
