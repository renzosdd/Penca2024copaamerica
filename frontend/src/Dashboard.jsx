import { useEffect, useState } from 'react';
import { Button, CircularProgress, Alert, Container, Stack, Typography, Box } from '@mui/material';
import PencaSection from './PencaSection';
import JoinPenca from './JoinPenca';
import ProfileForm from './ProfileForm';
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
  const [showProfile, setShowProfile] = useState(false);
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
      const result = await res.json();
      if (res.ok) {
        const updated = predictions.filter(
          p => !(p.pencaId === pencaId && p.matchId === matchId && p.username === user.username)
        );
        updated.push({ pencaId, matchId, result1: Number(data.result1), result2: Number(data.result2), username: user.username });
        setPredictions(updated);
        return { success: true, message: result.message || 'OK' };
      }
      return { success: false, error: result.error || 'Error' };
    } catch (err) {
      console.error('save prediction error', err);
      return { success: false, error: t('networkError') };
    }
  };




  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h5">{t('dashboardTitle')}</Typography>
          {user && (
            <Button size="small" onClick={() => setShowProfile(!showProfile)}>
              {showProfile ? t('hide') : t('editProfile')}
            </Button>
          )}
        </Box>

        {showProfile && <ProfileForm user={user} onUpdated={loadDashboard} />}

        {loading && <CircularProgress sx={{ alignSelf: 'center' }} />}

        {error && (
          <Alert severity="error" sx={{ maxWidth: 480 }}>
            {error}
          </Alert>
        )}

        {pencas.length === 0 && (
          <Stack spacing={2} alignItems="flex-start">
            <Typography variant="body1">{t('noPencas')}</Typography>
            <JoinPenca onJoined={loadDashboard} />
          </Stack>
        )}

        {pencas.length > 0 && (
          <Stack spacing={3}>
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
            <Box>
              <Button size="small" onClick={() => setShowJoin(!showJoin)}>
                {showJoin ? t('hide') : t('joinAnother')}
              </Button>
              {showJoin && (
                <Box sx={{ mt: 2 }}>
                  <JoinPenca onJoined={loadDashboard} />
                </Box>
              )}
            </Box>
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
