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
  MenuItem
} from '@mui/material';
import GroupTable from './GroupTable';
import roundOrder from './roundOrder';

export default function Admin() {
  const [competitions, setCompetitions] = useState([]);
  const [owners, setOwners] = useState([]);
  const [pencas, setPencas] = useState([]);
  const [matches, setMatches] = useState([]);
  const [groups, setGroups] = useState({});

  const [newCompetition, setNewCompetition] = useState({ name: '', groupsCount: '', integrantsPerGroup: '' });
  const [competitionFile, setCompetitionFile] = useState(null);
  const [ownerForm, setOwnerForm] = useState({ username: '', password: '', email: '' });
  const [pencaForm, setPencaForm] = useState({ name: '', owner: '', competition: '' });
  const [pencaFile, setPencaFile] = useState(null);

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
      data.append('name', newCompetition.name);
      if (newCompetition.groupsCount) data.append('groupsCount', newCompetition.groupsCount);
      if (newCompetition.integrantsPerGroup) data.append('integrantsPerGroup', newCompetition.integrantsPerGroup);
      if (competitionFile) data.append('fixture', competitionFile);
      const res = await fetch('/admin/competitions', {
        method: 'POST',
        body: data
      });
      if (res.ok) {
        setNewCompetition({ name: '', groupsCount: '', integrantsPerGroup: '' });
        setCompetitionFile(null);
        loadCompetitions();
      }
    } catch (err) {
      console.error('create competition error', err);
    }
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
      const { username, email } = owner;
      const res = await fetch(`/admin/owners/${owner._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email })
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
      const resInfo = await fetch(`/matches/${match._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team1: match.team1,
          team2: match.team2,
          date: match.date,
          time: match.time
        })
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
          <form onSubmit={createCompetition} style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              label="Nombre"
              value={newCompetition.name}
              onChange={e => setNewCompetition({ ...newCompetition, name: e.target.value })}
              required
              size="small"
              sx={{ marginRight: '10px', minWidth: 200 }}
            />
            <TextField
              label="Grupos"
              type="number"
              value={newCompetition.groupsCount}
              onChange={e => setNewCompetition({ ...newCompetition, groupsCount: e.target.value })}
              size="small"
              sx={{ marginRight: '10px', width: '80px' }}
            />
            <TextField
              label="Integrantes"
              type="number"
              value={newCompetition.integrantsPerGroup}
              onChange={e => setNewCompetition({ ...newCompetition, integrantsPerGroup: e.target.value })}
              size="small"
              sx={{ marginRight: '10px', width: '100px' }}
            />
            <input
              type="file"
              accept=".json"
              onChange={e => setCompetitionFile(e.target.files[0])}
              style={{ marginRight: '10px' }}
            />
            <Button variant="contained" type="submit">Crear</Button>
          </form>

          {competitions.map(c => (
            <Accordion key={c._id} className="competition-item">
              <AccordionSummary expandIcon="▶">
                <Typography>{c.name}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TextField
                  label="... replacement truncated for brevity ..." />
              </AccordionDetails>
            </Accordion>
          ))}
        </AccordionDetails>
      </Accordion>

      {/* Owners section */}
      <Card style={{ marginTop: '2rem', padding: '1rem' }}>
        <CardContent>
          <h6>Owners</h6>
          <form onSubmit={createOwner} style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField label="Username" value={ownerForm.username} onChange={e => setOwnerForm({ ...ownerForm, username: e.target.value })} required size="small" sx={{ marginRight: '10px', minWidth: 150 }} />
            <TextField label="Password" type="password" value={ownerForm.password} onChange={e => setOwnerForm({ ...ownerForm, password: e.target.value })} required size="small" sx={{ marginRight: '10px', minWidth: 150 }} />
            <TextField label="Email" type="email" value={ownerForm.email} onChange={e => setOwnerForm({ ...ownerForm, email: e.target.value })} required size="small" sx={{ marginRight: '10px', minWidth: 200 }} />
            <Button variant="contained" type="submit">Crear</Button>
          </form>
          <ul className="collection">
            {owners.map(o => (
              <li key={o._id} className="collection-item" style={{ display: 'flex', alignItems: 'center' }}>
                <TextField value={o.username || ''} onChange={e => updateOwnerField(o._id, 'username', e.target.value)} size="small" sx={{ marginRight: '10px', minWidth: 150 }} />
                <TextField value={o.email || ''} type="email" onChange={e => updateOwnerField(o._id, 'email', e.target.value)} size="small" sx={{ marginRight: '10px', minWidth: 200 }} />
                <Button onClick={() => saveOwner(o)} size="small">💾</Button>
                <Button color="error" onClick={() => deleteOwner(o._id)} size="small" sx={{ marginLeft: '1rem' }}>✖</Button>
              </li>
            ))}
          </>
