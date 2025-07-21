import { useState } from 'react';
import { Button, TextField, Alert } from '@mui/material';

export default function JoinPenca({ onJoined }) {
  const [code, setCode] = useState('');
  const [competition, setCompetition] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const res = await fetch('/pencas/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, competition: competition || undefined })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || 'Solicitud enviada');
        setCode('');
        setCompetition('');
        if (onJoined) onJoined();
      } else {
        setError(data.error || 'Error');
      }
    } catch (err) {
      setError('Error de red');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
      <TextField
        label="Código"
        value={code}
        onChange={e => setCode(e.target.value)}
        required
        size="small"
        sx={{ mr: 1 }}
      />
      <TextField
        label="Competencia"
        value={competition}
        onChange={e => setCompetition(e.target.value)}
        size="small"
        sx={{ mr: 1 }}
      />
      <Button variant="contained" type="submit">
        Unirse
      </Button>
      {message && (
        <Alert severity="success" sx={{ mt: 1 }}>
          {message}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
    </form>
  );
}
