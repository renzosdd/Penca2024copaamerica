import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import useLang from './useLang';
import roundOrder from './roundOrder';
import { formatLocalKickoff, getMatchKickoffDate, matchKickoffValue } from './kickoffUtils';
import { useTheme } from '@mui/material/styles';

export default function OwnerPanel() {
  const [pencas, setPencas] = useState([]);
  const [rankings, setRankings] = useState({});
  const [matches, setMatches] = useState([]);
  const { t } = useLang();
  const [expandedPenca, setExpandedPenca] = useState(null);
  const [filter, setFilter] = useState('all');
  const [expandedStages, setExpandedStages] = useState({});
  const [selectedStages, setSelectedStages] = useState({});
  const stageRefs = useRef({});
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const matchTimeValue = match => matchKickoffValue(match);

  const getDateKey = match => {
    if (match?.date) return match.date;
    if (match?.originalDate) return match.originalDate;
    const kickoffDate = getMatchKickoffDate(match);
    if (kickoffDate) {
      return kickoffDate.toISOString().slice(0, 10);
    }
    return null;
  };

  const isGroupKey = key => /^Grupo\s+/i.test(key);
  const compareGroupKey = (a, b) => {
    const normalize = value => value.replace(/^Grupo\s+/i, '').trim();
    return normalize(a).localeCompare(normalize(b), undefined, { sensitivity: 'base', numeric: true });
  };

  const knockoutOrder = roundOrder.filter(label => !/^Grupo\s+/i.test(label));

  const formatDateLabel = date => {
    if (!date) return t('scheduleTbd');
    try {
      const formatter = new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });
      return formatter.format(new Date(`${date}T12:00:00Z`));
    } catch (error) {
      console.error('owner date format error', error);
      return date;
    }
  };

  const buildStageSections = list => {
    const stageMap = new Map();
    list.forEach(match => {
      const stageKey = match.group_name?.trim() || match.series || '__other__';
      const stageLabel = match.group_name?.trim() || match.series || t('otherMatches');
      const stageEntry = stageMap.get(stageKey) || {
        key: stageKey,
        label: stageLabel,
        order: Number.POSITIVE_INFINITY,
        dates: new Map()
      };
      const dateKey = getDateKey(match);
      const normalizedDateKey = dateKey || `unknown-${match._id}`;
      const label = dateKey ? formatDateLabel(dateKey) : t('dateToBeDefined');
      const dateEntry = stageEntry.dates.get(normalizedDateKey) || {
        key: normalizedDateKey,
        label,
        order: matchTimeValue(match),
        matches: []
      };
      dateEntry.order = Math.min(dateEntry.order, matchTimeValue(match));
      dateEntry.label = label;
      dateEntry.matches.push(match);
      stageEntry.dates.set(normalizedDateKey, dateEntry);
      stageEntry.order = Math.min(stageEntry.order, matchTimeValue(match));
      stageEntry.label = stageLabel;
      stageMap.set(stageKey, stageEntry);
    });

    const comparator = (a, b) => {
      const aIsGroup = isGroupKey(a.key);
      const bIsGroup = isGroupKey(b.key);
      if (aIsGroup && bIsGroup) return compareGroupKey(a.key, b.key);
      if (aIsGroup) return -1;
      if (bIsGroup) return 1;
      const aKnock = knockoutOrder.indexOf(a.key);
      const bKnock = knockoutOrder.indexOf(b.key);
      if (aKnock !== -1 || bKnock !== -1) {
        if (aKnock === -1) return 1;
        if (bKnock === -1) return -1;
        return aKnock - bKnock;
      }
      return a.order - b.order;
    };

    return Array.from(stageMap.values())
      .map(stage => ({
        ...stage,
        dates: Array.from(stage.dates.values()).sort((a, b) => a.order - b.order)
      }))
      .sort(comparator);
  };

  const matchSectionsByPenca = useMemo(() => {
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
      result[p._id] = buildStageSections(filteredList);
    });
    return result;
  }, [filter, matches, pencas, t]);

  useEffect(() => {
    setExpandedStages(prev => {
      const next = {};
      Object.entries(matchSectionsByPenca).forEach(([pId, sections]) => {
        if (!sections.length) {
          next[pId] = [];
          return;
        }
        const prevForId = (prev[pId] || []).filter(key => sections.some(section => section.key === key));
        next[pId] = prevForId.length ? prevForId : [sections[0].key];
      });
      return next;
    });
  }, [matchSectionsByPenca]);

  useEffect(() => {
    setSelectedStages(prev => {
      const next = {};
      Object.entries(matchSectionsByPenca).forEach(([pId, sections]) => {
        const validKeys = sections.map(section => section.key);
        if (prev[pId] && validKeys.includes(prev[pId])) {
          next[pId] = prev[pId];
        }
      });
      return next;
    });
  }, [matchSectionsByPenca]);

  const stageMatchesCount = stage => stage.dates.reduce((acc, date) => acc + date.matches.length, 0);

  const registerStageRef = (pencaId, stageKey, node) => {
    if (!stageRefs.current[pencaId]) {
      stageRefs.current[pencaId] = {};
    }
    if (node) {
      stageRefs.current[pencaId][stageKey] = node;
    } else if (stageRefs.current[pencaId]) {
      delete stageRefs.current[pencaId][stageKey];
    }
  };

  const toggleStageExpansion = (pencaId, stageKey, expanded) => {
    setExpandedStages(prev => {
      const current = prev[pencaId] || [];
      const filtered = current.filter(key => key !== stageKey);
      const nextList = expanded ? [...filtered, stageKey] : filtered;
      return { ...prev, [pencaId]: nextList };
    });
  };

  const handleJumpStage = (pencaId, value) => {
    setSelectedStages(prev => ({ ...prev, [pencaId]: value }));
    if (!value) {
      setExpandedStages(prev => ({ ...prev, [pencaId]: [] }));
      return;
    }
    setExpandedStages(prev => ({ ...prev, [pencaId]: [value] }));
    setTimeout(() => {
      const node = stageRefs.current?.[pencaId]?.[value];
      if (node && typeof node.scrollIntoView === 'function') {
        node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };


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
        const fetched = await Promise.all(
          comps.map(async c => {
            try {
              const r = await fetch(`/competitions/${encodeURIComponent(c)}/matches`);
              if (r.ok) {
                const list = await r.json();
                return list;
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
      }
    }
    if (pencas.length) loadMatches();
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
    setPencas(ps => ps.map(p => p._id === id ? { ...p, [field]: value } : p));
  };

  const updateScoring = (id, key, val) => {
    setPencas(ps => ps.map(p => {
      if (p._id !== id) return p;
      const scoring = sanitizeScoring({ ...p.scoring, [key]: val });
      return { ...p, scoring, rules: autoRules(scoring) };
    }));
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
    <Card key={match._id} sx={{ borderRadius: 2, boxShadow: 2 }}>
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
        const stageSections = matchSectionsByPenca[p._id] || [];
        const stageKeys = stageSections.map(stage => stage.key);
        const expandedStageKeys = expandedStages[p._id] || [];
        const selectedStageValue = stageKeys.includes(selectedStages[p._id]) ? selectedStages[p._id] : '';
        const pending = Array.isArray(p.pendingRequests) ? p.pendingRequests : [];
        const participants = Array.isArray(p.participants) ? p.participants : [];
        const scoring = sanitizeScoring(p.scoring);
        const modeKey = p.tournamentMode ? `mode_${p.tournamentMode}` : 'mode_group_stage_knockout';
        const translatedMode = t(modeKey);
        const tournamentLabel = translatedMode === modeKey ? p.tournamentMode || t('mode_group_stage_knockout') : translatedMode;
        const hasStageMatches = stageSections.length > 0;
 
        return (
          <Accordion
            key={p._id}
            expanded={expandedPenca === p._id}
            onChange={(_, exp) => setExpandedPenca(exp ? p._id : null)}
            sx={{ borderRadius: 2, boxShadow: 3 }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ '& .MuiAccordionSummary-content': { width: '100%', margin: 0 } }}
            >
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
            </AccordionSummary>
            <AccordionDetails>
              {hasStageMatches ? (
                <Stack spacing={1.5} sx={{ mb: 2 }}>
                  <TextField
                    select
                    size="small"
                    label={t('jumpToStage')}
                    value={selectedStageValue}
                    onChange={e => handleJumpStage(p._id, e.target.value)}
                    sx={{ minWidth: { xs: '100%', sm: 220 } }}
                    fullWidth={isMobile}
                  >
                    <MenuItem value="">{t('jumpToStagePlaceholder')}</MenuItem>
                    {stageSections.map(stage => (
                      <MenuItem key={stage.key} value={stage.key}>
                        {stage.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  {stageSections.map(stage => (
                    <Accordion
                      key={stage.key}
                      expanded={expandedStageKeys.includes(stage.key)}
                      onChange={(_, expanded) => toggleStageExpansion(p._id, stage.key, expanded)}
                      disableGutters
                      square
                      ref={el => registerStageRef(p._id, stage.key, el)}
                      sx={{
                        borderRadius: 2,
                        boxShadow: 0,
                        backgroundColor: 'transparent',
                        '&:before': { display: 'none' },
                        '& .MuiAccordionSummary-root': { px: 1 },
                        '& .MuiAccordionDetails-root': { px: 1 }
                      }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%' }}>
                          <Typography variant="subtitle2">{stage.label}</Typography>
                          <Chip size="small" label={t('matchesCountLabel', { count: stageMatchesCount(stage) })} />
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Stack spacing={1.5} sx={{ pb: 1 }}>
                          {stage.dates.map(date => (
                            <Stack key={date.key} spacing={1.5}>
                              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                {date.label}
                              </Typography>
                              {date.matches.map(renderMatchCard)}
                            </Stack>
                          ))}
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('adminMatchesNoResults')}
                </Typography>
              )}

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
            </AccordionDetails>
          </Accordion>
        );
      })}
      </Stack>
    </Container>
  );
}
