import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Snackbar,
  Alert,
  Box
} from '@mui/material';
import useLang from './useLang';

function normalizePayload(raw) {
  if (Array.isArray(raw)) {
    return { matches: raw };
  }
  return raw || {};
}

function extractMatches(data) {
  if (Array.isArray(data.matches)) {
    return data.matches;
  }
  if (Array.isArray(data.fixture)) {
    return data.fixture;
  }
  return [];
}

function buildSummary(data, matches) {
  const groups = new Set();
  const timezones = new Set();
  matches.forEach(match => {
    const group = match.group || match.group_name;
    if (group) groups.add(group);
    const tz = match.originalKickoff?.timezone || match.originalTimezone || match.timezone;
    if (tz) timezones.add(tz);
  });
  return {
    name: data.competition?.name || '',
    tournament: data.competition?.tournament || '',
    matches: matches.length,
    groups: Array.from(groups),
    timezones: Array.from(timezones)
  };
}

export default function CompetitionWizard({ open, onClose, onCreated }) {
  const { t } = useLang();
  const [importData, setImportData] = useState(null);
  const [previewMatches, setPreviewMatches] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open]);

  const reset = () => {
    setImportData(null);
    setPreviewMatches([]);
    setSummary(null);
    setError('');
    setIsSubmitting(false);
  };

  const handleFileChange = async event => {
    const file = event.target.files[0];
    setError('');
    setImportData(null);
    setPreviewMatches([]);
    setSummary(null);
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      const normalized = normalizePayload(raw);
      const matches = extractMatches(normalized);
      if (!Array.isArray(matches) || matches.length === 0) {
        setError(t('invalidJsonFile'));
        return;
      }
      setImportData(normalized);
      setPreviewMatches(matches.slice(0, 10));
      setSummary(buildSummary(normalized, matches));
    } catch (err) {
      console.error('json import error', err);
      setError(t('invalidJsonFile'));
    }
  };

  const handleSubmit = async () => {
    if (!importData) {
      setError(t('invalidJsonFile'));
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/admin/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData)
      });
      if (res.ok) {
        if (onCreated) onCreated();
        onClose();
      } else {
        const payload = await res.json().catch(() => ({}));
        setError(payload.error || t('networkError'));
      }
    } catch (err) {
      console.error('competition import error', err);
      setError(t('networkError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('importCompetition')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2">{t('importCompetitionHint')}</Typography>
        <Button component="label" variant="outlined" sx={{ mt: 2 }}>
          {t('selectJsonFile')}
          <input type="file" accept="application/json" hidden onChange={handleFileChange} />
        </Button>
        {summary && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1">{summary.name || t('competition')}</Typography>
            {summary.tournament && (
              <Typography variant="body2" sx={{ mb: 1 }}>{summary.tournament}</Typography>
            )}
            <Typography variant="body2">{t('matchesCountLabel', { count: summary.matches })}</Typography>
            <Typography variant="body2">{t('groupsCountLabel', { count: summary.groups.length })}</Typography>
            {summary.timezones.length ? (
              <Typography variant="body2">{t('timezonesDetected', { count: summary.timezones.length })}</Typography>
            ) : null}
            {previewMatches.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">{t('previewMatches')}</Typography>
                <List dense>
                  {previewMatches.map((match, index) => (
                    <ListItem key={index} disableGutters>
                      <ListItemText
                        primary={`${match.team1} vs ${match.team2}`}
                        secondary={`${match.group || match.group_name || t('seriesLabel')} · ${match.stage || match.series || ''}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('back')}</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!importData || isSubmitting}
        >
          {t('confirmImport')}
        </Button>
      </DialogActions>
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError('')} sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}
