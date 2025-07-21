import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Button,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography
} from '@mui/material';

export default function OwnerPanel() {
  const [pencas, setPencas] = useState([]);
  const [rankings, setRankings] = useState({});
  const [matches, setMatches] = useState([]);
  const [expandedPenca, setExpandedPenca] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    async function loadMatches() {
      try {
        const comps = Array.from(new Set(pencas.map(p => p.competition)));
        const data = [];
        for (const c of comps) {
          const r = await fetch(`/competitions/${encodeURIComponent(c)}/matches`);
          if (r.ok) {
            const list = await r.json();
            data.push(...list);
          }
        }
        setMatches(data);
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

  const autoRules = s => `${s.exact} puntos por resultado exacto, ${s.outcome} por acertar ganador o empate y ${s.goals} por acertar goles de un equipo`;

  const updateField = (id, field, value) => {
    setPencas(ps => ps.map(p => p._id === id ? { ...p, [field]: value } : p));
  };

  const updateScoring = (id, key, val) => {
    setPencas(ps => ps.map(p => {
      if (p._id !== id) return p;
      const scoring = { ...p.scoring, [key]: Number(val) };
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

  const filterMatches = p => {
    let list = [];
    if (Array.isArray(p.fixture) && p.fixture.length) {
      list = matches.filter(m => p.fixture.includes(m._id));
    } else {
      list = matches.filter(m => m.competition === p.competition);
    }
    list.sort(
      (a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`)
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
      {pencas.map(p => {
        const ranking = rankings[p._id] || [];
        const pMatches = filterMatches(p);
        return (
          <Accordion
            key={p._id}
            expanded={expandedPenca === p._id}
            onChange={(_, exp) => setExpandedPenca(exp ? p._id : null)}
            sx={{ marginBottom: '1rem' }}
          >
            <AccordionSummary expandIcon="▶">
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Typography component="span" fontWeight="bold" sx={{ mr: 1 }}>{p.name} - {p.code}</Typography>
                <FormControlLabel
                  control={<Checkbox checked={p.isPublic || false} onChange={e => togglePublic(p._id, e.target.checked)} onClick={e => e.stopPropagation()} onFocus={e => e.stopPropagation()} />}
                  label="Pública"
                />
              </div>
            </AccordionSummary>
            <AccordionDetails>
              {Object.keys(pMatches)
                .filter(g => g.startsWith('Grupo'))
                .sort()
                .map(g => (
                  <div key={g} style={{ marginBottom: '1rem' }}>
                    <h6>{g}</h6>
                    {pMatches[g].map(m => (
                      <Card key={m._id} className="match-card">
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
                            {m.result1 !== undefined && m.result2 !== undefined ? (
                              <strong>{m.result1} - {m.result2}</strong>
                            ) : (
                              <span>{m.date} {m.time}</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ))}

              {['Cuartos de final', 'Semifinales', 'Tercer puesto', 'Final']
                .filter(r => pMatches[r])
                .map(r => (
                  <div key={r} style={{ marginBottom: '1rem' }}>
                    <h6>{r}</h6>
                    {pMatches[r].map(m => (
                      <Card key={m._id} className="match-card">
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
                            {m.result1 !== undefined && m.result2 !== undefined ? (
                              <strong>{m.result1} - {m.result2}</strong>
                            ) : (
                              <span>{m.date} {m.time}</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ))}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <TextField
                  label="Exacto"
                  type="number"
                  size="small"
                  value={p.scoring?.exact ?? 0}
                  onChange={e => updateScoring(p._id, 'exact', e.target.value)}
                />
                <TextField
                  label="Ganador"
                  type="number"
                  size="small"
                  value={p.scoring?.outcome ?? 0}
                  onChange={e => updateScoring(p._id, 'outcome', e.target.value)}
                />
                <TextField
                  label="Goles"
                  type="number"
                  size="small"
                  value={p.scoring?.goals ?? 0}
                  onChange={e => updateScoring(p._id, 'goals', e.target.value)}
                />
              </div>

              <TextField
                label="Reglamento"
                value={p.rules || ''}
                onChange={e => updateField(p._id, 'rules', e.target.value)}
                multiline
                fullWidth
                size="small"
                sx={{ mt: 1 }}
              />
              <TextField
                label="Premios"
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
                sx={{ mt: 1 }}
                onClick={() => saveInfo(p._id)}
              >
                Guardar
              </Button>
              <h6>Solicitudes</h6>
              <ul className="collection">
                {p.pendingRequests.map(u => (
                  <li key={u._id || u} className="collection-item">
                    {u.username || u}
                    <a href="#" className="secondary-content" onClick={e => { e.preventDefault(); approve(p._id, u._id || u); }}>✔</a>
                  </li>
                ))}
              </ul>
              <h6>Participantes</h6>
              <ul className="collection">
                {p.participants.map(u => (
                  <li key={u._id || u} className="collection-item">
                    {u.username || u}
                    <a href="#" className="secondary-content red-text" onClick={e => { e.preventDefault(); removeParticipant(p._id, u._id || u); }}>✖</a>
                  </li>
                ))}
              </ul>
              <h6>Ranking</h6>
              <ul className="collection">
                {ranking.map((u, idx) => (
                  <li key={u.userId} className={`collection-item rank-${idx + 1}`.trim()}>
                    <img src={u.avatar} alt={u.username} className="avatar-small" /> {u.username} - {u.score}
                  </li>
                ))}
              </ul>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </div>
  );
}
