import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
 
export default function Register() {
  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    surname: '',
    email: '',
    dob: ''
  });
  const [avatar, setAvatar] = useState(null);
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
      if (avatar) data.append('avatar', avatar);
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
                id="register-password"
                label={t('password')}
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                fullWidth
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  id="register-name"
                  label={t('name')}
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  fullWidth
                />
                <TextField
                  id="register-surname"
                  label={t('surname')}
                  name="surname"
                  value={form.surname}
                  onChange={handleChange}
                  fullWidth
                />
              </Stack>
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
                id="register-dob"
                label={t('birthdate')}
                type="date"
                name="dob"
                value={form.dob}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <Button variant="outlined" component="label" fullWidth size="large">
                {t('uploadAvatar')}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={e => setAvatar(e.target.files[0])}
                />
              </Button>
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
