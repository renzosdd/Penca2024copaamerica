import { useEffect, useState } from 'react';
import { Card, CardContent } from '@mui/material';

export default function OwnerPanel() {
  const [pencas, setPencas] = useState([]);
  const [rankings, setRankings] = useState({});

  useEffect(() => {
    loadData();
  }, []);

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

  return (
    <div className="container" style={{ marginTop: '2rem' }}>
      <h5>Mis Pencas</h5>
      {pencas.map(p => {
        const ranking = rankings[p._id] || [];
        return (
          <Card key={p._id} style={{ marginBottom: '1rem', padding: '1rem' }}>
            <CardContent>
              <strong>{p.name} - {p.code}</strong>
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
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
