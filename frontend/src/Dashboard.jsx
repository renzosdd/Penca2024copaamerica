import { useEffect, useState } from 'react';
import GroupTable from './GroupTable';
import EliminationBracket from './EliminationBracket';
import { Button, Card, CardContent, TextField } from '@mui/material';
import MUIBracket from './MUIBracket';
import roundOrder from './roundOrder';


export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [pencas, setPencas] = useState([]);
  const [matches, setMatches] = useState([]);
  const [preds, setPreds] = useState([]);
  const [rankings, setRankings] = useState({});
  const [open, setOpen] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinMsg, setJoinMsg] = useState('');
  const [ownerPencas, setOwnerPencas] = useState([]);
  const [groups, setGroups] = useState({});
  const [bracket, setBracket] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setPencas(data.pencas || []);
        }
      } catch (err) {
        console.error('dashboard fetch error', err);
      }
    }
    load();
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!pencas.length) return;
      try {
        const comps = Array.from(new Set(pencas.map(p => p.competition)));
        const matchesData = [];
        for (const c of comps) {
          const r = await fetch(`/competitions/${encodeURIComponent(c)}/matches`);
          if (r.ok) {
            const list = await r.json();
            matchesData.push(...list);
          }
        }
        setMatches(matchesData);
        if (comps.length) await loadGroups(comps);

        const pRes = await fetch('/predictions');
        if (pRes.ok) setPreds(await pRes.json());
        pencas.forEach(p => loadRanking(p._id));
        if (user && user.role === 'owner') loadOwnerPencas();
      } catch (err) {
        console.error('load matches/preds error', err);
      }
    }
    loadData();
  }, [pencas]);

  useEffect(() => {
    async function loadExtras() {
      if (!pencas.length) return;
      const comp = pencas[0].competition;
      try {
        const res = await fetch(`/bracket/${encodeURIComponent(comp)}`);
        if (res.ok) setBracket(await res.json());
      } catch (err) {
        console.error('extra data error', err);
      }
    }
    loadExtras();
  }, [pencas]);

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

  async function loadOwnerPencas() {
    try {
      const res = await fetch('/pencas/mine');
      if (res.ok) {
        setOwnerPencas(await res.json());
      }
    } catch (err) {
      console.error('owner pencas error', err);
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

  const getPrediction = (pencaId, matchId) =>
    preds.find(p => p.pencaId === pencaId && p.matchId === matchId && p.username === user.username);

  const handlePrediction = async (e, pencaId, matchId) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
      const res = await fetch('/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, pencaId, matchId })
      });
      if (res.ok) {
        const updated = preds.filter(p => !(p.pencaId === pencaId && p.matchId === matchId && p.username === user.username));
        updated.push({ pencaId, matchId, result1: Number(data.result1), result2: Number(data.result2), username: user.username });
        setPreds(updated);
      }
    } catch (err) {
      console.error('save prediction error', err);
    }
  };

  const handleJoin = async () => {
    setJoinMsg('');
    try {
      const res = await fetch('/pencas/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode })
      });
      const data = await res.json();
      setJoinMsg(data.message || data.error || 'Error');
    } catch (err) {
      setJoinMsg('Error');
    }
  };

  const approve = async (pencaId, userId) => {
    try {
      const res = await fetch(`/pencas/approve/${pencaId}/${userId}`, { method: 'POST' });
      if (res.ok) loadOwnerPencas();
    } catch (err) {
      console.error('approve error', err);
    }
  };

  const removeParticipant = async (pencaId, userId) => {
    try {
      const res = await fetch(`/pencas/participant/${pencaId}/${userId}`, { method: 'DELETE' });
      if (res.ok) loadOwnerPencas();
    } catch (err) {
      console.error('remove participant error', err);
    }
  };

  const filterMatches = p => {
    let list = [];
    if (Array.isArray(p.fixture) && p.fixture.length) {
      list = matches.filter(m => p.fixture.includes(m._id));
    } else {
      list = matches.filter(m => m.competition === p.competition);
    }
    list.sort(
      (a, b) =>
        new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`)
    );
    const grouped = {};
    list.forEach(m => {
      const g = m.group_name || 'Otros';
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(m);
    });
    return grouped;
  };

  return (
    <div className="container" style={{ marginTop: '2rem' }}>
      <h5>Mis Pencas</h5>
      {pencas.length === 0 && <p>No est\u00e1s en ninguna penca.</p>}
      {pencas.map(p => {
        const pMatches = filterMatches(p);
        const ranking = rankings[p._id] || [];
        return (
          <div key={p._id} style={{ marginBottom: '1rem' }}>
            <Card
              style={{ padding: '1rem', cursor: 'pointer' }}
              onClick={() => setOpen(open === p._id ? null : p._id)}
            >
              <CardContent>
                <strong>{p.name}</strong>
              </CardContent>
            </Card>
            {open === p._id && (
              <Card style={{ marginTop: '0', borderTop: 'none', padding: '1rem' }}>
                <CardContent>
                {Object.keys(pMatches)
                  .filter(g => g.startsWith('Grupo'))
                  .sort((a, b) => {
                    const ai = roundOrder.indexOf(a);
                    const bi = roundOrder.indexOf(b);
                    if (ai === -1 && bi === -1) return a.localeCompare(b);
                    if (ai === -1) return 1;
                    if (bi === -1) return -1;
                    return ai - bi;
                  })
                  .map(g => (
                    <div key={g} style={{ marginBottom: '1rem' }}>
                      <h6>{g}</h6>
                      {pMatches[g].map(m => {
                        const pr = getPrediction(p._id, m._id) || {};
                        return (
                          <Card key={m._id} className={pr.result1 !== undefined ? 'match-card saved' : 'match-card'}>
                            <CardContent>
                              <div className="match-header">
                                <div className="team">
                                  <img src={`/images/${m.team1.replace(/\s+/g, '').toLowerCase()}.png`} alt={m.team1} className="circle responsive-img" />
                                  <span className="team-name">{m.team1}</span>
                                </div>
                                <span className="vs">vs</span>
                                <div className="team">
                                  <img src={`/images/${m.team2.replace(/\s+/g, '').toLowerCase()}.png`} alt={m.team2} className="circle responsive-img" />
                                  <span className="team-name">{m.team2}</span>
                                </div>
                              </div>
                              <div className="match-details">
                                <form onSubmit={e => handlePrediction(e, p._id, m._id)}>
                                  <div className="input-field inline">
                                    <TextField
                                      name="result1"
                                      type="number"
                                      defaultValue={pr.result1 || ''}
                                      required
                                      size="small"
                                      sx={{ width: 60 }}
                                    />
                                    <span>-</span>
                                    <TextField
                                      name="result2"
                                      type="number"
                                      defaultValue={pr.result2 || ''}
                                      required
                                      size="small"
                                      sx={{ width: 60, ml: 1 }}
                                    />
                                  </div>
                                  <Button variant="contained" type="submit">Guardar</Button>
                                </form>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                      {(() => {
                        const comp = p.competition;
                        const t = groups[comp]?.filter(gr => gr.group === g) || [];
                        return t.length ? <GroupTable groups={t} /> : null;
                      })()}
                    </div>
                  ))}

                {!bracket && (
                  <div style={{ marginTop: '1rem' }}>
                    <h6>Eliminatorias</h6>
                    {roundOrder
                      .slice(4)
                      .filter(r => pMatches[r])
                      .map(r => (
                        <div key={r} style={{ marginBottom: '1rem' }}>
                          <h6>{r}</h6>
                          {pMatches[r].map(m => {
                            const pr = getPrediction(p._id, m._id) || {};
                            return (
                              <Card key={m._id} className={pr.result1 !== undefined ? 'match-card saved' : 'match-card'}>
                                <CardContent>
                                  <div className="match-header">
                                    <div className="team">
                                      <img src={`/images/${m.team1.replace(/\s+/g, '').toLowerCase()}.png`} alt={m.team1} className="circle responsive-img" />
                                      <span className="team-name">{m.team1}</span>
                                    </div>
                                    <span className="vs">vs</span>
                                    <div className="team">
                                      <img src={`/images/${m.team2.replace(/\s+/g, '').toLowerCase()}.png`} alt={m.team2} className="circle responsive-img" />
                                      <span className="team-name">{m.team2}</span>
                                    </div>
                                  </div>
                                  <div className="match-details">
                                    <form onSubmit={e => handlePrediction(e, p._id, m._id)}>
                                      <div className="input-field inline">
                                        <TextField
                                          name="result1"
                                          type="number"
                                          defaultValue={pr.result1 || ''}
                                          required
                                          size="small"
                                          sx={{ width: 60 }}
                                        />
                                        <span>-</span>
                                        <TextField
                                          name="result2"
                                          type="number"
                                          defaultValue={pr.result2 || ''}
                                          required
                                          size="small"
                                          sx={{ width: 60, ml: 1 }}
                                        />
                                      </div>
                                      <Button variant="contained" type="submit">Guardar</Button>
                                    </form>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      ))}
                  </div>
                )}

                <div style={{ marginTop: '1rem' }}>
                  <h6>Ranking</h6>
                  <ul className="collection">
                    {ranking.map((u, idx) => (
                      <li key={u.userId} className={`collection-item rank-${idx + 1}`.trim()}>
                        <img src={u.avatar} alt={u.username} className="avatar-small" /> {u.username} - {u.score}
                      </li>
                    ))}
                  </ul>
                </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
      })}


      {bracket && (
        <div style={{ marginTop: '2rem' }}>
          <h5>Eliminatorias</h5>
          <EliminationBracket bracket={bracket} />
          <MUIBracket bracket={bracket} />
        </div>
      )}

      {user && user.role === 'user' && (
        <div style={{ marginTop: '2rem' }}>
          <h6>Unirse a una Penca</h6>
          <TextField
            value={joinCode}
            onChange={e => setJoinCode(e.target.value)}
            label="Código"
            size="small"
          />
          <Button variant="contained" onClick={handleJoin} sx={{ ml: 1 }}>Solicitar</Button>
          {joinMsg && <div style={{ marginTop: '0.5rem' }}>{joinMsg}</div>}
        </div>
      )}

      {user && user.role === 'owner' && ownerPencas.map(op => (
        <div key={op._id} style={{ marginTop: '2rem' }}>
          <h6>{op.name} - {op.code}</h6>
          <h6>Solicitudes</h6>
          <ul className="collection">
            {op.pendingRequests.map(u => (
              <li key={u._id || u} className="collection-item">
                {u.username || u}
                <a href="#" className="secondary-content" onClick={e => { e.preventDefault(); approve(op._id, u._id || u); }}>✔</a>
              </li>
            ))}
          </ul>
          <h6>Participantes</h6>
          <ul className="collection">
            {op.participants.map(u => (
              <li key={u._id || u} className="collection-item">
                {u.username || u}
                <a href="#" className="secondary-content red-text" onClick={e => { e.preventDefault(); removeParticipant(op._id, u._id || u); }}>✖</a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
