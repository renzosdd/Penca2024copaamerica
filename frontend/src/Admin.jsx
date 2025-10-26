import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
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
  Alert
} from '@mui/material';
import Save from '@mui/icons-material/Save';
import GroupTable from './GroupTable';
import roundOrder from './roundOrder';
import CompetitionWizard from './CompetitionWizard';
import useLang from './useLang';

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

  const auditTypeLabels = {
    user: t('auditTypeUser'),
    penca: t('auditTypePenca'),
    prediction: t('auditTypePrediction')
  };

  const matchTimeValue = match => {
    if (match?.kickoff) {
      const value = Date.parse(match.kickoff);
      if (!Number.isNaN(value)) {
        return value;
      }
    }
    if (match?.date && match?.time) {
      const value = Date.parse(`${match.date}T${match.time}`);
      if (!Number.isNaN(value)) {
        return value;
      }
    }
    return Number.POSITIVE_INFINITY;
  };

  const formatLocalKickoff = match => {
    if (match?.kickoff) {
      const date = new Date(match.kickoff);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
      }
    }
    if (match?.date && match?.time) {
      return `${match.date} ${match.time}`;
    }
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

  const isGroupKey = key => /^Grupo\s+/i.test(key);
  const compareGroupKey = (a, b) => {
    const normalize = value => value.replace(/^Grupo\s+/i, '').trim();
    return normalize(a).localeCompare(normalize(b), undefined, { sensitivity: 'base', numeric: true });
  };

  const knockoutOrder = roundOrder.filter(label => !/^Grupo\s+/i.test(label));

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    await Promise.all([loadCompetitions(), loadOwners(), loadPencas(), loadAuditConfig()]);
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
      const normalized = data.map((m, i) => ({
        ...m,
        order: m.order ?? i,
        kickoff: m.kickoff || '',
        date: m.date || '',
        time: m.time || '',
        originalDate: m.originalDate || m.date || '',
        originalTime: m.originalTime || m.time || '',
        originalTimezone: m.originalTimezone || '',
        venue: ensureVenueObject(m.venue)
      }));
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
    setGroups(result);
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
      .filter(m => (m.group_name || 'Otros') === round)
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
      m => (m.group_name || 'Otros') === round
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

  const renderMatchEditor = (comp, match) => {
    const venue = ensureVenueObject(match.venue);
    return (
      <li key={match._id} className="collection-item">
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <TextField
            label={t('team1Label')}
            value={match.team1 || ''}
            onChange={e => updateMatchField(comp._id, match._id, 'team1', e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
          />
          <TextField
            label={t('team2Label')}
            value={match.team2 || ''}
            onChange={e => updateMatchField(comp._id, match._id, 'team2', e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
          />
          <TextField
            label={t('group')}
            value={match.group_name || ''}
            onChange={e => updateMatchField(comp._id, match._id, 'group_name', e.target.value)}
            size="small"
            sx={{ minWidth: 140 }}
          />
          <TextField
            label={t('seriesLabel')}
            value={match.series || ''}
            onChange={e => updateMatchField(comp._id, match._id, 'series', e.target.value)}
            size="small"
            sx={{ minWidth: 180 }}
          />
          <TextField
            label={t('kickoffLabel')}
            type="datetime-local"
            value={kickoffInputValue(match)}
            onChange={e => updateMatchField(comp._id, match._id, 'kickoff', e.target.value)}
            size="small"
            sx={{ minWidth: 220 }}
          />
          <Typography variant="caption" sx={{ width: '100%' }}>
            {t('localKickoffLabel')}: {formatLocalKickoff(match)}
          </Typography>
          <TextField
            label={t('originalDateLabel')}
            type="date"
            value={match.originalDate || ''}
            onChange={e => updateMatchField(comp._id, match._id, 'originalDate', e.target.value)}
            size="small"
            sx={{ minWidth: 160 }}
          />
          <TextField
            label={t('originalTimeLabel')}
            type="time"
            value={match.originalTime || ''}
            onChange={e => updateMatchField(comp._id, match._id, 'originalTime', e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
          />
          <TextField
            label={t('originalTimezoneLabel')}
            value={match.originalTimezone || ''}
            onChange={e => updateMatchField(comp._id, match._id, 'originalTimezone', e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          />
          <TextField
            label={t('venueCountryLabel')}
            value={venue.country}
            onChange={e => updateMatchField(comp._id, match._id, 'venue.country', e.target.value)}
            size="small"
            sx={{ minWidth: 160 }}
          />
          <TextField
            label={t('venueCityLabel')}
            value={venue.city}
            onChange={e => updateMatchField(comp._id, match._id, 'venue.city', e.target.value)}
            size="small"
            sx={{ minWidth: 160 }}
          />
          <TextField
            label={t('venueStadiumLabel')}
            value={venue.stadium}
            onChange={e => updateMatchField(comp._id, match._id, 'venue.stadium', e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          />
          <TextField
            label={t('scoreTeam1Label')}
            type="number"
            value={match.result1 ?? ''}
            onChange={e => updateMatchField(comp._id, match._id, 'result1', e.target.value)}
            size="small"
            sx={{ width: 100 }}
            inputProps={{ min: 0 }}
          />
          <TextField
            label={t('scoreTeam2Label')}
            type="number"
            value={match.result2 ?? ''}
            onChange={e => updateMatchField(comp._id, match._id, 'result2', e.target.value)}
            size="small"
            sx={{ width: 100 }}
            inputProps={{ min: 0 }}
          />
          <IconButton size="small" onClick={() => saveMatch(comp._id, match)} disabled={isSaving}>
            <Save fontSize="small" />
          </IconButton>
        </Box>
      </li>
    );
  };

  return (
    <div className="container" style={{ marginTop: '2rem' }}>
      <h5>{t('adminTitle')}</h5>

      <Card style={{ marginTop: '1rem', padding: '1rem' }}>
        <CardContent>
          <Typography variant="h6">{t('auditSettingsTitle')}</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {auditConfig.enabled ? t('auditEnabled') : t('auditDisabled')}
          </Typography>
          <Button variant="outlined" sx={{ mt: 2 }} onClick={toggleAuditEnabled}>
            {auditConfig.enabled ? t('auditDisable') : t('auditEnable')}
          </Button>
          {availableAuditTypes.length ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
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
            </Box>
          ) : null}
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={saveAuditSettings}
            disabled={isAuditSaving}
          >
            {t('save')}
          </Button>
        </CardContent>
      </Card>

      {/* Competencias */}
      <Card style={{ marginTop: '2rem', padding: '1rem' }}>
        <CardContent>
          <h6>{t('competitions')}</h6>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
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
          </Box>

          {competitions.map(c => (
            <Accordion
              key={c._id}
              expanded={expandedComp === c._id}
              onChange={(_, exp) => {
                setExpandedComp(exp ? c._id : null);
                if (exp && !matchesByCompetition[c._id]) loadCompetitionMatches(c);
              }}
            >
              <AccordionSummary expandIcon="▶">
                <Typography>{c.name}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {(() => {
                  const grouped = (matchesByCompetition[c._id] || []).reduce((acc, match) => {
                    const key = match.group_name?.trim() || 'Otros';
                    (acc[key] = acc[key] || []).push(match);
                    return acc;
                  }, {});
                  const groupKeys = Object.keys(grouped).filter(isGroupKey).sort(compareGroupKey);
                  const knockoutKeys = knockoutOrder.filter(label => Array.isArray(grouped[label]));
                  const knockoutSet = new Set(knockoutKeys);
                  const otherKeys = Object.keys(grouped)
                    .filter(key => !isGroupKey(key) && !knockoutSet.has(key))
                    .sort((a, b) => matchTimeValue(grouped[a]?.[0]) - matchTimeValue(grouped[b]?.[0]));
                  return (
                    <>
                      {groupKeys.map(key => (
                        <Accordion key={key} sx={{ mt: 1 }}>
                          <AccordionSummary expandIcon="▼">
                            <Typography variant="subtitle2">{key}</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <ul className="collection">
                              {grouped[key].map(match => renderMatchEditor(c, match))}
                            </ul>
                            <Button size="small" variant="outlined" sx={{ mt: 1 }} onClick={() => saveOrder(c, key)} disabled={isSaving}>
                              {t('saveOrder')}
                            </Button>
                            <Button size="small" variant="contained" sx={{ mt: 1, ml: 1 }} onClick={() => saveRound(c._id, key)} disabled={isSaving}>
                              {t('saveRound')}
                            </Button>
                            {groups[c.name]?.filter(gr => gr.group === key).length ? (
                              <GroupTable groups={groups[c.name].filter(gr => gr.group === key)} />
                            ) : null}
                          </AccordionDetails>
                        </Accordion>
                      ))}

                      {knockoutKeys.map(key => (
                        <Accordion key={key} sx={{ mt: 1 }}>
                          <AccordionSummary expandIcon="▼">
                            <Typography variant="subtitle2">{key}</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <ul className="collection">
                              {grouped[key].map(match => renderMatchEditor(c, match))}
                            </ul>
                            <Button size="small" variant="outlined" sx={{ mt: 1 }} onClick={() => saveOrder(c, key)} disabled={isSaving}>
                              {t('saveOrder')}
                            </Button>
                            <Button size="small" variant="contained" sx={{ mt: 1, ml: 1 }} onClick={() => saveRound(c._id, key)} disabled={isSaving}>
                              {t('saveRound')}
                            </Button>
                          </AccordionDetails>
                        </Accordion>
                      ))}

                      {otherKeys.map(key => (
                        <Accordion key={key} sx={{ mt: 1 }}>
                          <AccordionSummary expandIcon="▼">
                            <Typography variant="subtitle2">{key}</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <ul className="collection">
                              {grouped[key].map(match => renderMatchEditor(c, match))}
                            </ul>
                            <Button size="small" variant="outlined" sx={{ mt: 1 }} onClick={() => saveRound(c._id, key)} disabled={isSaving}>
                              {t('saveRound')}
                            </Button>
                          </AccordionDetails>
                        </Accordion>
                      ))}
                    </>
                  );
                })()}
                <TextField
                  value={c.name}
                  onChange={e => updateCompetitionField(c._id, 'name', e.target.value)}
                  size="small"
                />
                <TextField
                  type="number"
                  value={c.groupsCount ?? ''}
                  onChange={e => updateCompetitionField(c._id, 'groupsCount', e.target.value)}
                  size="small"
                  sx={{ ml: 1, width: 80 }}
                />
                <TextField
                  type="number"
                  value={c.integrantsPerGroup ?? ''}
                  onChange={e => updateCompetitionField(c._id, 'integrantsPerGroup', e.target.value)}
                  size="small"
                  sx={{ ml: 1, width: 100 }}
                />
                <TextField
                  type="number"
                  value={c.qualifiersPerGroup ?? ''}
                  onChange={e => updateCompetitionField(c._id, 'qualifiersPerGroup', e.target.value)}
                  size="small"
                  sx={{ ml: 1, width: 100 }}
                />
                <Button variant="outlined" size="small" sx={{ ml: 1 }} onClick={() => generateBracket(c)} disabled={isGenerating}>
                  {t('generateBracket')}
                </Button>
                <Button variant="outlined" size="small" sx={{ ml: 1 }} onClick={() => updateResults(c)} disabled={isUpdating}>
                  {t('updateResults')}
                </Button>
                <IconButton size="small" className="secondary-content" onClick={() => saveCompetition(c)} disabled={isSaving}>
                  <Save fontSize="small" />
                </IconButton>
                <a href="#" className="secondary-content red-text" style={{ marginLeft: '1rem' }} onClick={e => { e.preventDefault(); deleteCompetition(c._id); }}>✖</a>

                {matchesByCompetition[c._id] && Object.entries(
                  matchesByCompetition[c._id].reduce((acc, m) => {
                    const round = m.group_name || 'Otros';
                    (acc[round] = acc[round] || []).push(m);
                    return acc;
                  }, {})
                ).sort(([a], [b]) => {
                  const ai = roundOrder.indexOf(a);
                  const bi = roundOrder.indexOf(b);
                  if (ai === -1 && bi === -1) return a.localeCompare(b);
                  if (ai === -1) return 1;
                  if (bi === -1) return -1;
                  return ai - bi;
                }).map(([round, ms]) => (
                  <Accordion key={round} sx={{ mt: 1 }}>
                    <AccordionSummary expandIcon="▼">
                      <Typography variant="subtitle2">{round}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <ul className="collection">
                        {ms.map((m, idx) => (
                          <li key={m._id} className="collection-item">
                            <TextField
                              value={m.team1 || ''}
                              onChange={e => updateMatchField(c._id, m._id, 'team1', e.target.value)}
                              size="small"
                            />
                            <TextField
                              value={m.team2 || ''}
                              onChange={e => updateMatchField(c._id, m._id, 'team2', e.target.value)}
                              size="small"
                              sx={{ ml: 1 }}
                            />
                            <TextField
                              type="date"
                              value={m.date || ''}
                              onChange={e => updateMatchField(c._id, m._id, 'date', e.target.value)}
                              size="small"
                              sx={{ ml: 1 }}
                            />
                            <TextField
                              type="time"
                              value={m.time || ''}
                              onChange={e => updateMatchField(c._id, m._id, 'time', e.target.value)}
                              size="small"
                              sx={{ ml: 1 }}
                            />
                            <TextField
                              type="number"
                              value={m.result1 ?? ''}
                              onChange={e => updateMatchField(c._id, m._id, 'result1', e.target.value)}
                              size="small"
                              sx={{ ml: 1, width: 60 }}
                              inputProps={{ min: 0 }}
                            />
                            <TextField
                              type="number"
                              value={m.result2 ?? ''}
                              onChange={e => updateMatchField(c._id, m._id, 'result2', e.target.value)}
                              size="small"
                              sx={{ ml: 1, width: 60 }}
                              inputProps={{ min: 0 }}
                            />
                            <span className="secondary-content">
                              <IconButton size="small" onClick={() => saveMatch(c._id, m)} disabled={isSaving}>
                                <Save fontSize="small" />
                              </IconButton>
                            </span>
                          </li>
                        ))}
                      </ul>
                      <Button size="small" variant="outlined" sx={{ mt: 1 }} onClick={() => saveOrder(c, round)} disabled={isSaving}>
                        {t('saveOrder')}
                      </Button>
                      <Button size="small" variant="contained" sx={{ mt: 1, ml: 1 }} onClick={() => saveRound(c._id, round)} disabled={isSaving}>
                        {t('saveRound')}
                      </Button>
                      {groups[c.name]?.filter(gr => gr.group === round).length ? (
                        <GroupTable groups={groups[c.name].filter(gr => gr.group === round)} />
                      ) : null}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </AccordionDetails>
            </Accordion>
          ))}

        </CardContent>
      </Card>

      {/* Owners */}
      <Card style={{ marginTop: '2rem', padding: '1rem' }}>
        <CardContent>
          <h6>{t('owners')}</h6>
          <form onSubmit={createOwner} style={{ marginBottom: '1rem' }}>
            <TextField
              value={ownerForm.username}
              onChange={e => setOwnerForm({ ...ownerForm, username: e.target.value })}
              label={t('username')}
              required
              size="small"
            />
            <TextField
              type="password"
              value={ownerForm.password}
              onChange={e => setOwnerForm({ ...ownerForm, password: e.target.value })}
              label={t('password')}
              required
              size="small"
              sx={{ ml: 1 }}
            />
            <TextField
              type="email"
              value={ownerForm.email}
              onChange={e => setOwnerForm({ ...ownerForm, email: e.target.value })}
              label={t('email')}
              required
              size="small"
              sx={{ ml: 1 }}
            />
            <Button variant="contained" type="submit" sx={{ ml: 1 }} disabled={isSaving}>{t('create')}</Button>
          </form> 
          <ul className="collection">
            {owners.map(o => (
              <li key={o._id} className="collection-item">
                <TextField
                  value={o.username || ''}
                  onChange={e => updateOwnerField(o._id, 'username', e.target.value)}
                  size="small"
                />
                <TextField
                  type="email"
                  value={o.email || ''}
                  onChange={e => updateOwnerField(o._id, 'email', e.target.value)}
                  size="small"
                  sx={{ ml: 1 }}
                />
                <IconButton size="small" className="secondary-content" onClick={() => saveOwner(o)} disabled={isSaving}>
                  <Save fontSize="small" />
                </IconButton>
                <a href="#" className="secondary-content red-text" style={{ marginLeft: '1rem' }} onClick={e => { e.preventDefault(); deleteOwner(o._id); }}>✖</a>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Pencas */}
      <Card style={{ marginTop: '2rem', padding: '1rem' }}>
        <CardContent>
          <h6>{t('pencas')}</h6>
          <form onSubmit={createPenca} style={{ marginBottom: '1rem' }}>
            <TextField
              value={pencaForm.name}
              onChange={e => setPencaForm({ ...pencaForm, name: e.target.value })}
              label={t('name')}
              required
              size="small"
            />
            <Select
              value={pencaForm.owner}
              onChange={e => setPencaForm({ ...pencaForm, owner: e.target.value })}
              displayEmpty
              required
              size="small"
              sx={{ ml: 1, minWidth: 120 }}
            >
              <MenuItem value="" disabled>{t('owner')}</MenuItem>
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
              sx={{ ml: 1, minWidth: 120 }}
            >
              <MenuItem value="" disabled>{t('competition')}</MenuItem>
              {competitions.map(c => (
                <MenuItem key={c._id} value={c.name}>{c.name}</MenuItem>
              ))}
            </Select>
            <FormControlLabel
              control={<Checkbox checked={pencaForm.isPublic} onChange={e => setPencaForm({ ...pencaForm, isPublic: e.target.checked })} />}
              label={t('public')}
              sx={{ ml: 1 }}
            />
            <Button variant="contained" type="submit" sx={{ ml: 1 }} disabled={isSaving}>{t('create')}</Button>
          </form>
          <ul className="collection">
            {pencas.map(p => (
              <li key={p._id} className="collection-item">
                <TextField
                  value={p.name || ''}
                  onChange={e => updatePencaField(p._id, 'name', e.target.value)}
                  size="small"
                />
                <TextField
                  value={p.code || ''}
                  InputProps={{ readOnly: true }}
                  size="small"
                  sx={{ ml: 1, width: 90 }}
                />
                <Select
                  value={p.owner}
                  onChange={e => updatePencaField(p._id, 'owner', e.target.value)}
                  size="small"
                  sx={{ ml: 1, minWidth: 120 }}
                >
                  {owners.map(o => (
                    <MenuItem key={o._id} value={o._id}>{o.username}</MenuItem>
                  ))}
                </Select>
                <Select
                  value={p.competition}
                  onChange={e => updatePencaField(p._id, 'competition', e.target.value)}
                  size="small"
                  sx={{ ml: 1, minWidth: 120 }}
                >
                  {competitions.map(c => (
                    <MenuItem key={c._id} value={c.name}>{c.name}</MenuItem>
                  ))}
                </Select>
                <FormControlLabel
                  control={<Checkbox checked={p.isPublic || false} onChange={e => updatePencaField(p._id, 'isPublic', e.target.checked)} />}
                  label={t('public')}
                  sx={{ ml: 1 }}
                />
                <IconButton size="small" className="secondary-content" onClick={() => savePenca(p)} disabled={isSaving}>
                  <Save fontSize="small" />
                </IconButton>
                <a href="#" className="secondary-content red-text" style={{ marginLeft: '1rem' }} onClick={e => { e.preventDefault(); deletePenca(p._id); }}>✖</a>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <CompetitionWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={loadCompetitions}
      />
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
    </div>
  );
}
