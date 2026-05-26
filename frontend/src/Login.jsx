import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import useLang from './useLang';
 
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLang();

  useEffect(() => {
    const authError = searchParams.get('authError');
    if (authError) {
      setError(t(`authError_${authError}`));
    }
  }, [searchParams, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
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
            <Button
              component="a"
              href="/auth/google"
              variant="outlined"
              fullWidth
              size="large"
              startIcon={<GoogleIcon />}
            >
              {t('loginWithGoogle')}
            </Button>
            <Divider>{t('or')}</Divider>
            <Stack component="form" spacing={2} onSubmit={handleSubmit}>
              <TextField
                id="login-email"
                label={t('email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
                autoComplete="email"
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
