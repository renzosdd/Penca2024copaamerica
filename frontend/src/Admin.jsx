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
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import SportsScoreIcon from '@mui/icons-material/SportsScore';
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
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await res.json();
      return body?.error || body?.message || 'request failed';
    }
    const text = await res.text();
    return text || 'request failed';
  } catch {
    return 'request failed';
  }
}

export default function Admin() {
  const [tab, setTab] = useState('results');
  const [matches, setMatches] = useState([]);
  const [competitionName, setCompetitionName] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingMatchId, setSavingMatchId] = useState('');
  const [recalculating, setRecalculating] = useState(false);
  const [clearingMatches, setClearingMatches] = useState(false);
  const [users, setUsers] = useState({ pending: [], approved: [], rejected: [], disabled: [] });
  const [missingSummary, setMissingSummary] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingMissing, setLoadingMissing] = useState(false);
  const [actingUserId, setActingUserId] = useState('');
  const [resettingFixture, setResettingFixture] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
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
      setError(err.message || t('networkError'));
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/admin/users');
      if (!res.ok) {
        throw new Error(await responseError(res));
      }
      setUsers(await res.json());
    } catch (err) {
      console.error('load users error', err);
      setError(err.message || t('networkError'));
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadMissingSummary = async () => {
    setLoadingMissing(true);
    try {
      const res = await fetch('/admin/missing');
      if (!res.ok) {
        throw new Error(await responseError(res));
      }
      setMissingSummary(await res.json());
    } catch (err) {
      console.error('load missing summary error', err);
      setError(err.message || t('networkError'));
    } finally {
      setLoadingMissing(false);
    }
  };

  useEffect(() => {
    loadMatches();
    loadUsers();
    loadMissingSummary();
  }, []);

  const updateMatchField = (matchId, field, value) => {
    setMatches(prev =>
      prev.map(match => (match._id === matchId ? { ...match, [field]: value } : match))
    );
  };

  const runUserAction = async (userId, action) => {
    if (action === 'delete' && !window.confirm(t('adminDeleteUserConfirm'))) {
      return;
    }
    if (action === 'disable' && !window.confirm(t('adminDisableUserConfirm'))) {
      return;
    }
    setActingUserId(userId);
    setError('');
    setNotice('');
    try {
      const method = action === 'delete' ? 'DELETE' : 'POST';
      const res = await fetch(`/admin/users/${userId}/${action}`, { method });
      if (!res.ok) {
        throw new Error(await responseError(res));
      }
      const data = await res.json();
      const messageByAction = {
        approve: t('adminUserApproved', { emailStatus: data.emailSent ? t('emailSent') : t('emailNotConfigured') }),
        reject: t('adminUserRejected'),
        disable: t('adminUserDisabled'),
        delete: t('adminUserDeleted'),
        'password-reset': t('adminPasswordResetSent', { emailStatus: data.emailSent ? t('emailSent') : t('emailNotConfigured') })
      };
      setNotice(messageByAction[action] || t('adminUserUpdated'));
      await Promise.all([loadUsers(), loadMatches(), loadMissingSummary()]);
    } catch (err) {
      console.error('user approval error', err);
      setError(err.message || t('networkError'));
    } finally {
      setActingUserId('');
    }
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
          result2: match.result2,
          penaltyWinner: match.penaltyWinner || null
        })
      });
      if (!res.ok) {
        throw new Error(await responseError(res));
      }
      setNotice(t('adminResultSaved'));
      await loadMatches();
    } catch (err) {
      console.error('save match error', err);
      setError(err.message || t('networkError'));
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
      setError(err.message || t('networkError'));
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
      setError(err.message || t('networkError'));
    } finally {
      setClearingMatches(false);
    }
  };

  const handleResetFixture = async () => {
    const confirmation = window.prompt(t('adminResetFixturePrompt'));
    if (confirmation !== 'REINICIAR') {
      setError(t('adminResetFixtureCancelled'));
      return;
    }
    setResettingFixture(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/admin/matches/reset-fixture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation })
      });
      if (!res.ok) {
        throw new Error(await responseError(res));
      }
      const data = await res.json();
      setNotice(t('adminResetFixtureSuccess', { count: data.importedMatches || 0 }));
      await Promise.all([loadMatches(), loadMissingSummary()]);
    } catch (err) {
      console.error('reset fixture error', err);
      setError(err.message || t('networkError'));
    } finally {
      setResettingFixture(false);
    }
  };

  const handleSendReminders = async () => {
    setSendingReminders(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/admin/reminders/missing-predictions', { method: 'POST' });
      if (!res.ok) {
        throw new Error(await responseError(res));
      }
      const data = await res.json();
      setNotice(t('adminRemindersSent', { sent: data.sent || 0, total: data.total || 0 }));
    } catch (err) {
      console.error('send reminders error', err);
      setError(err.message || t('networkError'));
    } finally {
      setSendingReminders(false);
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
  const approvedCount = users.approved?.length || 0;
  const accountRows = useMemo(() => {
    const withStatus = status => player => ({ ...player, approvalStatus: player.approvalStatus || status });
    return [
      ...(users.pending || []).map(withStatus('pending')),
      ...(users.approved || []).map(withStatus('approved')),
      ...(users.disabled || []).map(withStatus('disabled')),
      ...(users.rejected || []).map(withStatus('rejected'))
    ];
  }, [users]);
  const pendingUsers = users.pending || [];
  const playersMissing = missingSummary?.playersMissing || [];
  const closingSoon = missingSummary?.closingSoon || [];
  const withoutResult = missingSummary?.withoutResult || [];

  function isKnockoutMatch(match) {
    const group = String(match?.group_name || '');
    return group && !group.startsWith('Grupo');
  }

  function needsPenaltyWinner(match) {
    return isKnockoutMatch(match) &&
      match.result1 !== '' &&
      match.result1 !== null &&
      match.result1 !== undefined &&
      match.result2 !== '' &&
      match.result2 !== null &&
      match.result2 !== undefined &&
      Number(match.result1) === Number(match.result2);
  }

  function statusChipProps(status) {
    if (status === 'approved') return { color: 'success', label: t('adminStatusApproved') };
    if (status === 'disabled') return { color: 'error', label: t('adminStatusDisabled') };
    if (status === 'rejected') return { color: 'default', label: t('adminStatusRejected') };
    return { color: 'warning', label: t('adminStatusPending') };
  }

  const tabLabel = key => (
    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
      {t(key)}
    </Box>
  );

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
              <Chip color="primary" variant="outlined" label={t('adminApprovedUsers', { count: approvedCount })} />
            </Stack>
          </Stack>
        </Paper>

        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            variant="fullWidth"
            aria-label={t('adminTabsLabel')}
            sx={{
              minHeight: 58,
              '& .MuiTab-root': {
                minHeight: 58,
                px: { xs: 0.5, sm: 2 },
                fontSize: { xs: 11, sm: 14 }
              },
              '& .MuiTab-iconWrapper': {
                mb: { xs: 0, sm: 0.5 }
              }
            }}
          >
            <Tab value="results" icon={<SportsScoreIcon />} label={tabLabel('adminTabResults')} aria-label={t('adminTabResults')} />
            <Tab value="accounts" icon={<ManageAccountsIcon />} label={tabLabel('adminTabAccounts')} aria-label={t('adminTabAccounts')} />
            <Tab value="reminders" icon={<NotificationsActiveIcon />} label={tabLabel('adminTabReminders')} aria-label={t('adminTabReminders')} />
            <Tab value="tools" icon={<SettingsSuggestIcon />} label={tabLabel('adminTabTools')} aria-label={t('adminTabTools')} />
          </Tabs>
        </Paper>

        {tab === 'accounts' && (
        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
              <Box>
                <Typography variant="h6">{t('adminAccountsTitle')}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('adminApprovalsHelp')}
                </Typography>
              </Box>
              <Button variant="outlined" size="small" onClick={loadUsers} disabled={loadingUsers}>
                {loadingUsers ? <CircularProgress size={18} /> : t('adminMatchesRefresh')}
              </Button>
            </Stack>
            {pendingUsers.length > 0 && <Alert severity="warning">{t('adminPendingUsersCount', { count: pendingUsers.length })}</Alert>}
            {accountRows.length === 0 ? (
              <Alert severity="info">{t('adminNoUsers')}</Alert>
            ) : (
              <Stack spacing={1}>
                {accountRows.map(player => {
                  const chip = statusChipProps(player.approvalStatus);
                  return (
                  <Box
                    key={player._id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: { xs: 1.5, sm: 2 }
                    }}
                  >
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', mb: 0.5 }}>
                          <Typography variant="subtitle1">{player.displayName || player.username}</Typography>
                          <Chip size="small" variant="outlined" {...chip} />
                          {player.hasGoogle && <Chip size="small" label={t('adminLoginGoogle')} />}
                          {player.hasPassword && <Chip size="small" label={t('adminLoginPassword')} />}
                        </Stack>
                        <Typography variant="body2" color="text.secondary">{player.email}</Typography>
                      </Box>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', md: 'auto' } }}>
                        {player.approvalStatus !== 'approved' && (
                          <Button
                            variant="contained"
                            size="small"
                            disabled={Boolean(actingUserId)}
                            onClick={() => runUserAction(player._id, 'approve')}
                          >
                            {actingUserId === player._id ? <CircularProgress size={18} /> : t('approve')}
                          </Button>
                        )}
                        {player.approvalStatus === 'approved' && (
                          <Button
                            variant="outlined"
                            color="warning"
                            size="small"
                            disabled={Boolean(actingUserId)}
                            onClick={() => runUserAction(player._id, 'disable')}
                          >
                            {t('adminDisableUser')}
                          </Button>
                        )}
                        <Button
                          variant="outlined"
                          size="small"
                          disabled={Boolean(actingUserId)}
                          onClick={() => runUserAction(player._id, 'password-reset')}
                        >
                          {t('adminSendPasswordReset')}
                        </Button>
                        {player.approvalStatus === 'pending' && (
                          <Button
                            variant="outlined"
                            color="warning"
                            size="small"
                            disabled={Boolean(actingUserId)}
                            onClick={() => runUserAction(player._id, 'reject')}
                          >
                            {t('adminRejectUser')}
                          </Button>
                        )}
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          disabled={Boolean(actingUserId)}
                          onClick={() => runUserAction(player._id, 'delete')}
                        >
                          {t('remove')}
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                  );
                })}
              </Stack>
            )}
          </Stack>
        </Paper>
        )}

        {tab === 'tools' && (
        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6">{t('adminToolsTitle')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('adminToolsHelp')}
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
              <Button
                variant="contained"
                size="small"
                color="error"
                onClick={handleResetFixture}
                disabled={resettingFixture}
                fullWidth
              >
                {resettingFixture ? <CircularProgress size={18} /> : t('adminResetFixture')}
              </Button>
            </Stack>
          </Stack>
        </Paper>
        )}

        {tab === 'reminders' && (
        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between">
              <Box>
                <Typography variant="h6">{t('adminMissingTitle')}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('adminMissingHelp')}
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button variant="outlined" size="small" onClick={loadMissingSummary} disabled={loadingMissing}>
                  {loadingMissing ? <CircularProgress size={18} /> : t('adminMatchesRefresh')}
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSendReminders}
                  disabled={sendingReminders || playersMissing.length === 0}
                >
                  {sendingReminders ? <CircularProgress size={18} /> : t('adminSendReminders')}
                </Button>
              </Stack>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Chip color="warning" variant="outlined" label={t('adminMissingPlayers', { count: playersMissing.length })} />
              <Chip label={t('adminClosingSoon', { count: closingSoon.length })} />
              <Chip color="error" variant="outlined" label={t('adminWithoutResult', { count: withoutResult.length })} />
            </Stack>
            {playersMissing.length > 0 && (
              <Stack spacing={1}>
                {playersMissing.slice(0, 8).map(player => (
                  <Box
                    key={player._id}
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}
                  >
                    <Typography variant="subtitle2">{player.displayName || player.username}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('adminPlayerMissingLine', {
                        missing: player.missingCount,
                        total: player.openCount
                      })}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        </Paper>
        )}

        {tab === 'results' && (
        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
              <Box>
                <Typography variant="h6">{t('adminResultsTitle')}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('adminResultsHelp')}
                </Typography>
              </Box>
              <Button variant="outlined" size="small" onClick={loadMatches} disabled={loading}>
                {loading ? <CircularProgress size={18} /> : t('adminMatchesRefresh')}
              </Button>
            </Stack>
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
        )}

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

        {tab === 'results' && loading && <CircularProgress sx={{ alignSelf: 'center' }} />}

        {tab === 'results' && !loading && matches.length === 0 && (
          <Alert severity="info">{t('adminMatchesNoResults')}</Alert>
        )}

        {tab === 'results' && !loading && matches.length > 0 && filteredMatches.length === 0 && (
          <Alert severity="info">{t('adminMatchesNoFilteredResults')}</Alert>
        )}

        {tab === 'results' && (
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
                        <Stack spacing={1.25}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                            <Chip
                              size="small"
                              color={loaded ? 'success' : 'default'}
                              label={loaded ? t('adminMatchLoaded') : t('adminMatchPending')}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {formatLocalKickoff(match) || t('scheduleTbd')}
                            </Typography>
                            {match.venue?.city && (
                              <Typography variant="caption" color="text.secondary">
                                {match.venue.city}
                              </Typography>
                            )}
                          </Stack>
                          <Stack spacing={0.75}>
                            <Stack direction="row" spacing={1.25} alignItems="center">
                              <Typography variant="subtitle1" sx={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
                                {match.team1 || t('team1Label')}
                              </Typography>
                              <TextField
                                label={t('result')}
                                type="number"
                                value={match.result1 ?? ''}
                                onChange={e => updateMatchField(match._id, 'result1', e.target.value)}
                                size="small"
                                inputProps={{ min: 0, inputMode: 'numeric' }}
                                InputProps={{ sx: { '& input': { textAlign: 'center' } } }}
                                sx={{ width: { xs: 82, sm: 96 } }}
                              />
                            </Stack>
                            <Typography variant="caption" color="text.secondary" sx={{ pl: 0.25 }}>
                              {t('vs')}
                            </Typography>
                            <Stack direction="row" spacing={1.25} alignItems="center">
                              <Typography variant="subtitle1" sx={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
                                {match.team2 || t('team2Label')}
                              </Typography>
                              <TextField
                                label={t('result')}
                                type="number"
                                value={match.result2 ?? ''}
                                onChange={e => updateMatchField(match._id, 'result2', e.target.value)}
                                size="small"
                                inputProps={{ min: 0, inputMode: 'numeric' }}
                                InputProps={{ sx: { '& input': { textAlign: 'center' } } }}
                                sx={{ width: { xs: 82, sm: 96 } }}
                              />
                            </Stack>
                          </Stack>
                          {needsPenaltyWinner(match) && (
                            <TextField
                              select
                              label={t('penaltyWinnerLabel')}
                              value={match.penaltyWinner || ''}
                              onChange={e => updateMatchField(match._id, 'penaltyWinner', e.target.value)}
                              size="small"
                              required
                              sx={{ width: { xs: '100%', md: 220 } }}
                            >
                              <MenuItem value="team1">{match.team1 || t('team1Label')}</MenuItem>
                              <MenuItem value="team2">{match.team2 || t('team2Label')}</MenuItem>
                            </TextField>
                          )}

                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleSave(match)}
                            disabled={Boolean(savingMatchId)}
                            sx={{ width: { xs: '100%', sm: 180 }, alignSelf: { sm: 'flex-end' } }}
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
        )}
      </Stack>
    </Container>
  );
}
