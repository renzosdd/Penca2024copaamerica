import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Checkbox,
  FormControlLabel,
  IconButton,
  Snackbar,
  Alert,
  Container,
  Stack,
  Tabs,
  Tab,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import Save from '@mui/icons-material/Save';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GroupTable from './GroupTable';
import {
  OTHER_STAGE_KEY,
  compareGroupStage,
  deriveStageKey,
  isGroupStage,
  knockoutIndexFor,
  stageCategoryFor
} from './stageOrdering';
import CompetitionWizard from './CompetitionWizard';
import useLang from './useLang';
import { formatLocalKickoff as formatKickoff, matchKickoffValue } from './kickoffUtils';

export default function Admin() {
  const [competitions, setCompetitions] = useState([]);
  const [owners, setOwners] = useState([]);
  const [pencas, setPencas] = useState([]);
  const [matchesByCompetition, setMatchesByCompetition] = useState({});
  const [groups, setGroups] = useState({});
  const [expandedComp, setExpandedComp] = useState(null);
  const [auditConfig, setAuditConfig] = useState({ enabled: false, types: {} });
  const [availableAuditTypes, setAvailableAuditTypes] = useState([]);

  const { t } = useLang();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [ownerForm, setOwnerForm] = useState({ username: '', password: '', email: '' });
  const [pencaForm, setPencaForm] = useState({ name: '', owner: '', competition: '', isPublic: false });
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAuditSaving, setIsAuditSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCompetitionId, setSelectedCompetitionId] = useState('');
  const [matchSearch, setMatchSearch] = useState('');
  const [matchStatus, setMatchStatus] = useState('all');
  const [cleanupOptions, setCleanupOptions] = useState([]);
  const [selectedCleanup, setSelectedCleanup] = useState([]);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupConfirmOpen, setCleanupConfirmOpen] = useState(false);

  const auditTypeLabels = {
    user: t('auditTypeUser'),
    penca: t('auditTypePenca'),
    prediction: t('auditTypePrediction')
  };

  const matchTimeValue = match => matchKickoffValue(match);

  const describeKickoff = match => {
    const localized = formatKickoff(match);
    if (localized) return localized;
    if (match?.date && match?.time) {
      return `${match.date} ${match.time}`;
    }
    if (match?.originalDate && match?.originalTime) {
      return match.originalTimezone
        ? `${match.originalDate} ${match.originalTime} (${match.originalTimezone})`
        : `${match.originalDate} ${match.originalTime}`;
    }
    if (match?.date) return match.date;
    if (match?.originalDate) return match.originalDate;
    return t('scheduleTbd');
  };

  const kickoffInputValue = match => {
    if (!match?.kickoff) {
      return '';
    }
    const date = new Date(match.kickoff);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const offsetMinutes = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offsetMinutes * 60000);
    return local.toISOString().slice(0, 16);
  };

  const normalizeKickoffValue = value => {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const offsetMinutes = date.getTimezoneOffset();
    const utc = new Date(date.getTime() - offsetMinutes * 60000);
    return utc.toISOString();
  };

  const ensureVenueObject = venue => ({
    country: venue?.country || '',
    city: venue?.city || '',
    stadium: venue?.stadium || ''
  });

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!selectedCompetitionId && competitions.length) {
      setSelectedCompetitionId(competitions[0]._id);
    }
  }, [competitions, selectedCompetitionId]);

  useEffect(() => {
    const comp = competitions.find(c => c._id === selectedCompetitionId);
    if (comp && !matchesByCompetition[comp._id]) {
      loadCompetitionMatches(comp);
    }
  }, [competitions, matchesByCompetition, selectedCompetitionId]);

  async function loadAll() {
    await Promise.all([
      loadCompetitions(),
      loadOwners(),
      loadPencas(),
      loadAuditConfig(),
      loadCleanupCollections()
    ]);
  }

  async function loadCompetitions() {
    try {
      const res = await fetch('/admin/competitions');
      if (res.ok) setCompetitions(await res.json());
    } catch (err) {
      console.error('load competitions error', err);
    }
  }

  async function loadOwners() {
    try {
      const res = await fetch('/admin/owners');
      if (res.ok) setOwners(await res.json());
    } catch (err) {
      console.error('load owners error', err);
    }
  }

  async function loadPencas() {
    try {
      const res = await fetch('/admin/pencas');
      if (res.ok) setPencas(await res.json());
    } catch (err) {
      console.error('load pencas error', err);
    }
  }

  async function loadAuditConfig() {
    try {
      const res = await fetch('/admin/audit-config');
      if (!res.ok) return;
      const data = await res.json();
      const available = Array.isArray(data.availableTypes) ? data.availableTypes : Object.keys(data.types || {});
      const normalized = {};
      available.forEach(type => {
        normalized[type] = Boolean(data.types?.[type]);
      });
      setAvailableAuditTypes(available);
      setAuditConfig({
        enabled: Boolean(data.enabled),
        types: normalized
      });
    } catch (err) {
      console.error('load audit config error', err);
    }
  }

  async function loadCleanupCollections() {
    try {
      const res = await fetch('/admin/cleanup');
      if (!res.ok) return;
      const data = await res.json();
      setCleanupOptions(Array.isArray(data.collections) ? data.collections : []);
    } catch (err) {
      console.error('load cleanup options error', err);
    }
  }

  const toggleAuditEnabled = () => {
    setAuditConfig(cfg => ({
      ...cfg,
      enabled: !cfg.enabled
    }));
  };

  const updateAuditType = (type, value) => {
    setAuditConfig(cfg => ({
      ...cfg,
      types: {
        ...cfg.types,
        [type]: value
      }
    }));
  };

  async function saveAuditSettings() {
    setIsAuditSaving(true);
    try {
      const res = await fetch('/admin/audit-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: auditConfig.enabled, types: auditConfig.types })
      });
      if (!res.ok) {
        throw new Error('Failed to save audit config');
      }
      const data = await res.json();
      const available = Array.isArray(data.availableTypes) ? data.availableTypes : availableAuditTypes;
      const normalized = {};
      available.forEach(type => {
        normalized[type] = Boolean(data.types?.[type]);
      });
      setAvailableAuditTypes(available);
      setAuditConfig({
        enabled: Boolean(data.enabled),
        types: normalized
      });
      setSnackbar({ open: true, message: t('auditSaveSuccess'), severity: 'success' });
    } catch (err) {
      console.error('save audit config error', err);
      setSnackbar({ open: true, message: t('auditSaveError'), severity: 'error' });
    } finally {
      setIsAuditSaving(false);
    }
  }

  async function loadCompetitionMatches(comp) {
    try {
      const res = await fetch(`/admin/competitions/${encodeURIComponent(comp.name)}/matches`);
      if (!res.ok) return;
      const data = await res.json();
      const normalized = data.map((m, i) => {
        const kickoffDate = m.kickoff ? new Date(m.kickoff) : null;
        const kickoffValue = kickoffDate && !Number.isNaN(kickoffDate.getTime())
          ? kickoffDate.toISOString()
          : '';
        return {
          ...m,
          order: m.order ?? i,
          kickoff: kickoffValue,
          date: m.date || '',
          time: m.time || '',
          originalDate: m.originalDate || m.date || '',
          originalTime: m.originalTime || m.time || '',
          originalTimezone: m.originalTimezone || '',
          venue: ensureVenueObject(m.venue)
        };
      });
      setMatchesByCompetition(ms => ({ ...ms, [comp._id]: normalized }));
      if (data.length) {
        await loadGroups([comp.name]);
      }
    } catch (err) {
      console.error('load matches error', err);
    }
  }

  async function loadGroups(comps) {
    const result = {};
    await Promise.all(
      comps.map(async c => {
        try {
          const r = await fetch(`/groups/${encodeURIComponent(c)}`);
          if (r.ok) result[c] = await r.json();
        } catch (err) {
          console.error('load groups error', err);
        }
      })
    );
    setGroups(prev => ({ ...prev, ...result }));
  }

  const updateCompetitionField = (id, field, value) => {
    setCompetitions(cs => cs.map(c => c._id === id ? { ...c, [field]: value } : c));
  };

  async function saveCompetition(comp) {
    setIsSaving(true);
    try {
      const res = await fetch(`/admin/competitions/${comp._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: comp.name,
          groupsCount: comp.groupsCount === '' ? null : Number(comp.groupsCount),
          integrantsPerGroup: comp.integrantsPerGroup === '' ? null : Number(comp.integrantsPerGroup),
          qualifiersPerGroup: comp.qualifiersPerGroup === '' ? null : Number(comp.qualifiersPerGroup),
        }),
      });
      if (res.ok) loadCompetitions();
    } catch (err) {
      console.error('update competition error', err);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteCompetition(id) {
    try {
      const res = await fetch(`/admin/competitions/${id}`, { method: 'DELETE' });
      if (res.ok) loadCompetitions();
    } catch (err) {
      console.error('delete competition error', err);
    }
  }

  async function generateBracket(comp) {
    setIsGenerating(true);
    try {
      const res = await fetch(`/admin/generate-bracket/${encodeURIComponent(comp.name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qualifiersPerGroup: Number(comp.qualifiersPerGroup || 2) })
      });
      if (res.ok) loadCompetitionMatches(comp);
    } catch (err) {
      console.error('generate bracket error', err);
    } finally {
      setIsGenerating(false);
    }
  }

  async function updateResults(comp) {
    setIsUpdating(true);
    try {
      const res = await fetch(`/admin/update-results/${encodeURIComponent(comp.name)}`, { method: 'POST' });
      if (res.ok) {
        loadCompetitionMatches(comp);
        setSnackbar({ open: true, message: 'Resultados actualizados', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: t('networkError'), severity: 'error' });
      }
    } catch (err) {
      console.error('update results error', err);
      setSnackbar({ open: true, message: t('networkError'), severity: 'error' });
    } finally {
      setIsUpdating(false);
    }
  }

  async function createOwner(e) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/admin/owners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ownerForm),
      });
      if (res.ok) {
        setOwnerForm({ username: '', password: '', email: '' });
        loadOwners();
      }
    } catch (err) {
      console.error('create owner error', err);
    } finally {
      setIsSaving(false);
    }
  }

  const updateOwnerField = (id, field, value) => {
    setOwners(os => os.map(o => o._id === id ? { ...o, [field]: value } : o));
  };

  async function saveOwner(owner) {
    setIsSaving(true);
    try {
      const { username, email, name, surname } = owner;
      const res = await fetch(`/admin/owners/${owner._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, name, surname }),
      });
      if (res.ok) loadOwners();
    } catch (err) {
      console.error('update owner error', err);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteOwner(id) {
    try {
      const res = await fetch(`/admin/owners/${id}`, { method: 'DELETE' });
      if (res.ok) loadOwners();
    } catch (err) {
      console.error('delete owner error', err);
    }
  }

  async function createPenca(e) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/admin/pencas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pencaForm),
      });
      if (res.ok) {
        const comp = competitions.find(c => c.name === pencaForm.competition);
        if (comp) loadCompetitionMatches(comp);
        setPencaForm({ name: '', owner: '', competition: '', isPublic: false });
        loadPencas();
      }
    } catch (err) {
      console.error('create penca error', err);
    } finally {
      setIsSaving(false);
    }
  }

  const updatePencaField = (id, field, value) => {
    setPencas(ps => ps.map(p => p._id === id ? { ...p, [field]: value } : p));
  };

  async function savePenca(penca) {
    setIsSaving(true);
    try {
      const { name, owner, competition, participantLimit, isPublic } = penca;
      const res = await fetch(`/admin/pencas/${penca._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, owner, competition, participantLimit, isPublic }),
      });
      if (res.ok) loadPencas();
    } catch (err) {
      console.error('update penca error', err);
    } finally {
      setIsSaving(false);
    }
  }

  async function deletePenca(id) {
    try {
      const res = await fetch(`/admin/pencas/${id}`, { method: 'DELETE' });
      if (res.ok) loadPencas();
    } catch (err) {
      console.error('delete penca error', err);
    }
  }

  const updateMatchField = (compId, id, field, value) => {
    setMatchesByCompetition(ms => ({
      ...ms,
      [compId]: (ms[compId] || []).map(match => {
        if (match._id !== id) return match;
        const next = { ...match };
        if (field === 'result1' || field === 'result2') {
          if (value === '' || /^\d*$/.test(value)) {
            next[field] = value;
          }
          return next;
        }
        if (field === 'kickoff') {
          next.kickoff = normalizeKickoffValue(value);
          return next;
        }
        if (field.startsWith('venue.')) {
          const key = field.split('.')[1];
          next.venue = ensureVenueObject(next.venue);
          next.venue[key] = value;
          return next;
        }
        next[field] = value;
        return next;
      })
    }));
  };

  async function saveMatch(compId, match, skipRefresh = false) {
    setIsSaving(true);
    try {
      const venuePayload = ensureVenueObject(match.venue);
      const infoPayload = {
        team1: match.team1,
        team2: match.team2,
        date: match.date || null,
        time: match.time || null,
        group_name: match.group_name || null,
        series: match.series || null,
        kickoff: match.kickoff || null,
        originalDate: match.originalDate || null,
        originalTime: match.originalTime || null,
        originalTimezone: match.originalTimezone || null,
        venue: venuePayload
      };
      const resInfo = await fetch(`/admin/competitions/${encodeURIComponent(match.competition)}/matches/${match._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(infoPayload),
      });

      const res1 = match.result1 === '' || match.result1 === null || match.result1 === undefined ? null : Number(match.result1);
      const res2 = match.result2 === '' || match.result2 === null || match.result2 === undefined ? null : Number(match.result2);
      const resScore = await fetch(`/admin/competitions/${encodeURIComponent(match.competition)}/matches/${match._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result1: res1, result2: res2 }),
      });

      if (resInfo.ok && resScore.ok && !skipRefresh) {
        loadCompetitionMatches({ _id: compId, name: match.competition });
      }
    } catch (err) {
      console.error('update match error', err);
    } finally {
      setIsSaving(false);
    }
  }


  async function saveOrder(comp, round) {
    const list = (matchesByCompetition[comp._id] || [])
      .filter(m => deriveStageKey(m.group_name, m.series) === round)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(m => m._id);
    setIsSaving(true);
    try {
      await fetch(`/admin/competitions/${encodeURIComponent(comp.name)}/knockout-order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: list })
      });
    } catch (err) {
      console.error('save order error', err);
    } finally {
      setIsSaving(false);
    }
  }

  async function saveRound(compId, round) {
    setIsSaving(true);
    const matches = (matchesByCompetition[compId] || []).filter(
      m => deriveStageKey(m.group_name, m.series) === round
    );
    try {
      await Promise.all(matches.map(m => saveMatch(compId, m, true)));
      if (matches.length) {
        loadCompetitionMatches({ _id: compId, name: matches[0].competition });
      }
    } finally {
      setIsSaving(false);

    }
  }

  const selectedCompetition = competitions.find(c => c._id === selectedCompetitionId) || null;

  const selectedMatches = useMemo(() => {
    if (!selectedCompetition) return [];
    const matches = matchesByCompetition[selectedCompetition._id] || [];
    const query = matchSearch.trim().toLowerCase();
    return matches
      .filter(match => {
        if (matchStatus === 'upcoming' && !(match.result1 == null && match.result2 == null)) {
          return false;
        }
        if (matchStatus === 'played' && !(match.result1 != null && match.result2 != null)) {
          return false;
        }
        if (!query) return true;
        const haystack = [
          match.team1,
          match.team2,
          match.group_name,
          match.series,
          match.venue?.country,
          match.venue?.city,
          match.venue?.stadium
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => matchTimeValue(a) - matchTimeValue(b));
  }, [matchSearch, matchStatus, matchesByCompetition, selectedCompetition]);

  const groupedSelectedMatches = useMemo(() => {
    return selectedMatches.reduce((acc, match) => {
      const stageKey = deriveStageKey(match.group_name, match.series) || OTHER_STAGE_KEY;
      const label = stageKey === OTHER_STAGE_KEY ? t('otherMatches') : stageKey;
      const category = stageCategoryFor(stageKey);
      const entry = acc[stageKey] || {
        key: stageKey,
        label,
        category,
        matches: [],
        order: Number.POSITIVE_INFINITY,
        knockoutIndex: knockoutIndexFor(stageKey)
      };
      entry.matches.push(match);
      entry.order = Math.min(entry.order, matchTimeValue(match));
      acc[stageKey] = entry;
      return acc;
    }, {});
  }, [selectedMatches, t]);

  const stageEntries = useMemo(() => Object.values(groupedSelectedMatches), [groupedSelectedMatches]);

  const matchGroupKeys = useMemo(
    () =>
      stageEntries
        .filter(entry => entry.category === 'group')
        .sort((a, b) => compareGroupStage(a.key, b.key))
        .map(entry => entry.key),
    [stageEntries]
  );

  const matchKnockoutKeys = useMemo(
    () =>
      stageEntries
        .filter(entry => entry.category === 'knockout')
        .sort((a, b) => {
          if (a.knockoutIndex !== b.knockoutIndex) {
            return a.knockoutIndex - b.knockoutIndex;
          }
          return a.order - b.order;
        })
        .map(entry => entry.key),
    [stageEntries]
  );

  const matchOtherKeys = useMemo(
    () =>
      stageEntries
        .filter(entry => entry.category === 'other')
        .sort((a, b) => a.order - b.order)
        .map(entry => entry.key),
    [stageEntries]
  );

  const matchHasData = stageEntries.some(entry => entry.matches.length > 0);

  const renderMatchAccordion = match => {
    const venue = ensureVenueObject(match.venue);
    return (
      <Accordion
        key={match._id}
        disableGutters
        sx={{
          borderRadius: 2,
          border: theme => `1px solid ${theme.palette.divider}`,
          '&:before': { display: 'none' }
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
            sx={{ width: '100%' }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {match.team1} vs {match.team2}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {match.group_name && <Chip size="small" label={match.group_name} />}
              {match.series && <Chip size="small" color="secondary" label={match.series} />}
              {match.result1 != null && match.result2 != null && (
                <Chip size="small" color="primary" label={`${match.result1} - ${match.result2}`} />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {describeKickoff(match)}
            </Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                label={t('team1Label')}
                value={match.team1 || ''}
                onChange={e => updateMatchField(selectedCompetitionId, match._id, 'team1', e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label={t('team2Label')}
                value={match.team2 || ''}
                onChange={e => updateMatchField(selectedCompetitionId, match._id, 'team2', e.target.value)}
                size="small"
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                label={t('group')}
                value={match.group_name || ''}
                onChange={e => updateMatchField(selectedCompetitionId, match._id, 'group_name', e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label={t('seriesLabel')}
                value={match.series || ''}
                onChange={e => updateMatchField(selectedCompetitionId, match._id, 'series', e.target.value)}
                size="small"
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                label={t('kickoffLabel')}
                type="datetime-local"
                value={kickoffInputValue(match)}
                onChange={e => updateMatchField(selectedCompetitionId, match._id, 'kickoff', e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label={t('originalDateLabel')}
                type="date"
                value={match.originalDate || ''}
                onChange={e => updateMatchField(selectedCompetitionId, match._id, 'originalDate', e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label={t('originalTimeLabel')}
                type="time"
                value={match.originalTime || ''}
                onChange={e => updateMatchField(selectedCompetitionId, match._id, 'originalTime', e.target.value)}
                size="small"
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                label={t('originalTimezoneLabel')}
                value={match.originalTimezone || ''}
                onChange={e => updateMatchField(selectedCompetitionId, match._id, 'originalTimezone', e.target.value)}
                size="small"
                fullWidth
              />
              <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 40 }}>
                <Typography variant="caption">{t('localKickoffLabel')}: {describeKickoff(match)}</Typography>
              </Box>
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                label={t('venueCountryLabel')}
                value={venue.country}
                onChange={e => updateMatchField(selectedCompetitionId, match._id, 'venue.country', e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label={t('venueCityLabel')}
                value={venue.city}
                onChange={e => updateMatchField(selectedCompetitionId, match._id, 'venue.city', e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label={t('venueStadiumLabel')}
                value={venue.stadium}
                onChange={e => updateMatchField(selectedCompetitionId, match._id, 'venue.stadium', e.target.value)}
                size="small"
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                label={t('scoreTeam1Label')}
                type="number"
                value={match.result1 ?? ''}
                onChange={e => updateMatchField(selectedCompetitionId, match._id, 'result1', e.target.value)}
                size="small"
                sx={{ maxWidth: 160 }}
                inputProps={{ min: 0 }}
              />
              <TextField
                label={t('scoreTeam2Label')}
                type="number"
                value={match.result2 ?? ''}
                onChange={e => updateMatchField(selectedCompetitionId, match._id, 'result2', e.target.value)}
                size="small"
                sx={{ maxWidth: 160 }}
                inputProps={{ min: 0 }}
              />
            </Stack>
            <Stack direction="row" justifyContent="flex-end">
              <Button
                variant="contained"
                size="small"
                onClick={() => saveMatch(selectedCompetitionId, match)}
                disabled={isSaving}
                startIcon={<Save fontSize="small" />}
              >
                {t('save')}
              </Button>
            </Stack>
          </Stack>
        </AccordionDetails>
      </Accordion>
    );
  };

  const toggleCleanupSelection = key => {
    setSelectedCleanup(list =>
      list.includes(key) ? list.filter(item => item !== key) : [...list, key]
    );
  };

  const toggleAllCleanup = () => {
    if (selectedCleanup.length === cleanupOptions.length) {
      setSelectedCleanup([]);
    } else {
      setSelectedCleanup(cleanupOptions.map(opt => opt.key));
    }
  };

  const requestCleanup = () => {
    if (!selectedCleanup.length) {
      setSnackbar({ open: true, message: t('adminCleanupEmpty'), severity: 'warning' });
      return;
    }
    setCleanupConfirmOpen(true);
  };

  const executeCleanup = async () => {
    setCleanupLoading(true);
    try {
      const res = await fetch('/admin/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collections: selectedCleanup })
      });
      const data = await res.json();
      if (res.ok) {
        setCleanupOptions(Array.isArray(data.collections) ? data.collections : cleanupOptions);
        setSelectedCleanup([]);
        setSnackbar({ open: true, message: t('adminCleanupSuccess'), severity: 'success' });
      } else {
        setSnackbar({ open: true, message: data.error || t('networkError'), severity: 'error' });
      }
    } catch (err) {
      console.error('cleanup request error', err);
      setSnackbar({ open: true, message: t('networkError'), severity: 'error' });
    } finally {
      setCleanupLoading(false);
      setCleanupConfirmOpen(false);
    }
  };

  const totalMatches = useMemo(
    () =>
      Object.values(matchesByCompetition).reduce(
        (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
        0
      ),
    [matchesByCompetition]
  );

  const totalPlayers = useMemo(
    () =>
      pencas.reduce(
        (sum, p) => sum + (Array.isArray(p.participants) ? p.participants.length : 0),
        0
      ),
    [pencas]
  );

  const lastUpdated = useMemo(() => new Date().toLocaleString(), []);

  const renderOverviewTab = () => (
    <Grid container spacing={2}>
      {[{
        label: t('adminStatsCompetitions'),
        value: competitions.length
      }, {
        label: t('adminStatsMatches'),
        value: totalMatches
      }, {
        label: t('adminStatsPencas'),
        value: pencas.length
      }, {
        label: t('adminStatsOwners'),
        value: owners.length
      }].map(item => (
        <Grid item xs={12} sm={6} md={3} key={item.label}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="overline" color="text.secondary">
              {item.label}
            </Typography>
            <Typography variant="h5">{item.value}</Typography>
          </Paper>
        </Grid>
      ))}
      <Grid item xs={12} sm={6} md={3}>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="overline" color="text.secondary">
            {t('adminStatsPlayers')}
          </Typography>
          <Typography variant="h5">{totalPlayers}</Typography>
        </Paper>
      </Grid>
      <Grid item xs={12}>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('adminStatsUpdated')}: {lastUpdated}
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderCompetitionsTab = () => (
    <Stack spacing={2}>
      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} flexWrap="wrap">
          <Button variant="contained" onClick={() => setWizardOpen(true)}>
            {t('importCompetition')}
          </Button>
          <Button
            variant="outlined"
            component="a"
            href="/admin/competitions/template/example"
            download
          >
            {t('downloadExampleJson')}
          </Button>
          <Button
            variant="outlined"
            component="a"
            href="/admin/competitions/template/worldcup"
            download
          >
            {t('downloadWorldCupJson')}
          </Button>
          <Button
            variant="outlined"
            component="a"
            href="/admin/competitions/template/guide"
            download
          >
            {t('downloadGuideDoc')}
          </Button>
        </Stack>
      </Paper>

      {competitions.length === 0 && (
        <Alert severity="info">{t('adminMatchesNoResults')}</Alert>
      )}

      {competitions.map(comp => (
        <Paper key={comp._id} sx={{ p: 2, borderRadius: 2 }}>
          <Stack spacing={1.5}>
            <TextField
              label={t('competition')}
              value={comp.name || ''}
              onChange={e => updateCompetitionField(comp._id, 'name', e.target.value)}
              size="small"
              fullWidth
            />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                label={t('groups')}
                type="number"
                value={comp.groupsCount ?? ''}
                onChange={e => updateCompetitionField(comp._id, 'groupsCount', e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label={t('integrants')}
                type="number"
                value={comp.integrantsPerGroup ?? ''}
                onChange={e => updateCompetitionField(comp._id, 'integrantsPerGroup', e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label={t('qualifiers')}
                type="number"
                value={comp.qualifiersPerGroup ?? ''}
                onChange={e => updateCompetitionField(comp._id, 'qualifiersPerGroup', e.target.value)}
                size="small"
                fullWidth
              />
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                variant="contained"
                size="small"
                onClick={() => saveCompetition(comp)}
                disabled={isSaving}
              >
                {t('save')}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => generateBracket(comp)}
                disabled={isGenerating}
              >
                {t('generateBracket')}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => updateResults(comp)}
                disabled={isUpdating}
              >
                {t('updateResults')}
              </Button>
              <Button
                color="error"
                size="small"
                onClick={() => deleteCompetition(comp._id)}
              >
                {t('delete')}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );

  const renderMatchesTab = () => (
    <Stack spacing={2}>
      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} flexWrap="wrap">
          <TextField
            select
            label={t('competition')}
            value={selectedCompetitionId}
            onChange={e => setSelectedCompetitionId(e.target.value)}
            size="small"
            fullWidth
            SelectProps={{ displayEmpty: true }}
          >
            {competitions.map(comp => (
              <MenuItem key={comp._id} value={comp._id}>
                {comp.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={t('adminMatchesSearch')}
            value={matchSearch}
            onChange={e => setMatchSearch(e.target.value)}
            size="small"
            fullWidth
          />
          <Button
            variant="outlined"
            size="small"
            onClick={() => selectedCompetition && loadCompetitionMatches(selectedCompetition)}
            disabled={!selectedCompetition}
          >
            {t('adminMatchesRefresh')}
          </Button>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <ToggleButtonGroup
            value={matchStatus}
            exclusive
            size="small"
            onChange={(_, value) => {
              if (value) setMatchStatus(value);
            }}
          >
            <ToggleButton value="all">{t('allMatches')}</ToggleButton>
            <ToggleButton value="upcoming">{t('upcoming')}</ToggleButton>
            <ToggleButton value="played">{t('played')}</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="body2" color="text.secondary" sx={{ ml: { sm: 'auto' } }}>
            {t('adminMatchesGrouped')}: {Object.keys(groupedSelectedMatches).length}
          </Typography>
        </Stack>
      </Paper>

      {!selectedCompetition && <Alert severity="info">{t('competitions')}</Alert>}

      {selectedCompetition && !matchHasData && (
        <Alert severity="info">{t('adminMatchesNoResults')}</Alert>
      )}

      {selectedCompetition && matchHasData && (
        <Stack spacing={2}>
          {matchGroupKeys.map(round => {
            const section = groupedSelectedMatches[round];
            if (!section) return null;
            return (
              <Paper key={round} sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
                <Typography variant="subtitle1">{section.label}</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => saveOrder(selectedCompetition, round)}
                    disabled={isSaving}
                  >
                    {t('saveOrder')}
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => saveRound(selectedCompetition._id, round)}
                    disabled={isSaving}
                  >
                    {t('saveRound')}
                  </Button>
                </Stack>
              </Stack>
              <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                {section.matches.map(renderMatchAccordion)}
              </Stack>
                {Array.isArray(groups[selectedCompetition.name]) && (
                <GroupTable groups={groups[selectedCompetition.name].filter(gr => gr.group === section.key)} />
                )}
              </Paper>
            );
          })}

          {matchKnockoutKeys.map(round => {
            const section = groupedSelectedMatches[round];
            if (!section) return null;
            return (
              <Paper key={round} sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
                <Typography variant="subtitle1">{section.label}</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => saveOrder(selectedCompetition, round)}
                    disabled={isSaving}
                  >
                    {t('saveOrder')}
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => saveRound(selectedCompetition._id, round)}
                    disabled={isSaving}
                  >
                    {t('saveRound')}
                  </Button>
                </Stack>
              </Stack>
              <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                {section.matches.map(renderMatchAccordion)}
              </Stack>
              </Paper>
            );
          })}

          {matchOtherKeys.map(round => {
            const section = groupedSelectedMatches[round];
            if (!section) return null;
            return (
              <Paper key={round} sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
                <Typography variant="subtitle1">{section.label}</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => saveRound(selectedCompetition._id, round)}
                  disabled={isSaving}
                >
                  {t('saveRound')}
                </Button>
              </Stack>
              <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                {section.matches.map(renderMatchAccordion)}
              </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Stack>
  );

  const renderOwnersTab = () => (
    <Stack spacing={2}>
      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {t('owners')}
        </Typography>
        <Stack
          component="form"
          onSubmit={createOwner}
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          flexWrap="wrap"
        >
          <TextField
            value={ownerForm.username}
            onChange={e => setOwnerForm({ ...ownerForm, username: e.target.value })}
            label={t('username')}
            required
            size="small"
            fullWidth
          />
          <TextField
            type="password"
            value={ownerForm.password}
            onChange={e => setOwnerForm({ ...ownerForm, password: e.target.value })}
            label={t('password')}
            required
            size="small"
            fullWidth
          />
          <TextField
            type="email"
            value={ownerForm.email}
            onChange={e => setOwnerForm({ ...ownerForm, email: e.target.value })}
            label={t('email')}
            required
            size="small"
            fullWidth
          />
          <Button variant="contained" type="submit" size="small" disabled={isSaving}>
            {t('create')}
          </Button>
        </Stack>
      </Paper>

      <Stack spacing={1.5}>
        {owners.map(owner => (
          <Paper key={owner._id} sx={{ p: 2, borderRadius: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap" alignItems={{ xs: 'flex-start', md: 'center' }}>
              <TextField
                label={t('username')}
                value={owner.username || ''}
                onChange={e => updateOwnerField(owner._id, 'username', e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label={t('email')}
                type="email"
                value={owner.email || ''}
                onChange={e => updateOwnerField(owner._id, 'email', e.target.value)}
                size="small"
                fullWidth
              />
              <Button
                variant="contained"
                size="small"
                onClick={() => saveOwner(owner)}
                disabled={isSaving}
              >
                {t('save')}
              </Button>
              <Button color="error" size="small" onClick={() => deleteOwner(owner._id)}>
                {t('delete')}
              </Button>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Stack>
  );

  const renderPencasTab = () => (
    <Stack spacing={2}>
      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {t('pencas')}
        </Typography>
        <Stack
          component="form"
          onSubmit={createPenca}
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          flexWrap="wrap"
        >
          <TextField
            value={pencaForm.name}
            onChange={e => setPencaForm({ ...pencaForm, name: e.target.value })}
            label={t('name')}
            required
            size="small"
            fullWidth
          />
          <Select
            value={pencaForm.owner}
            onChange={e => setPencaForm({ ...pencaForm, owner: e.target.value })}
            displayEmpty
            required
            size="small"
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="" disabled>
              {t('owner')}
            </MenuItem>
            {owners.map(o => (
              <MenuItem key={o._id} value={o._id}>{o.username}</MenuItem>
            ))}
          </Select>
          <Select
            value={pencaForm.competition}
            onChange={e => setPencaForm({ ...pencaForm, competition: e.target.value })}
            displayEmpty
            required
            size="small"
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="" disabled>
              {t('competition')}
            </MenuItem>
            {competitions.map(c => (
              <MenuItem key={c._id} value={c.name}>{c.name}</MenuItem>
            ))}
          </Select>
          <FormControlLabel
            control={(
              <Checkbox
                checked={pencaForm.isPublic}
                onChange={e => setPencaForm({ ...pencaForm, isPublic: e.target.checked })}
              />
            )}
            label={t('public')}
          />
          <Button variant="contained" type="submit" size="small" disabled={isSaving}>
            {t('create')}
          </Button>
        </Stack>
      </Paper>

      <Stack spacing={1.5}>
        {pencas.map(penca => (
          <Paper key={penca._id} sx={{ p: 2, borderRadius: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap" alignItems={{ xs: 'flex-start', md: 'center' }}>
              <TextField
                label={t('name')}
                value={penca.name || ''}
                onChange={e => updatePencaField(penca._id, 'name', e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label={t('code')}
                value={penca.code || ''}
                size="small"
                InputProps={{ readOnly: true }}
                sx={{ maxWidth: 140 }}
              />
              <Select
                value={penca.owner}
                onChange={e => updatePencaField(penca._id, 'owner', e.target.value)}
                size="small"
                sx={{ minWidth: 180 }}
              >
                {owners.map(o => (
                  <MenuItem key={o._id} value={o._id}>{o.username}</MenuItem>
                ))}
              </Select>
              <Select
                value={penca.competition}
                onChange={e => updatePencaField(penca._id, 'competition', e.target.value)}
                size="small"
                sx={{ minWidth: 180 }}
              >
                {competitions.map(c => (
                  <MenuItem key={c._id} value={c.name}>{c.name}</MenuItem>
                ))}
              </Select>
              <FormControlLabel
                control={(
                  <Checkbox
                    checked={penca.isPublic || false}
                    onChange={e => updatePencaField(penca._id, 'isPublic', e.target.checked)}
                  />
                )}
                label={t('public')}
              />
              <Button
                variant="contained"
                size="small"
                onClick={() => savePenca(penca)}
                disabled={isSaving}
              >
                {t('save')}
              </Button>
              <Button color="error" size="small" onClick={() => deletePenca(penca._id)}>
                {t('delete')}
              </Button>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Stack>
  );

  const renderSettingsTab = () => (
    <Stack spacing={2}>
      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle1">{t('auditSettingsTitle')}</Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          {auditConfig.enabled ? t('auditEnabled') : t('auditDisabled')}
        </Typography>
        <Button variant="outlined" sx={{ mt: 2 }} onClick={toggleAuditEnabled}>
          {auditConfig.enabled ? t('auditDisable') : t('auditEnable')}
        </Button>
        {availableAuditTypes.length > 0 && (
          <Stack spacing={1} sx={{ mt: 2 }}>
            <Typography variant="subtitle2">{t('auditTypesLabel')}</Typography>
            {availableAuditTypes.map(type => (
              <FormControlLabel
                key={type}
                control={(
                  <Checkbox
                    checked={Boolean(auditConfig.types?.[type])}
                    onChange={e => updateAuditType(type, e.target.checked)}
                    disabled={!auditConfig.enabled}
                  />
                )}
                label={auditTypeLabels[type] || type}
              />
            ))}
          </Stack>
        )}
        <Button variant="contained" sx={{ mt: 2 }} onClick={saveAuditSettings} disabled={isAuditSaving}>
          {t('save')}
        </Button>
      </Paper>

      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1">{t('adminCleanupTitle')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('adminCleanupDescription')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('adminCleanupWarning')}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="text" size="small" onClick={toggleAllCleanup}>
              {t('adminCleanupSelectAll')}
            </Button>
            <Typography variant="body2" color="text.secondary">
              {t('adminSelected')}: {selectedCleanup.length}
            </Typography>
          </Stack>
          <Stack spacing={1}>
            {cleanupOptions.map(option => (
              <FormControlLabel
                key={option.key}
                control={(
                  <Checkbox
                    checked={selectedCleanup.includes(option.key)}
                    onChange={() => toggleCleanupSelection(option.key)}
                  />
                )}
                label={`${option.label} (${option.count})`}
              />
            ))}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {t('adminCleanupUsersNote')}
          </Typography>
          <Button
            variant="contained"
            color="error"
            onClick={requestCleanup}
            disabled={cleanupLoading}
          >
            {t('adminCleanupAction')}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
      <Stack
        spacing={3}
        sx={{
          alignItems: { xs: 'center', md: 'flex-start' },
          maxWidth: { xs: 480, md: 'none' },
          mx: { xs: 'auto', md: 0 }
        }}
      >
        <Typography variant="h5">{t('adminTitle')}</Typography>
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons
          allowScrollButtonsMobile
          sx={{
            '& .MuiTabs-flexContainer': {
              justifyContent: { xs: 'center', md: 'flex-start' }
            }
          }}
        >
          <Tab value="overview" label={t('adminTabOverview')} />
          <Tab value="competitions" label={t('adminTabCompetitions')} />
          <Tab value="matches" label={t('adminTabMatches')} />
          <Tab value="pencas" label={t('adminTabPencas')} />
          <Tab value="owners" label={t('adminTabOwners')} />
          <Tab value="settings" label={t('adminTabSettings')} />
        </Tabs>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'competitions' && renderCompetitionsTab()}
        {activeTab === 'matches' && renderMatchesTab()}
        {activeTab === 'pencas' && renderPencasTab()}
        {activeTab === 'owners' && renderOwnersTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </Stack>

      <CompetitionWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={loadCompetitions}
      />

      <Dialog
        open={cleanupConfirmOpen}
        onClose={() => {
          if (!cleanupLoading) setCleanupConfirmOpen(false);
        }}
      >
        <DialogTitle>{t('adminCleanupConfirmTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{t('adminCleanupConfirmMessage')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCleanupConfirmOpen(false)} disabled={cleanupLoading}>
            {t('close')}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={executeCleanup}
            disabled={cleanupLoading}
          >
            {cleanupLoading ? <CircularProgress size={18} /> : t('adminCleanupAction')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return;
          setSnackbar(s => ({ ...s, open: false }));
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
