import { useState } from 'react';
import { Button, TextField, Alert, Stack } from '@mui/material';
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
    <Stack component="form" onSubmit={handleSubmit} spacing={1.5} sx={{ mt: 2, maxWidth: 420 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField
          label={t('code')}
          value={code}
          onChange={e => setCode(e.target.value)}
          required
          size="small"
          fullWidth
        />
        <TextField
          label={t('competition')}
          value={competition}
          onChange={e => setCompetition(e.target.value)}
          size="small"
          fullWidth
        />
      </Stack>
      <Button variant="contained" type="submit" size="small" sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}>
        {t('join')}
      </Button>
      {message && (
        <Alert severity="success">
          {message}
        </Alert>
      )}
      {error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}
    </Stack>
  );
}
