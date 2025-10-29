import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import StageAccordionList from './StageAccordionList';
import useLang from './useLang';
import { OTHER_STAGE_KEY } from './stageOrdering';
import { formatLocalKickoff, matchKickoffValue } from './kickoffUtils';

export default function OwnerPanel() {
  const [pencas, setPencas] = useState([]);
  const [rankings, setRankings] = useState({});
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const { t } = useLang();
  const [filter, setFilter] = useState('all');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const matchTimeValue = match => matchKickoffValue(match);

  const matchesByPenca = useMemo(() => {
    const result = {};
    pencas.forEach(p => {
      let list = [];
      if (Array.isArray(p.fixture) && p.fixture.length) {
        const fixtureSet = new Set(p.fixture.map(String));
        list = matches.filter(m => fixtureSet.has(String(m._id)));
      } else {
        list = matches.filter(m => m.competition === p.competition);
      }
      const sorted = [...list].sort((a, b) => matchTimeValue(a) - matchTimeValue(b));
      const filteredList = sorted.filter(match => {
        if (filter === 'upcoming') {
          return match.result1 == null && match.result2 == null;
        }
        if (filter === 'played') {
          return match.result1 != null && match.result2 != null;
        }
        return true;
      });
      result[p._id] = filteredList;
    });
    return result;
  }, [filter, matches, pencas]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    async function loadMatches() {
      try {
        const comps = Array.from(new Set(pencas.map(p => p.competition).filter(Boolean)));
        if (!comps.length) {
          setMatches([]);
          return;
        }
        setMatchesLoading(true);
        const fetched = await Promise.all(
          comps.map(async c => {
            try {
              const r = await fetch(`/competitions/${encodeURIComponent(c)}/matches`);
              if (r.ok) {
                return r.json();
              }
            } catch (error) {
              console.error('load matches error', error);
            }
            return [];
          })
        );
        setMatches(fetched.flat());
      } catch (err) {
        console.error('load matches error', err);
      } finally {
        setMatchesLoading(false);
      }
    }
    if (pencas.length) {
      loadMatches();
    } else {
      setMatches([]);
    }
  }, [pencas]);

  async function loadData() {
    try {
      const res = await fetch('/api/owner');
      if (res.ok) {
        const data = await res.json();
        setPencas(data.pencas || []);
        (data.pencas || []).forEach(p => loadRanking(p._id));
      }
    } catch (err) {
      console.error('owner panel fetch error', err);
    }
  }

  async function loadRanking(id) {
    try {
      const res = await fetch(`/ranking?pencaId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setRankings(r => ({ ...r, [id]: data }));
      }
    } catch (err) {
      console.error('ranking error', err);
    }
  }

  async function approve(pId, uId) {
    try {
      const res = await fetch(`/pencas/approve/${pId}/${uId}`, { method: 'POST' });
      if (res.ok) loadData();
    } catch (err) {
      console.error('approve error', err);
    }
  }

  async function removeParticipant(pId, uId) {
    try {
      const res = await fetch(`/pencas/participant/${pId}/${uId}`, { method: 'DELETE' });
      if (res.ok) loadData();
    } catch (err) {
      console.error('remove participant error', err);
    }
  }

  const sanitizeScoring = scoring => ({
    exact: Number(scoring?.exact) || 0,
    outcome: Number(scoring?.outcome) || 0,
    goalDifference: Number(scoring?.goalDifference) || 0,
    teamGoals: Number(scoring?.teamGoals) || 0,
    cleanSheet: Number(scoring?.cleanSheet) || 0
  });

  const autoRules = scoring => {
    const s = sanitizeScoring(scoring);
    return [
      `• ${s.exact} ${t('ruleExact')}`,
      `• ${s.outcome} ${t('ruleOutcome')}`,
      `• ${s.goalDifference} ${t('ruleGoalDifference')}`,
      `• ${s.teamGoals} ${t('ruleTeamGoals')}`,
      `• ${s.cleanSheet} ${t('ruleCleanSheet')}`
    ].join('\n');
  };

  const updateField = (id, field, value) => {
    setPencas(ps => ps.map(p => (p._id === id ? { ...p, [field]: value } : p)));
  };

  const updateScoring = (id, key, val) => {
    setPencas(ps =>
      ps.map(p => {
        if (p._id !== id) return p;
        const scoring = sanitizeScoring({ ...p.scoring, [key]: val });
        return { ...p, scoring, rules: autoRules(scoring) };
      })
    );
  };

  async function saveInfo(id) {
    const penca = pencas.find(p => p._id === id);
    if (!penca) return;
    try {
      const res = await fetch(`/pencas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: penca.rules, prizes: penca.prizes, scoring: penca.scoring })
      });
      if (res.ok) loadData();
    } catch (err) {
      console.error('save info error', err);
    }
  }

  async function togglePublic(pId, value) {
    try {
      const res = await fetch(`/pencas/${pId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: value })
      });
      if (res.ok) loadData();
    } catch (err) {
      console.error('toggle public error', err);
    }
  }

  const renderOwnerTeam = name => (
    <Stack direction="row" spacing={1} alignItems="center" key={name} sx={{ minWidth: 0 }}>
      <Box
        component="img"
        src={`/images/${name.replace(/\s+/g, '').toLowerCase()}.png`}
        alt={name}
        sx={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'contain', backgroundColor: 'background.default' }}
      />
      <Typography variant="subtitle2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
        {name}
      </Typography>
    </Stack>
  );

  const formatOwnerKickoff = match => {
    const localized = formatLocalKickoff(match);
    if (localized) return localized;
    if (match.date && match.time) return `${match.date} ${match.time}`;
    if (match.originalDate && match.originalTime) {
      return match.originalTimezone
        ? `${match.originalDate} ${match.originalTime} (${match.originalTimezone})`
        : `${match.originalDate} ${match.originalTime}`;
    }
    if (match.date) return match.date;
    if (match.originalDate) return match.originalDate;
    return t('scheduleTbd');
  };

  const renderMatchCard = match => (
    <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
              {renderOwnerTeam(match.team1)}
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {t('vs')}
              </Typography>
              {renderOwnerTeam(match.team2)}
            </Stack>
            <Stack spacing={0.5} alignItems={{ xs: 'flex-start', sm: 'flex-end' }}>
              <Typography variant="body2" color="text.secondary">
                {formatOwnerKickoff(match)}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {match.group_name && <Chip size="small" label={match.group_name} />}
                {match.series && <Chip size="small" color="secondary" label={match.series} />}
              </Stack>
            </Stack>
          </Stack>
          {match.result1 != null && match.result2 != null && (
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {match.result1} - {match.result2}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
      <Stack spacing={3}>
        <Typography variant="h5">{t('ownerMyPencas')}</Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          sx={{ flexWrap: 'wrap', rowGap: 1, columnGap: 1 }}
        >
          <Button size="small" variant={filter === 'all' ? 'contained' : 'outlined'} onClick={() => setFilter('all')} fullWidth={isMobile}>
            {t('allMatches')}
          </Button>
          <Button size="small" variant={filter === 'upcoming' ? 'contained' : 'outlined'} onClick={() => setFilter('upcoming')} fullWidth={isMobile}>
            {t('upcoming')}
          </Button>
          <Button size="small" variant={filter === 'played' ? 'contained' : 'outlined'} onClick={() => setFilter('played')} fullWidth={isMobile}>
            {t('played')}
          </Button>
        </Stack>
        {pencas.map(p => {
          const ranking = rankings[p._id] || [];
          const stageMatches = matchesByPenca[p._id] || [];
          const pending = Array.isArray(p.pendingRequests) ? p.pendingRequests : [];
          const participants = Array.isArray(p.participants) ? p.participants : [];
          const scoring = sanitizeScoring(p.scoring);
          const modeKey = p.tournamentMode ? `mode_${p.tournamentMode}` : 'mode_group_stage_knockout';
          const translatedMode = t(modeKey);
          const tournamentLabel = translatedMode === modeKey ? p.tournamentMode || t('mode_group_stage_knockout') : translatedMode;

          return (
            <Card key={p._id} sx={{ borderRadius: 2, boxShadow: 3 }}>
              <CardContent>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  justifyContent="space-between"
                  sx={{ width: '100%' }}
                >
                  <Typography component="span" fontWeight="bold">
                    {p.name} · {p.code}
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                    <Chip size="small" label={tournamentLabel} color="primary" />
                    <FormControlLabel
                      control={<Checkbox checked={p.isPublic || false} onChange={e => togglePublic(p._id, e.target.checked)} />}
                      label={t('public')}
                    />
                  </Stack>
                </Stack>

                <Box sx={{ mt: 2 }}>
                  <StageAccordionList
                    matches={stageMatches}
                    t={t}
                    matchTimeValue={matchTimeValue}
                    renderMatch={renderMatchCard}
                    loading={matchesLoading}
                    emptyMessage={t('adminMatchesNoResults')}
                    stageLabelForKey={stageKey => (stageKey === OTHER_STAGE_KEY ? t('otherMatches') : stageKey)}
                  />
                </Box>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 2 }}>
                  <TextField
                    label={t('exact')}
                    type="number"
                    size="small"
                    value={scoring.exact}
                    onChange={e => updateScoring(p._id, 'exact', e.target.value)}
                  />
                  <TextField
                    label={t('outcome')}
                    type="number"
                    size="small"
                    value={scoring.outcome}
                    onChange={e => updateScoring(p._id, 'outcome', e.target.value)}
                  />
                  <TextField
                    label={t('goalDifferenceLabel')}
                    type="number"
                    size="small"
                    value={scoring.goalDifference}
                    onChange={e => updateScoring(p._id, 'goalDifference', e.target.value)}
                  />
                </Stack>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 1 }}>
                  <TextField
                    label={t('teamGoalsLabel')}
                    type="number"
                    size="small"
                    value={scoring.teamGoals}
                    onChange={e => updateScoring(p._id, 'teamGoals', e.target.value)}
                  />
                  <TextField
                    label={t('cleanSheetLabel')}
                    type="number"
                    size="small"
                    value={scoring.cleanSheet}
                    onChange={e => updateScoring(p._id, 'cleanSheet', e.target.value)}
                  />
                </Stack>

                <TextField
                  label={t('regulation')}
                  value={p.rules || ''}
                  onChange={e => updateField(p._id, 'rules', e.target.value)}
                  multiline
                  fullWidth
                  size="small"
                  sx={{ mt: 2 }}
                />
                <TextField
                  label={t('awards')}
                  value={p.prizes || ''}
                  onChange={e => updateField(p._id, 'prizes', e.target.value)}
                  multiline
                  fullWidth
                  size="small"
                  sx={{ mt: 1 }}
                />
                <Button
                  size="small"
                  variant="contained"
                  sx={{ mt: 2 }}
                  onClick={() => saveInfo(p._id)}
                >
                  {t('save')}
                </Button>

                <Typography variant="subtitle1" sx={{ mt: 2 }}>
                  {t('requests')}
                </Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {pending.map(u => (
                    <Stack
                      key={u._id || u}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ border: theme => `1px solid ${theme.palette.divider}`, borderRadius: 1, px: 2, py: 1 }}
                    >
                      <Typography variant="body2">{u.username || u}</Typography>
                      <Button size="small" onClick={() => approve(p._id, u._id || u)}>
                        {t('approve')}
                      </Button>
                    </Stack>
                  ))}
                  {pending.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      {t('noRequests')}
                    </Typography>
                  )}
                </Stack>

                <Typography variant="subtitle1" sx={{ mt: 2 }}>
                  {t('participants')}
                </Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {participants.map(u => (
                    <Stack
                      key={u._id || u}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ border: theme => `1px solid ${theme.palette.divider}`, borderRadius: 1, px: 2, py: 1 }}
                    >
                      <Typography variant="body2">{u.username || u}</Typography>
                      <Button size="small" color="error" onClick={() => removeParticipant(p._id, u._id || u)}>
                        {t('remove')}
                      </Button>
                    </Stack>
                  ))}
                  {participants.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      {t('noParticipants')}
                    </Typography>
                  )}
                </Stack>

                <Typography variant="subtitle1" sx={{ mt: 2 }}>
                  {t('ranking')}
                </Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {ranking.map((u, idx) => (
                    <Stack
                      key={u.userId}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ border: theme => `1px solid ${theme.palette.divider}`, borderRadius: 1, px: 2, py: 1 }}
                    >
                      <Typography variant="body2">
                        {idx + 1}. {u.username}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {u.score}
                      </Typography>
                    </Stack>
                  ))}
                  {ranking.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      {t('noRanking')}
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Container>
  );
}
