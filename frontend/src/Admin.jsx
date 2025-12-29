import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import useLang from './useLang';
import { formatLocalKickoff, matchKickoffValue } from './kickoffUtils';

export default function Admin() {
  const [matches, setMatches] = useState([]);
  const [competitionName, setCompetitionName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importingFixture, setImportingFixture] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLang();

  const loadMatches = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/admin/matches');
      if (!res.ok) {
        throw new Error('matches fetch failed');
      }
      const data = await res.json();
      setCompetitionName(data.competition || '');
      setMatches(Array.isArray(data.matches) ? data.matches : []);
    } catch (err) {
      console.error('load matches error', err);
      setError(t('networkError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  const updateMatchField = (matchId, field, value) => {
    setMatches(prev =>
      prev.map(match => (match._id === matchId ? { ...match, [field]: value } : match))
    );
  };

  const handleSave = async match => {
    setSaving(true);
    setError('');
    try {
      const infoPayload = {
        team1: match.team1,
        team2: match.team2,
        date: match.date,
        time: match.time,
        group_name: match.group_name,
        series: match.series
      };
      const resInfo = await fetch(`/admin/matches/${match._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(infoPayload)
      });
      if (!resInfo.ok) {
        throw new Error('match info update failed');
      }

      const resScore = await fetch(`/admin/matches/${match._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result1: match.result1,
          result2: match.result2
        })
      });
      if (!resScore.ok) {
        throw new Error('match score update failed');
      }
    } catch (err) {
      console.error('save match error', err);
      setError(t('networkError'));
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/admin/recalculate-bracket', { method: 'POST' });
      if (!res.ok) {
        throw new Error('recalculate failed');
      }
    } catch (err) {
      console.error('recalculate error', err);
      setError(t('networkError'));
    } finally {
      setSaving(false);
    }
  };

  const handleImportFixture = async () => {
    setImportingFixture(true);
    setError('');
    try {
      const res = await fetch('/admin/import-fixture', { method: 'POST' });
      if (!res.ok) {
        throw new Error('import fixture failed');
      }
      await loadMatches();
    } catch (err) {
      console.error('import fixture error', err);
      setError(t('networkError'));
    } finally {
      setImportingFixture(false);
    }
  };

  const handleImportFixture = async () => {
    setImportingFixture(true);
    setError('');
    try {
      const res = await fetch('/admin/import-fixture', { method: 'POST' });
      if (!res.ok) {
        throw new Error('import fixture failed');
      }
      await loadMatches();
    } catch (err) {
      console.error('import fixture error', err);
      setError(t('networkError'));
    } finally {
      setImportingFixture(false);
    }
  };

  const filteredMatches = useMemo(() => {
    return [...matches]
      .sort((a, b) => matchKickoffValue(a) - matchKickoffValue(b))
  }, [matches]);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2.5, md: 4 } }}>
      <Stack spacing={{ xs: 2.5, md: 3.5 }}>
        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <Stack spacing={1}>
            <Typography variant="h5">{t('adminTitle')}</Typography>
            {competitionName && (
              <Typography variant="body2" color="text.secondary">
                {competitionName}
              </Typography>
            )}
          </Stack>
        </Paper>

        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button variant="outlined" size="small" onClick={loadMatches} disabled={loading} fullWidth>
                {t('adminMatchesRefresh')}
              </Button>
              <Button variant="outlined" size="small" onClick={handleRecalculate} disabled={saving} fullWidth>
                {t('recalculateBracket')}
              </Button>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="contained"
                size="small"
                onClick={handleImportFixture}
                disabled={importingFixture}
                fullWidth
              >
                {importingFixture ? <CircularProgress size={18} /> : t('importFixture')}
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleImportFixture}
                disabled={importingFixture}
                fullWidth
              >
                {importingFixture ? <CircularProgress size={18} /> : t('importFixture')}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {loading && <CircularProgress sx={{ alignSelf: 'center' }} />}

        {error && (
          <Alert severity="error" sx={{ maxWidth: 480 }}>
            {error}
          </Alert>
        )}

        {!loading && filteredMatches.length === 0 && (
          <Alert severity="info">{t('adminMatchesNoResults')}</Alert>
        )}

        <Stack spacing={2.5}>
          {filteredMatches.map(match => (
            <Paper key={match._id} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
              <Stack spacing={2}>
                <Typography variant="subtitle2" color="text.secondary">
                  {formatLocalKickoff(match) || t('scheduleTbd')}
                </Typography>
                <Stack spacing={1.5}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      label={t('team1Label')}
                      value={match.team1 || ''}
                      onChange={e => updateMatchField(match._id, 'team1', e.target.value)}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label={t('team2Label')}
                      value={match.team2 || ''}
                      onChange={e => updateMatchField(match._id, 'team2', e.target.value)}
                      size="small"
                      fullWidth
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      label={t('dateLabel')}
                      value={match.date || ''}
                      onChange={e => updateMatchField(match._id, 'date', e.target.value)}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label={t('timeLabel')}
                      value={match.time || ''}
                      onChange={e => updateMatchField(match._id, 'time', e.target.value)}
                      size="small"
                      fullWidth
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      label={t('group')}
                      value={match.group_name || ''}
                      onChange={e => updateMatchField(match._id, 'group_name', e.target.value)}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label={t('seriesLabel')}
                      value={match.series || ''}
                      onChange={e => updateMatchField(match._id, 'series', e.target.value)}
                      size="small"
                      fullWidth
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      label={t('scoreTeam1Label')}
                      type="number"
                      value={match.result1 ?? ''}
                      onChange={e => updateMatchField(match._id, 'result1', e.target.value)}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label={t('scoreTeam2Label')}
                      type="number"
                      value={match.result2 ?? ''}
                      onChange={e => updateMatchField(match._id, 'result2', e.target.value)}
                      size="small"
                      fullWidth
                    />
                  </Stack>
                </Stack>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => handleSave(match)}
                  disabled={saving}
                  fullWidth
                >
                  {saving ? <CircularProgress size={18} /> : t('save')}
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
