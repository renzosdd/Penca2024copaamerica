import { useEffect, useState } from 'react';
import {
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

  const { t } = useLang();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [ownerForm, setOwnerForm] = useState({ username: '', password: '', email: '' });
  const [pencaForm, setPencaForm] = useState({ name: '', owner: '', competition: '', isPublic: false });
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    await Promise.all([loadCompetitions(), loadOwners(), loadPencas()]);
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

  async function loadCompetitionMatches(comp) {
    try {
      const res = await fetch(`/admin/competitions/${encodeURIComponent(comp.name)}/matches`);
      if (!res.ok) return;
      const data = await res.json();
      data.forEach((m, i) => {
        if (m.order === undefined || m.order === null) m.order = i;
      });
      setMatchesByCompetition(ms => ({ ...ms, [comp._id]: data }));
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
    if (field === 'result1' || field === 'result2') {
      if (value === '' || /^\d*$/.test(value)) {
        setMatchesByCompetition(ms => ({
          ...ms,
          [compId]: ms[compId].map(m => m._id === id ? { ...m, [field]: value } : m),
        }));
      }
    } else {
      setMatchesByCompetition(ms => ({
        ...ms,
        [compId]: ms[compId].map(m => m._id === id ? { ...m, [field]: value } : m),
      }));
    }
  };

  async function saveMatch(compId, match, skipRefresh = false) {
    setIsSaving(true);
    try {
      const { team1, team2, date, time } = match;
      const resInfo = await fetch(`/admin/competitions/${encodeURIComponent(match.competition)}/matches/${match._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team1, team2, date, time }),
      });

      const res1 = match.result1 === '' ? null : Number(match.result1);
      const res2 = match.result2 === '' ? null : Number(match.result2);
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

  return (
    <div className="container" style={{ marginTop: '2rem' }}>
      <h5>{t('adminTitle')}</h5>

      {/* Competencias */}
      <Card style={{ marginTop: '2rem', padding: '1rem' }}>
        <CardContent>
          <h6>{t('competitions')}</h6>
          <Button variant="contained" onClick={() => setWizardOpen(true)} sx={{ mb: 2 }}>
            {t('newCompetition')}
          </Button>

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
