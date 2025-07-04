import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
      setError('Error de red');
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '2rem' }}>
      <h5>Iniciar Sesión</h5>
      <form onSubmit={handleSubmit}>
        <div className="input-field">
          <input id="login-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <label htmlFor="login-username" className="active">Nombre de usuario</label>
        </div>
        <div className="input-field">
          <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <label htmlFor="login-password" className="active">Contraseña</label>
        </div>
        <button className="btn waves-effect waves-light blue darken-3" type="submit" style={{ width: '100%' }}>Ingresar</button>
      </form>
      {error && (
        <div className="red-text" style={{ marginTop: '1rem' }}>{error}</div>
      )}
    </div>
  );
}
