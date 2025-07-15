import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  TextField,
  Typography
} from '@mui/material';

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
      setError('Error de red');
    }
  };

  return (
    <Card className="login-container">
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Registrarse
        </Typography>
        <form onSubmit={handleSubmit}>
          <div className="input-field">
            <TextField
              id="register-username"
              label="Nombre de usuario"
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              fullWidth
              margin="normal"
            />
          </div>
          <div className="input-field">
            <TextField
              id="register-password"
              label="Contraseña"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              fullWidth
              margin="normal"
            />
          </div>
          <div className="input-field">
            <TextField
              id="register-name"
              label="Nombre"
              name="name"
              value={form.name}
              onChange={handleChange}
              fullWidth
              margin="normal"
            />
          </div>
          <div className="input-field">
            <TextField
              id="register-surname"
              label="Apellido"
              name="surname"
              value={form.surname}
              onChange={handleChange}
              fullWidth
              margin="normal"
            />
          </div>
          <div className="input-field">
            <TextField
              id="register-email"
              label="Email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              fullWidth
              margin="normal"
            />
          </div>
          <div className="input-field">
            <TextField
              id="register-dob"
              label="Fecha de nacimiento"
              type="date"
              name="dob"
              value={form.dob}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
              margin="normal"
            />
          </div>
          <div className="input-field">
            <Button variant="contained" component="label" fullWidth style={{ marginTop: '1rem', marginBottom: '1rem' }}>
              Subir Avatar
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={e => setAvatar(e.target.files[0])}
              />
            </Button>
          </div>
          <Button variant="contained" type="submit" fullWidth>
            Registrarse
          </Button>
        </form>
        {error && (
          <div className="red-text" style={{ marginTop: '1rem' }}>{error}</div>
        )}
      </CardContent>
    </Card>
  );
}
