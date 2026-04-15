import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import useLang from './useLang';
import { formatLocalKickoff, matchKickoffValue } from './kickoffUtils';

function scoreLoaded(match) {
  return match.result1 !== null && match.result1 !== undefined && match.result2 !== null && match.result2 !== undefined;
}

function matchOrderValue(match) {
  const order = Number(match.order);
  return Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER;
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function matchDateValue(match) {
  if (match.originalDate) return match.originalDate;
  if (match.date) return match.date;
  const kickoff = match.kickoff ? new Date(match.kickoff) : null;
  if (kickoff && !Number.isNaN(kickoff.getTime())) {
    return kickoff.toISOString().slice(0, 10);
  }
  return '';
}

async function responseError(res) {
  try {
    const body = await res.json();
    return body?.error || body?.message || 'request failed';
  } catch {
    return 'request failed';
  }
}

export default function Admin() {
  const [matches, setMatches] = useState([]);
  const [competitionName, setCompetitionName] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingMatchId, setSavingMatchId] = useState('');
  const [recalculating, setRecalculating] = useState(false);
  const [clearingMatches, setClearingMatches] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const { t } = useLang();

  const loadMatches = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/admin/matches');
      if (!res.ok) {
        throw new Error(await responseError(res));
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
    setSavingMatchId(match._id);
    setError('');
    setNotice('');
    try {
      const res = await fetch(`/admin/matches/${match._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result1: match.result1,
          result2: match.result2
        })
      });
      if (!res.ok) {
        throw new Error(await responseError(res));
      }
      setNotice(t('adminResultSaved'));
      await loadMatches();
    } catch (err) {
      console.error('save match error', err);
      setError(t('networkError'));
    } finally {
      setSavingMatchId('');
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/admin/recalculate-bracket', { method: 'POST' });
      if (!res.ok) {
        throw new Error(await responseError(res));
      }
      setNotice(t('adminBracketRecalculated'));
      await loadMatches();
    } catch (err) {
      console.error('recalculate error', err);
      setError(t('networkError'));
    } finally {
      setRecalculating(false);
    }
  };

  const handleClearMatches = async () => {
    if (!window.confirm(t('adminClearMatchesConfirm'))) {
      return;
    }
    setClearingMatches(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/admin/matches/clear', { method: 'POST' });
      if (!res.ok) {
        throw new Error(await responseError(res));
      }
      const data = await res.json();
      setNotice(t('adminClearMatchesSuccess', { count: data.deleted || 0 }));
      setMatches([]);
    } catch (err) {
      console.error('clear matches error', err);
      setError(t('networkError'));
    } finally {
      setClearingMatches(false);
    }
  };

  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      const orderDiff = matchOrderValue(a) - matchOrderValue(b);
      if (orderDiff !== 0) return orderDiff;
      return matchKickoffValue(a) - matchKickoffValue(b);
    });
  }, [matches]);

  const groupOptions = useMemo(() => {
    const groups = new Set();
    for (const match of matches) {
      if (match.group_name) {
        groups.add(match.group_name);
      }
    }
    return Array.from(groups).sort((a, b) => a.localeCompare(b, 'es'));
  }, [matches]);

  const filteredMatches = useMemo(() => {
    const normalizedSearch = normalizeText(search);
    return sortedMatches.filter(match => {
      if (dateFilter && matchDateValue(match) !== dateFilter) {
        return false;
      }
      if (groupFilter && match.group_name !== groupFilter) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const haystack = [
        match.team1,
        match.team2,
        match.group_name,
        match.series,
        match.venue?.country,
        match.venue?.city,
        match.venue?.stadium,
        matchDateValue(match)
      ]
        .map(normalizeText)
        .join(' ');
      return haystack.includes(normalizedSearch);
    });
  }, [dateFilter, groupFilter, search, sortedMatches]);

  const groupedMatches = useMemo(() => {
    const groups = new Map();
    for (const match of filteredMatches) {
      const key = match.group_name || t('otherMatches');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(match);
    }
    return Array.from(groups.entries()).map(([title, items]) => ({ title, items }));
  }, [filteredMatches, t]);

  const loadedCount = useMemo(() => matches.filter(scoreLoaded).length, [matches]);
  const pendingCount = matches.length - loadedCount;
  const hasActiveFilters = Boolean(search || dateFilter || groupFilter);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 4 } }}>
      <Stack spacing={{ xs: 2.5, md: 3 }}>
        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
            <Stack spacing={0.5}>
              <Typography variant="h5">{t('adminTitle')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {competitionName || t('adminMatchesNoCompetition')}
              </Typography>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Chip label={t('adminMatchesTotal', { count: matches.length })} />
              <Chip color="success" label={t('adminMatchesLoaded', { count: loadedCount })} />
              <Chip color="warning" variant="outlined" label={t('adminMatchesPending', { count: pendingCount })} />
            </Stack>
          </Stack>
        </Paper>

        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6">{t('adminResultsTitle')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('adminResultsHelp')}
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button variant="outlined" size="small" onClick={loadMatches} disabled={loading} fullWidth>
                {loading ? <CircularProgress size={18} /> : t('adminMatchesRefresh')}
              </Button>
              <Button variant="outlined" size="small" onClick={handleRecalculate} disabled={recalculating} fullWidth>
                {recalculating ? <CircularProgress size={18} /> : t('recalculateBracket')}
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="error"
                onClick={handleClearMatches}
                disabled={clearingMatches}
                fullWidth
              >
                {clearingMatches ? <CircularProgress size={18} /> : t('adminClearMatches')}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                label={t('adminMatchesSearch')}
                placeholder={t('adminMatchesSearchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label={t('adminMatchesDateFilter')}
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: { md: 180 } }}
              />
              <TextField
                select
                label={t('adminMatchesGroupFilter')}
                value={groupFilter}
                onChange={e => setGroupFilter(e.target.value)}
                size="small"
                sx={{ minWidth: { md: 220 } }}
              >
                <MenuItem value="">{t('allMatches')}</MenuItem>
                {groupOptions.map(group => (
                  <MenuItem key={group} value={group}>
                    {group}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                {t('adminMatchesFiltered', { count: filteredMatches.length })}
              </Typography>
              <Button
                size="small"
                variant="text"
                disabled={!hasActiveFilters}
                onClick={() => {
                  setSearch('');
                  setDateFilter('');
                  setGroupFilter('');
                }}
              >
                {t('adminMatchesClearFilters')}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ maxWidth: 560 }}>
            {error}
          </Alert>
        )}

        {notice && (
          <Alert severity="success" sx={{ maxWidth: 560 }}>
            {notice}
          </Alert>
        )}

        {loading && <CircularProgress sx={{ alignSelf: 'center' }} />}

        {!loading && matches.length === 0 && (
          <Alert severity="info">{t('adminMatchesNoResults')}</Alert>
        )}

        {!loading && matches.length > 0 && filteredMatches.length === 0 && (
          <Alert severity="info">{t('adminMatchesNoFilteredResults')}</Alert>
        )}

        <Stack spacing={2.5}>
          {groupedMatches.map(group => (
            <Paper key={group.title} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2 }}>
              <Stack spacing={1.5}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
                  <Typography variant="h6">{group.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('adminMatchesTotal', { count: group.items.length })}
                  </Typography>
                </Stack>

                <Stack spacing={1.25}>
                  {group.items.map(match => {
                    const isSaving = savingMatchId === match._id;
                    const loaded = scoreLoaded(match);
                    return (
                      <Box
                        key={match._id}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          p: { xs: 1.5, sm: 2 }
                        }}
                      >
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75, flexWrap: 'wrap' }}>
                              <Chip
                                size="small"
                                color={loaded ? 'success' : 'default'}
                                label={loaded ? t('adminMatchLoaded') : t('adminMatchPending')}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {formatLocalKickoff(match) || t('scheduleTbd')}
                              </Typography>
                            </Stack>
                            <Typography variant="subtitle1" sx={{ overflowWrap: 'anywhere' }}>
                              {match.team1 || t('team1Label')} {t('vs')} {match.team2 || t('team2Label')}
                            </Typography>
                            {match.venue?.city && (
                              <Typography variant="body2" color="text.secondary">
                                {match.venue.city}
                              </Typography>
                            )}
                          </Box>

                          <Stack direction="row" spacing={1} alignItems="center" sx={{ width: { xs: '100%', md: 250 } }}>
                            <TextField
                              label={t('scoreTeam1Label')}
                              type="number"
                              value={match.result1 ?? ''}
                              onChange={e => updateMatchField(match._id, 'result1', e.target.value)}
                              size="small"
                              inputProps={{ min: 0 }}
                              fullWidth
                            />
                            <Typography color="text.secondary">-</Typography>
                            <TextField
                              label={t('scoreTeam2Label')}
                              type="number"
                              value={match.result2 ?? ''}
                              onChange={e => updateMatchField(match._id, 'result2', e.target.value)}
                              size="small"
                              inputProps={{ min: 0 }}
                              fullWidth
                            />
                          </Stack>

                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleSave(match)}
                            disabled={Boolean(savingMatchId)}
                            sx={{ width: { xs: '100%', md: 160 } }}
                          >
                            {isSaving ? <CircularProgress size={18} /> : t('adminSaveResult')}
                          </Button>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
