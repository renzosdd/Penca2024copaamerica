import { useEffect, useState } from 'react';

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
        const [mRes, pRes] = await Promise.all([
          fetch('/matches'),
          fetch('/predictions')
        ]);
        if (mRes.ok) setMatches(await mRes.json());
        if (pRes.ok) setPreds(await pRes.json());
        pencas.forEach(p => loadRanking(p._id));
        if (user && user.role === 'owner') loadOwnerPencas();
      } catch (err) {
        console.error('load matches/preds error', err);
      }
    }
    loadData();
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
    if (Array.isArray(p.fixture) && p.fixture.length) {
      return matches.filter(m => p.fixture.includes(m._id));
    }
    return matches.filter(m => m.competition === p.competition);
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
            <div
              style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
              onClick={() => setOpen(open === p._id ? null : p._id)}
            >
              <strong>{p.name}</strong>
            </div>
            {open === p._id && (
              <div style={{ border: '1px solid #ccc', borderTop: 'none', padding: '1rem' }}>
                {pMatches.map(m => {
                  const pr = getPrediction(p._id, m._id) || {};
                  return (
                    <div key={m._id} className={pr.result1 !== undefined ? 'match-card saved' : 'match-card'}>
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
                            <input name="result1" type="number" defaultValue={pr.result1 || ''} required />
                            <span>-</span>
                            <input name="result2" type="number" defaultValue={pr.result2 || ''} required />
                          </div>
                          <button className="btn" type="submit">Guardar</button>
                        </form>
                      </div>
                    </div>
                  );
                })}
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
              </div>
            )}
          </div>
        );
      })}

      {user && user.role === 'user' && (
        <div style={{ marginTop: '2rem' }}>
          <h6>Unirse a una Penca</h6>
          <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Código" />
          <button className="btn" onClick={handleJoin} style={{ marginLeft: '10px' }}>Solicitar</button>
          {joinMsg && <div style={{ marginTop: '0.5rem' }}>{joinMsg}</div>}
        </div>
      )}

      {user && user.role === 'owner' && ownerPencas.map(op => (
        <div key={op._id} style={{ marginTop: '2rem' }}>
          <h6>{op.name}</h6>
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
