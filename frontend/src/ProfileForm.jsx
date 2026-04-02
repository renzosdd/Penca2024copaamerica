import { useState } from 'react';
import { Card, CardContent, Button, TextField, Typography, Alert } from '@mui/material';
import useLang from './useLang';

export default function ProfileForm({ user, onUpdated }) {
  const [form, setForm] = useState({
    displayName: user?.displayName || user?.name || '',
    name: user?.name || '',
    surname: user?.surname || '',
    email: user?.email || '',
    dob: user?.dob ? user.dob.slice(0, 10) : '',
    avatarUrl: user?.avatarUrl || ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { t } = useLang();

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
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

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {t('myProfile')}
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField label="Nombre público" name="displayName" value={form.displayName} onChange={handleChange} required fullWidth margin="normal" />
          <TextField label={t('name')} name="name" value={form.name} onChange={handleChange} fullWidth margin="normal" />
          <TextField label={t('surname')} name="surname" value={form.surname} onChange={handleChange} fullWidth margin="normal" />
          <TextField label={t('email')} type="email" name="email" value={form.email} onChange={handleChange} required fullWidth margin="normal" />
          <TextField label={t('birthdate')} type="date" name="dob" value={form.dob} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth margin="normal" />
          <TextField label="Avatar URL" name="avatarUrl" value={form.avatarUrl} onChange={handleChange} fullWidth margin="normal" />
          <Button variant="contained" type="submit" fullWidth>
            {t('save')}
          </Button>
        </form>
        {message && <Alert severity="success" sx={{ mt: 1 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      </CardContent>
    </Card>
  );
}
