import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import GroupTable from './GroupTable';
import roundOrder from './roundOrder';


export default function Admin() {
  const [competitions, setCompetitions] = useState([]);
  const [owners, setOwners] = useState([]);
  const [pencas, setPencas] = useState([]);
  const [matches, setMatches] = useState([]);
  const [groups, setGroups] = useState({});

  const [newCompetition, setNewCompetition] = useState('');
  const [competitionFile, setCompetitionFile] = useState(null);
  const [ownerForm, setOwnerForm] = useState({ username: '', password: '', email: '' });
  const [pencaForm, setPencaForm] = useState({ name: '', owner: '', competition: '' });

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    await Promise.all([loadCompetitions(), loadOwners(), loadPencas(), loadMatches()]);
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

  async function loadMatches() {
    try {
      const res = await fetch('/matches');
      if (res.ok) {
        const data = await res.json();
        setMatches(data);
        const comps = Array.from(new Set(data.map(m => m.competition)));
        if (comps.length) await loadGroups(comps);
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

  async function createCompetition(e) {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append('name', newCompetition);
      if (competitionFile) data.append('fixture', competitionFile);
      const res = await fetch('/admin/competitions', {
        method: 'POST',
        body: data
      });
      if (res.ok) {
        setNewCompetition('');
        setCompetitionFile(null);
        loadCompetitions();
      }
    } catch (err) {
      console.error('create competition error', err);
    }
  }

  const updateCompetitionField = (id, value) => {
    setCompetitions(cs => cs.map(c => c._id === id ? { ...c, name: value } : c));
  };

  async function saveCompetition(comp) {
    try {
      const res = await fetch(`/admin/competitions/${comp._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: comp.name })
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

  const [pencaFile, setPencaFile] = useState(null);

  async function createPenca(e) {
    e.preventDefault();
    try {
      const data = new FormData();
      Object.entries(pencaForm).forEach(([k, v]) => data.append(k, v));
      if (pencaFile) data.append('fixture', pencaFile);
      const res = await fetch('/admin/pencas', {
        method: 'POST',
        body: data
      });
      if (res.ok) {
        setPencaForm({ name: '', owner: '', competition: '' });
        setPencaFile(null);
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
      const { name, owner, competition, participantLimit } = penca;
      const res = await fetch(`/admin/pencas/${penca._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, owner, competition, participantLimit })
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

  const updateMatchField = (id, field, value) => {
    // only allow numeric values for result inputs but keep empty string
    if (field === 'result1' || field === 'result2') {
      if (value === '' || /^\d*$/.test(value)) {
        setMatches(ms => ms.map(m => m._id === id ? { ...m, [field]: value } : m));
      }
    } else {
      setMatches(ms => ms.map(m => m._id === id ? { ...m, [field]: value } : m));
    }
  };

  async function saveMatch(match) {
    try {
      const { team1, team2, date, time } = match;
      const resInfo = await fetch(`/matches/${match._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team1, team2, date, time })
      });

      const res1 = match.result1 === '' ? null : Number(match.result1);
      const res2 = match.result2 === '' ? null : Number(match.result2);
      const resScore = await fetch(`/matches/${match._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result1: res1, result2: res2 })
      });

      if (resInfo.ok && resScore.ok) loadMatches();
    } catch (err) {
      console.error('update match error', err);
    }
  }

  const matchesByCompetition = matches.reduce((acc, m) => {
    const comp = m.competition || 'Otros';
    const round = m.group_name || 'Otros';
    if (!acc[comp]) acc[comp] = {};
    if (!acc[comp][round]) acc[comp][round] = [];
    acc[comp][round].push(m);
    return acc;
  }, {});

  return (
    <div className="container" style={{ marginTop: '2rem' }}>
      <h5>Administración</h5>

      <Accordion className="admin-accordion" style={{ marginTop: '2rem' }}>
        <AccordionSummary expandIcon="▶">
          <Typography variant="subtitle1">Competencias</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <form onSubmit={createCompetition} style={{ marginBottom: '1rem' }}>
            <TextField
              label="Nombre"
              value={newCompetition}
              onChange={e => setNewCompetition(e.target.value)}
              required
              size="small"
            />
            <input
              type="file"
              accept=".json"
              onChange={e => setCompetitionFile(e.target.files[0])}
              style={{ marginLeft: '10px' }}
            />
            <Button variant="contained" type="submit" style={{ marginLeft: '10px' }}>
              Crear
            </Button>
          </form>
          {competitions.map(c => (
            <Accordion key={c._id} className="competition-item">
              <AccordionSummary expandIcon="▶">
                <Typography>{c.name}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TextField
                  value={c.name}
                  onChange={e => updateCompetitionField(c._id, e.target.value)}
                  size="small"
                  sx={{ marginRight: '10px' }}
                />
                <Button onClick={() => saveCompetition(c)} size="small">💾</Button>
                <Button color="error" onClick={() => deleteCompetition(c._id)} size="small" sx={{ marginLeft: '1rem' }}>✖</Button>
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
              label="Username"
              value={ownerForm.username}
              onChange={e => setOwnerForm({ ...ownerForm, username: e.target.value })}
              required
              size="small"
              sx={{ marginRight: '10px' }}
            />
            <TextField
              label="Password"
              type="password"
              value={ownerForm.password}
              onChange={e => setOwnerForm({ ...ownerForm, password: e.target.value })}
              required
              size="small"
              sx={{ marginRight: '10px' }}
            />
            <TextField
              label="Email"
              type="email"
              value={ownerForm.email}
              onChange={e => setOwnerForm({ ...ownerForm, email: e.target.value })}
              required
              size="small"
            />
            <Button variant="contained" type="submit" style={{ marginLeft: '10px' }}>
              Crear
            </Button>
          </form>
          <ul className="collection">
            {owners.map(o => (
              <li key={o._id} className="collection-item">
                <TextField
                  value={o.username || ''}
                  onChange={e => updateOwnerField(o._id, 'username', e.target.value)}
                  size="small"
                  sx={{ marginRight: '10px' }}
                />
                <TextField
                  value={o.email || ''}
                  type="email"
                  onChange={e => updateOwnerField(o._id, 'email', e.target.value)}
                  size="small"
                  sx={{ marginRight: '10px' }}
                />
                <Button onClick={() => saveOwner(o)} size="small">💾</Button>
                <Button color="error" onClick={() => deleteOwner(o._id)} size="small" sx={{ marginLeft: '1rem' }}>✖</Button>
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
              label="Nombre"
              value={pencaForm.name}
              onChange={e => setPencaForm({ ...pencaForm, name: e.target.value })}
              required
              size="small"
              sx={{ marginRight: '10px' }}
            />
            <TextField
              select
              label="Owner"
              value={pencaForm.owner}
              onChange={e => setPencaForm({ ...pencaForm, owner: e.target.value })}
              required
              size="small"
              sx={{ marginRight: '10px', minWidth: 120 }}
            >
              <MenuItem value="" disabled>
                Owner
              </MenuItem>
              {owners.map(o => (
                <MenuItem key={o._id} value={o._id}>{o.username}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Competencia"
              value={pencaForm.competition}
              onChange={e => setPencaForm({ ...pencaForm, competition: e.target.value })}
              required
              size="small"
              sx={{ marginRight: '10px', minWidth: 150 }}
            >
              <MenuItem value="" disabled>
                Competencia
              </MenuItem>
              {competitions.map(c => (
                <MenuItem key={c._id} value={c.name}>{c.name}</MenuItem>
              ))}
            </TextField>
            <input
              type="file"
              accept=".json"
              onChange={e => setPencaFile(e.target.files[0])}
              style={{ marginLeft: '10px' }}
            />
            <Button variant="contained" type="submit" style={{ marginLeft: '10px' }}>
              Crear
            </Button>
          </form>
          <ul className="collection">
            {pencas.map(p => (
              <li key={p._id} className="collection-item">
                <TextField
                  value={p.name || ''}
                  onChange={e => updatePencaField(p._id, 'name', e.target.value)}
                  size="small"
                  sx={{ marginRight: '10px' }}
                />
                <TextField
                  value={p.code || ''}
                  size="small"
                  InputProps={{ readOnly: true }}
                  sx={{ marginRight: '10px', width: '90px' }}
                />
                <TextField
                  select
                  value={p.owner}
                  onChange={e => updatePencaField(p._id, 'owner', e.target.value)}
                  size="small"
                  sx={{ marginRight: '10px', minWidth: 120 }}
                >
                  {owners.map(o => (
                    <MenuItem key={o._id} value={o._id}>{o.username}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  value={p.competition}
                  onChange={e => updatePencaField(p._id, 'competition', e.target.value)}
                  size="small"
                  sx={{ marginRight: '10px', minWidth: 150 }}
                >
                  {competitions.map(c => (
                    <MenuItem key={c._id} value={c.name}>{c.name}</MenuItem>
                  ))}
                </TextField>
                <Button onClick={() => savePenca(p)} size="small">💾</Button>
                <Button color="error" onClick={() => deletePenca(p._id)} size="small" sx={{ marginLeft: '1rem' }}>✖</Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card style={{ marginTop: '2rem', padding: '1rem' }}>
        <CardContent>
          <h6>Matches</h6>
          {Object.keys(matchesByCompetition).sort().map(comp => (
            <Accordion key={comp} sx={{ marginTop: '1rem' }}>

              <AccordionSummary expandIcon="\u25BC">
                <Typography variant="subtitle1">{comp}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {Object.keys(matchesByCompetition[comp])
                  .sort((a, b) => {
                    const ai = roundOrder.indexOf(a);
                    const bi = roundOrder.indexOf(b);
                    if (ai === -1 && bi === -1) return a.localeCompare(b);
                    if (ai === -1) return 1;
                    if (bi === -1) return -1;
                    return ai - bi;
                  })
                  .map(g => (
                    <Accordion key={g} sx={{ marginTop: '0.5rem', marginLeft: '1rem' }}>
                      <AccordionSummary expandIcon="\u25BC">
                        <Typography variant="subtitle2">{g}</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <ul className="collection">
                          {matchesByCompetition[comp][g].map(m => (
                            <li key={m._id} className="collection-item">
                              <TextField
                                value={m.team1 || ''}
                                onChange={e => updateMatchField(m._id, 'team1', e.target.value)}
                                size="small"
                                sx={{ marginRight: '10px' }}
                              />
                              <TextField
                                value={m.team2 || ''}
                                onChange={e => updateMatchField(m._id, 'team2', e.target.value)}
                                size="small"
                                sx={{ marginRight: '10px' }}
                              />
                              <TextField
                                type="date"
                                value={m.date || ''}
                                onChange={e => updateMatchField(m._id, 'date', e.target.value)}
                                size="small"
                                sx={{ marginRight: '10px' }}
                                InputLabelProps={{ shrink: true }}
                              />
                              <TextField
                                type="time"
                                value={m.time || ''}
                                onChange={e => updateMatchField(m._id, 'time', e.target.value)}
                                size="small"
                                sx={{ marginRight: '10px' }}
                                InputLabelProps={{ shrink: true }}
                              />
                              <TextField
                                type="number"
                                value={m.result1 ?? ''}
                                onChange={e => updateMatchField(m._id, 'result1', e.target.value)}
                                size="small"
                                sx={{ marginRight: '10px', width: '60px' }}
                              />
                              <TextField
                                type="number"
                                value={m.result2 ?? ''}
                                onChange={e => updateMatchField(m._id, 'result2', e.target.value)}
                                size="small"
                                sx={{ marginRight: '10px', width: '60px' }}
                              />
                              <Button onClick={() => saveMatch(m)} size="small">💾</Button>
                            </li>
                          ))}
                        </ul>
                        {(() => {
                          const t = groups[comp]?.filter(gr => gr.group === g) || [];
                          return t.length ? <GroupTable groups={t} /> : null;
                        })()}
                      </AccordionDetails>
                    </Accordion>
                  ))}
              </AccordionDetails>
            </Accordion>
          ))}
        </CardContent>
      </Card>
  </div>
  );
}
