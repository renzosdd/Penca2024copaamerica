import { useEffect, useState } from 'react';
import { Button, CircularProgress, Alert } from '@mui/material';
import PencaSection from './PencaSection';
import JoinPenca from './JoinPenca';
import useLang from './useLang';


export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [pencas, setPencas] = useState([]);
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [rankings, setRankings] = useState({});
  const [groups, setGroups] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const { t } = useLang();

  const loadDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setPencas(data.pencas || []);
      }
    } catch (err) {
      console.error('dashboard fetch error', err);
      setError(t('networkError'));
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!pencas.length) return;
      setLoading(true);
      setError('');
      try {
        const comps = Array.from(new Set(pencas.map(p => p.competition)));

        const matchResponses = await Promise.all(
          comps.map(c => fetch(`/competitions/${encodeURIComponent(c)}/matches`))
        );
        const matchesData = (
          await Promise.all(
            matchResponses.map(r => (r.ok ? r.json() : Promise.resolve([])))
          )
        ).flat();
        setMatches(matchesData);

        const groupResponses = await Promise.all(
          comps.map(c => fetch(`/groups/${encodeURIComponent(c)}`))
        );
        const groupsData = {};
        await Promise.all(
          groupResponses.map((r, idx) =>
            r.ok
              ? r
                  .json()
                  .then(data => {
                    groupsData[comps[idx]] = data;
                  })
              : Promise.resolve()
          )
        );
        setGroups(groupsData);

        const pRes = await fetch('/predictions');
        if (pRes.ok) setPredictions(await pRes.json());

        pencas.forEach(p => loadRanking(p._id));
      } catch (err) {
        console.error('dashboard data error', err);
        setError(t('networkError'));
      } finally {
        setLoading(false);
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
      setError(t('networkError'));
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
      <h5>{t('dashboardTitle')}</h5>
      {loading && <CircularProgress sx={{ display: 'block', my: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      )}
      {pencas.length === 0 && (
        <>
          <p>{t('noPencas')}</p>
          <JoinPenca onJoined={loadDashboard} />
        </>
      )}
      {pencas.map(p => (
        <PencaSection
          key={p._id}
          penca={p}
          matches={matches}
          groups={groups}
          getPrediction={getPrediction}
          handlePrediction={handlePrediction}
          ranking={rankings[p._id] || []}
          currentUsername={user?.username}
        />
      ))}
      {pencas.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <Button size="small" onClick={() => setShowJoin(!showJoin)}>
            {showJoin ? t('hide') : t('joinAnother')}
          </Button>
          {showJoin && <JoinPenca onJoined={loadDashboard} />}
        </div>
      )}

 



    </div>
  );
}
