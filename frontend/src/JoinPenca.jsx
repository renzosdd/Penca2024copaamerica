import { useState } from 'react';
import { Button, TextField, Alert } from '@mui/material';
import useLang from './useLang';

export default function JoinPenca({ onJoined }) {
  const [code, setCode] = useState('');
  const [competition, setCompetition] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { t } = useLang();

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
        setMessage(data.message || t('requestSent'));
        setCode('');
        setCompetition('');
        if (onJoined) onJoined();
      } else {
        setError(data.error || 'Error');
      }
    } catch (err) {
      setError(t('networkError'));
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
      <TextField
        label={t('code')}
        value={code}
        onChange={e => setCode(e.target.value)}
        required
        size="small"
        sx={{ mr: 1 }}
      />
      <TextField
        label={t('competition')}
        value={competition}
        onChange={e => setCompetition(e.target.value)}
        size="small"
        sx={{ mr: 1 }}
      />
      <Button variant="contained" type="submit">
        {t('join')}
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
