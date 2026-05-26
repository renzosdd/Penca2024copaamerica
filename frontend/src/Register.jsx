import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
 
export default function Register() {
  const [form, setForm] = useState({
    username: '',
    displayName: '',
    password: '',
    email: '',
    phone: '',
    dob: '',
    avatarUrl: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { t } = useLang();

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      const res = await fetch('/register', {
        method: 'POST',
        body: data
      });
      const result = await res.json();
      if (res.ok && result.redirectUrl) {
        navigate(result.redirectUrl);
      } else {
        setError(result.error || 'Error');
      }
    } catch (err) {
      setError(t('networkError'));
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6 } }}>
      <Card sx={{ borderRadius: 3, boxShadow: { xs: 2, sm: 6 } }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={2.5}>
            <Stack spacing={0.5}>
              <Typography variant="h5">{t('registerTitle')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('register')}
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
              {t('registerWithGoogle')}
            </Button>
            <Divider>{t('or')}</Divider>
            <Stack component="form" spacing={2} onSubmit={handleSubmit}>
              <TextField
                id="register-username"
                label={t('username')}
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                fullWidth
              />
              <TextField
                id="register-display-name"
                label={t('fullName')}
                name="displayName"
                value={form.displayName}
                onChange={handleChange}
                required
                fullWidth
              />
              <TextField
                id="register-password"
                label={t('password')}
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                fullWidth
              />
              <TextField
                id="register-email"
                label={t('email')}
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                fullWidth
              />
              <TextField
                id="register-phone"
                label={t('phone')}
                name="phone"
                value={form.phone}
                onChange={handleChange}
                fullWidth
                autoComplete="tel"
              />
              <TextField
                id="register-dob"
                label={t('birthdate')}
                type="date"
                name="dob"
                value={form.dob}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                id="register-avatar-url"
                label="Avatar URL"
                name="avatarUrl"
                value={form.avatarUrl}
                onChange={handleChange}
                fullWidth
              />
              <Button variant="contained" type="submit" fullWidth size="large">
                {t('register')}
              </Button>
            </Stack>
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
