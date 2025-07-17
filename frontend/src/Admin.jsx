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
  FormControlLabel
} from '@mui/material';
import GroupTable from './GroupTable';
import roundOrder from './roundOrder';
import CompetitionWizard from './CompetitionWizard';


export default function Admin() {
  const [competitions, setCompetitions] = useState([]);
  const [owners, setOwners] = useState([]);
  const [pencas, setPencas] = useState([]);
  const [matchesByCompetition, setMatchesByCompetition] = useState({});
  const [groups, setGroups] = useState({});
  const [expandedComp, setExpandedComp] = useState(null);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [ownerForm, setOwnerForm] = useState({ username: '', password: '', email: '' });
  const [pencaForm, setPencaForm] = useState({ name: '', owner: '', competition: '', isPublic: false });


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
      const res = await fetch(`/admin/competitions/${comp._id}/matches`);
      if (res.ok) {
        const data = await res.json();
        setMatchesByCompetition(ms => ({ ...ms, [comp._id]: data }));
        if (data.length) await loadGroups([comp.name]);
      }
      setMatches(data);
      if (comps.length) await loadGroups(comps);
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
    try {
      const res = await fetch(`/admin/competitions/${comp._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: comp.name,
          groupsCount: comp.groupsCount === '' ? null : Number(comp.groupsCount),
          integrantsPerGroup: comp.integrantsPerGroup === '' ? null : Number(comp.integrantsPerGroup)
        })
      });
      if (res.ok) loadCompetitions();
    } catch (err) {
      console.error('update competition error', err);
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


  async function createOwner(e) {
    e.preventDefault();
    try {
      const res = await fetch('/admin/owners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ownerForm)
      });
      if (res.ok) {
        setOwnerForm({ username: '', password: '', email: '' });
        loadOwners();
      }
    } catch (err) {
      console.error('create owner error', err);
    }
  }

  const updateOwnerField = (id, field, value) => {
    setOwners(os => os.map(o => o._id === id ? { ...o, [field]: value } : o));
  };

  async function saveOwner(owner) {
    try {
      const { username, email, name, surname } = owner;
      const res = await fetch(`/admin/owners/${owner._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, name, surname })
      });
      if (res.ok) loadOwners();
    } catch (err) {
      console.error('update owner error', err);
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
    try {
      const res = await fetch('/admin/pencas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pencaForm)
      });
      if (res.ok) {
        const comp = competitions.find(c => c.name === pencaForm.competition);
        if (comp) loadCompetitionMatches(comp);
        setPencaForm({ name: '', owner: '', competition: '', isPublic: false });
        loadPencas();
      }
    } catch (err) {
      console.error('create penca error', err);
    }
  }

  const updatePencaField = (id, field, value) => {
    setPencas(ps => ps.map(p => p._id === id ? { ...p, [field]: value } : p));
  };

  async function savePenca(penca) {
    try {
      const { name, owner, competition, participantLimit, isPublic } = penca;
      const res = await fetch(`/admin/pencas/${penca._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, owner, competition, participantLimit, isPublic })
      });
      if (res.ok) loadPencas();
    } catch (err) {
      console.error('update penca error', err);
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
    // only allow numeric values for result inputs but keep empty string
    if (field === 'result1' || field === 'result2') {
      if (value === '' || /^\d*$/.test(value)) {
        setMatchesByCompetition(ms => ({
          ...ms,
          [compId]: ms[compId].map(m => m._id === id ? { ...m, [field]: value } : m)
        }));
      }
    } else {
      setMatchesByCompetition(ms => ({
        ...ms,
        [compId]: ms[compId].map(m => m._id === id ? { ...m, [field]: value } : m)
      }));
    }
  };

  async function saveMatch(compId, match) {
    try {
      const { team1, team2, date, time } = match;
      const resInfo = await fetch(`/admin/competitions/${compId}/matches/${match._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team1, team2, date, time })
      });

      const res1 = match.result1 === '' ? null : Number(match.result1);
      const res2 = match.result2 === '' ? null : Number(match.result2);
      const resScore = await fetch(`/admin/competitions/${compId}/matches/${match._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result1: res1, result2: res2 })
      });

      if (resInfo.ok && resScore.ok) loadCompetitionMatches({ _id: compId, name: match.competition });
    } catch (err) {
      console.error('update match error', err);
    }
  }

  return (
    <div className="container" style={{ marginTop: '2rem' }}>
      <h5>Administración</h5>

      <Card style={{ marginTop: '2rem', padding: '1rem' }}>
        <CardContent>
          <h6>Competencias</h6>
          <Button variant="contained" type="button" onClick={() => setWizardOpen(true)} sx={{ mb: 2 }}>
            Nueva competencia
          </Button>

          {competitions.map(c => (
            <Accordion
              key={c._id}
              className="competition-item"
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
                <a href="#" className="secondary-content" onClick={e => { e.preventDefault(); saveCompetition(c); }}>💾</a>
                <a href="#" className="secondary-content red-text" style={{ marginLeft: '1rem' }} onClick={e => { e.preventDefault(); deleteCompetition(c._id); }}>✖</a>

                {matchesByCompetition[c._id] && Object.keys(
                  matchesByCompetition[c._id].reduce((acc, m) => {
                    const round = m.group_name || 'Otros';
                    if (!acc[round]) acc[round] = [];
                    acc[round].push(m);
                    return acc;
                  }, {})
                ).sort((a, b) => {
                  const ai = roundOrder.indexOf(a);
                  const bi = roundOrder.indexOf(b);
                  if (ai === -1 && bi === -1) return a.localeCompare(b);
                  if (ai === -1) return 1;
                  if (bi === -1) return -1;
                  return ai - bi;
                }).map(g => {
                  const matches = matchesByCompetition[c._id].filter(m => (m.group_name || 'Otros') === g);
                  return (
                    <Accordion key={g} sx={{ marginTop: '0.5rem' }}>
                      <AccordionSummary expandIcon="\u25BC">
                        <Typography variant="subtitle2">{g}</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <ul className="collection">
                          {matches.map(m => (
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
                              />
                              <TextField
                                type="number"
                                value={m.result2 ?? ''}
                                onChange={e => updateMatchField(c._id, m._id, 'result2', e.target.value)}
                                size="small"
                                sx={{ ml: 1, width: 60 }}
                              />
                              <a href="#" className="secondary-content" onClick={e => { e.preventDefault(); saveMatch(c._id, m); }}>💾</a>
                            </li>
                          ))}
                        </ul>
                        {(() => {
                          const t = groups[c.name]?.filter(gr => gr.group === g) || [];
                          return t.length ? <GroupTable groups={t} /> : null;
                        })()}
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              {/* close competition accordion */}
              </AccordionDetails>
            </Accordion>
          ))}
        </AccordionDetails>
      </Accordion>


      <Card style={{ marginTop: '2rem', padding: '1rem' }}>
        <CardContent>
          <h6>Owners</h6>
          <form onSubmit={createOwner} style={{ marginBottom: '1rem' }}>
            <TextField
              value={ownerForm.username}
              onChange={e => setOwnerForm({ ...ownerForm, username: e.target.value })}
              label="Username"
              required
              size="small"
            />
            <TextField
              type="password"
              value={ownerForm.password}
              onChange={e => setOwnerForm({ ...ownerForm, password: e.target.value })}
              label="Password"
              required
              size="small"
              sx={{ ml: 1 }}
            />
            <TextField
              type="email"
              value={ownerForm.email}
              onChange={e => setOwnerForm({ ...ownerForm, email: e.target.value })}
              label="Email"
              required
              size="small"
              sx={{ ml: 1 }}
            />
            <Button variant="contained" type="submit" sx={{ ml: 1 }}>Crear</Button>
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
                <a href="#" className="secondary-content" onClick={e => { e.preventDefault(); saveOwner(o); }}>💾</a>
                <a href="#" className="secondary-content red-text" style={{ marginLeft: '1rem' }} onClick={e => { e.preventDefault(); deleteOwner(o._id); }}>✖</a>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card style={{ marginTop: '2rem', padding: '1rem' }}>
        <CardContent>
          <h6>Pencas</h6>
          <form onSubmit={createPenca} style={{ marginBottom: '1rem' }}>
            <TextField
              value={pencaForm.name}
              onChange={e => setPencaForm({ ...pencaForm, name: e.target.value })}
              label="Nombre"
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
              <MenuItem value="" disabled>Owner</MenuItem>
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
              <MenuItem value="" disabled>Competencia</MenuItem>

              {competitions.map(c => (
                <MenuItem key={c._id} value={c.name}>{c.name}</MenuItem>
              ))}
            </Select>
            <FormControlLabel
              control={<Checkbox checked={pencaForm.isPublic} onChange={e => setPencaForm({ ...pencaForm, isPublic: e.target.checked })} />}
              label="Pública"
              style={{ marginLeft: '10px' }}
            />

            <Button variant="contained" type="submit" sx={{ ml: 1 }}>Crear</Button>
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
                  label="Pública"
                  style={{ marginLeft: '10px' }}
                />
                <a href="#" className="secondary-content" onClick={e => { e.preventDefault(); savePenca(p); }}>💾</a>
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
  </div>
  );
}
