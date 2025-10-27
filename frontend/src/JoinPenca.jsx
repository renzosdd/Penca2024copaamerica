import { useState } from 'react';
import { Button, TextField, Alert, Stack, Typography, Paper, CircularProgress } from '@mui/material';
import useLang from './useLang';

export default function JoinPenca({ onJoined }) {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [details, setDetails] = useState(null);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const { t } = useLang();

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLookupError('');
    try {
      const res = await fetch('/pencas/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || t('requestSent'));
        setCode('');
        setDetails(null);
        if (onJoined) onJoined();
      } else {
        setError(data.error || 'Error');
      }
    } catch (err) {
      setError(t('networkError'));
    }
  };

  const handleLookup = async () => {
    setLookupError('');
    setMessage('');
    setDetails(null);
    if (!code.trim()) {
      setLookupError(t('pencaCodeRequired'));
      return;
    }
    setLoadingLookup(true);
    try {
      const res = await fetch(`/pencas/lookup/${encodeURIComponent(code.trim())}`);
      const data = await res.json();
      if (res.ok) {
        setDetails(data);
      } else {
        setLookupError(data.error || t('networkError'));
      }
    } catch (err) {
      setLookupError(t('networkError'));
    } finally {
      setLoadingLookup(false);
    }
  };

  return (
    <Stack component="form" onSubmit={handleSubmit} spacing={1.5} sx={{ mt: 2, maxWidth: 460 }}>
      <Typography variant="body2" color="text.secondary">
        {t('pencaLookupHint')}
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField
          label={t('code')}
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          required
          size="small"
          fullWidth
        />
        <Button
          variant="outlined"
          size="small"
          type="button"
          onClick={handleLookup}
          disabled={loadingLookup || !code.trim()}
          sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
        >
          {loadingLookup ? <CircularProgress size={18} /> : t('pencaLookupButton')}
        </Button>
      </Stack>
      <Button
        variant="contained"
        type="submit"
        size="small"
        disabled={!code.trim()}
        sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
      >
        {t('join')}
      </Button>
      {details && (
        <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2">{details.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('competition')}: {details.competition}
            </Typography>
            <Typography variant="body2">
              {t('pencaLookupOwner')}: {details.owner?.name || details.owner?.username}
            </Typography>
            <Typography variant="body2">
              {t('pencaLookupPlayers')}: {details.participantsCount}
              {details.participantLimit ? `/${details.participantLimit}` : ''}
            </Typography>
          </Stack>
        </Paper>
      )}
      {lookupError && (
        <Alert severity="warning">
          {lookupError}
        </Alert>
      )}
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
