import { useState } from 'react';
import { Alert, Button, Card, CardContent, Divider, Stack, TextField, Typography } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import useLang from './useLang';

export default function ProfileForm({ user, onUpdated }) {
  const [form, setForm] = useState({
    displayName: user?.displayName || user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    dob: user?.dob ? user.dob.slice(0, 10) : '',
    avatarUrl: user?.avatarUrl || ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { t } = useLang();

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handlePasswordChange = e => {
    const { name, value } = e.target;
    setPasswordForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      const res = await fetch('/profile/update', {
        method: 'POST',
        body: data
      });
      const result = await res.json();
      if (res.ok) {
        setMessage(result.message || 'OK');
        if (onUpdated) onUpdated();
      } else {
        setError(result.error || 'Error');
      }
    } catch (err) {
      setError(t('networkError'));
    }
  };

  const handlePasswordSubmit = async e => {
    e.preventDefault();
    setPasswordMessage('');
    setPasswordError('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(t('passwordsDoNotMatch'));
      return;
    }
    try {
      const res = await fetch('/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      const result = await res.json();
      if (res.ok) {
        setPasswordMessage(result.message || t('passwordUpdated'));
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        if (onUpdated) onUpdated();
      } else {
        setPasswordError(result.error || 'Error');
      }
    } catch (err) {
      setPasswordError(t('networkError'));
    }
  };

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">
            {t('myProfile')}
          </Typography>
          {!user?.hasGoogle && (
            <Button
              component="a"
              href="/auth/google/link"
              variant="outlined"
              fullWidth
              startIcon={<GoogleIcon />}
            >
              {t('linkGoogleAccount')}
            </Button>
          )}
          {user?.hasGoogle && (
            <Alert severity="success">{t('googleAccountLinked')}</Alert>
          )}
          <form onSubmit={handleSubmit}>
            <TextField label={t('fullName')} name="displayName" value={form.displayName} onChange={handleChange} required fullWidth margin="normal" />
            <TextField label={t('email')} type="email" name="email" value={form.email} onChange={handleChange} required fullWidth margin="normal" />
            <TextField label={t('phone')} name="phone" value={form.phone} onChange={handleChange} fullWidth margin="normal" autoComplete="tel" />
            <TextField label={t('birthdate')} type="date" name="dob" value={form.dob} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth margin="normal" />
            <TextField label="Avatar URL" name="avatarUrl" value={form.avatarUrl} onChange={handleChange} fullWidth margin="normal" />
            <Button variant="contained" type="submit" fullWidth>
              {t('save')}
            </Button>
          </form>
          {message && <Alert severity="success">{message}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          <Divider />
          <Stack component="form" spacing={1.5} onSubmit={handlePasswordSubmit}>
            <Typography variant="subtitle1">
              {user?.hasPassword ? t('changePassword') : t('setPassword')}
            </Typography>
            {user?.hasPassword && (
              <TextField
                label={t('currentPassword')}
                type="password"
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                required
                fullWidth
                autoComplete="current-password"
              />
            )}
            <TextField
              label={t('newPassword')}
              type="password"
              name="newPassword"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              required
              fullWidth
              autoComplete="new-password"
            />
            <TextField
              label={t('confirmPassword')}
              type="password"
              name="confirmPassword"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange}
              required
              fullWidth
              autoComplete="new-password"
            />
            <Button variant="outlined" type="submit" fullWidth>
              {user?.hasPassword ? t('changePassword') : t('setPassword')}
            </Button>
            {passwordMessage && <Alert severity="success">{passwordMessage}</Alert>}
            {passwordError && <Alert severity="error">{passwordError}</Alert>}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
