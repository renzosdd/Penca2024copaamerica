import { useEffect, useState } from 'react';
import PencaSection from './PencaSection';


export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [pencas, setPencas] = useState([]);
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [rankings, setRankings] = useState({});
  const [groups, setGroups] = useState({});

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

        const groupsData = {};
        for (const c of comps) {
          const r = await fetch(`/groups/${encodeURIComponent(c)}`);
          if (r.ok) groupsData[c] = await r.json();
        }
        setGroups(groupsData);

        const pRes = await fetch('/predictions');
        if (pRes.ok) setPredictions(await pRes.json());

        pencas.forEach(p => loadRanking(p._id));
      } catch (err) {
        console.error('dashboard data error', err);
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



  const getPrediction = (pencaId, matchId) =>
    predictions.find(p => p.pencaId === pencaId && p.matchId === matchId && p.username === user.username);

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
        const updated = predictions.filter(p => !(p.pencaId === pencaId && p.matchId === matchId && p.username === user.username));
        updated.push({ pencaId, matchId, result1: Number(data.result1), result2: Number(data.result2), username: user.username });
        setPredictions(updated);
      }
    } catch (err) {
      console.error('save prediction error', err);
    }
  };




  return (
    <div className="container" style={{ marginTop: '2rem' }}>
      <h5>Mis Pencas</h5>
      {pencas.length === 0 && <p>No est\u00e1s en ninguna penca.</p>}
      {pencas.map(p => (
        <PencaSection
          key={p._id}
          penca={p}
          matches={matches}
          groups={groups}
          getPrediction={getPrediction}
          handlePrediction={handlePrediction}
          ranking={rankings[p._id] || []}
        />
      ))}





    </div>
  );
}
