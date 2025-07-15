import { useEffect, useState } from 'react';
import { Card, CardContent, Button } from '@mui/material';

export default function OwnerPanel() {
  const [pencas, setPencas] = useState([]);
  const [rankings, setRankings] = useState({});
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    async function loadMatches() {
      try {
        const res = await fetch('/matches');
        if (res.ok) setMatches(await res.json());
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
          <Card key={p._id} style={{ marginBottom: '1rem', padding: '1rem' }}>
            <CardContent>
              <strong>{p.name} - {p.code}</strong>
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
              <h6>Solicitudes</h6>
              <ul className="collection">
                {p.pendingRequests.map(u => (
                  <li key={u._id || u} className="collection-item">
                    {u.username || u}
                    <Button onClick={() => approve(p._id, u._id || u)} size="small">✔</Button>
                  </li>
                ))}
              </ul>
              <h6>Participantes</h6>
              <ul className="collection">
                {p.participants.map(u => (
                  <li key={u._id || u} className="collection-item">
                    {u.username || u}
                    <Button color="error" onClick={() => removeParticipant(p._id, u._id || u)} size="small">✖</Button>
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
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
