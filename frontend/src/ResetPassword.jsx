import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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

export default function ResetPassword() {
  const { token } = useParams();
  const { t } = useLang();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t('resetPasswordInvalid'));
      }
      setNotice(t('resetPasswordSuccess'));
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || t('networkError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6 } }}>
      <Card sx={{ borderRadius: 3, boxShadow: { xs: 2, sm: 6 } }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack component="form" spacing={2} onSubmit={handleSubmit}>
            <Stack spacing={0.5}>
              <Typography variant="h5">{t('resetPasswordTitle')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('resetPasswordHelp')}
              </Typography>
            </Stack>
            <TextField
              label={t('newPassword')}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              inputProps={{ minLength: 6 }}
              autoComplete="new-password"
            />
            <TextField
              label={t('confirmPassword')}
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              inputProps={{ minLength: 6 }}
              autoComplete="new-password"
            />
            <Button variant="contained" type="submit" size="large" disabled={saving}>
              {saving ? t('loading') : t('changePassword')}
            </Button>
            <Button component={Link} to="/" variant="outlined">
              {t('login')}
            </Button>
            {notice && <Alert severity="success">{notice}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
