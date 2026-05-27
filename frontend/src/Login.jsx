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
  const [notice, setNotice] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);
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

  const handleForgotSubmit = async (e) => {
    e?.preventDefault();
    setSendingReset(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/password/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail || email })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t('networkError'));
      }
      setNotice(t('resetLinkSent'));
      setShowForgot(false);
    } catch (err) {
      setError(err.message || t('networkError'));
    } finally {
      setSendingReset(false);
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
              <Button
                type="button"
                variant="text"
                size="small"
                sx={{ alignSelf: 'flex-start', px: 0 }}
                onClick={() => {
                  setForgotEmail(email);
                  setShowForgot(value => !value);
                }}
              >
                {t('forgotPassword')}
              </Button>
              {showForgot && (
                <Stack spacing={1.5}>
                  <Typography variant="body2" color="text.secondary">
                    {t('forgotPasswordHelp')}
                  </Typography>
                  <TextField
                    label={t('email')}
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleForgotSubmit();
                      }
                    }}
                    required
                    fullWidth
                    size="small"
                    autoComplete="email"
                  />
                  <Button variant="outlined" type="button" onClick={handleForgotSubmit} disabled={sendingReset}>
                    {sendingReset ? t('loading') : t('sendResetLink')}
                  </Button>
                </Stack>
              )}
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
            {notice && <Alert severity="success">{notice}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
