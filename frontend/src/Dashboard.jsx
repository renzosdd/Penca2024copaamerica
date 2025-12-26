import { useCallback, useEffect, useState } from 'react';
import { Button, CircularProgress, Alert, Container, Stack, Typography, Box } from '@mui/material';
import PencaSection from './PencaSection';
import ProfileForm from './ProfileForm';
import useLang from './useLang';


export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [penca, setPenca] = useState(null);
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const { t } = useLang();

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setPenca(data.penca || null);
        setMatches([]);
        setGroups([]);
      } else {
        setError(t('networkError'));
      }
    } catch (err) {
      console.error('dashboard fetch error', err);
      setError(t('networkError'));
    }
  }, [t]);

  const loadRanking = useCallback(async () => {
    try {
      const res = await fetch('/ranking');
      if (res.ok) {
        const data = await res.json();
        setRanking(data);
      }
    } catch (err) {
      console.error('ranking error', err);
      setError(t('networkError'));
    }
  }, [t]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    async function loadBaseData() {
      if (!penca) {
        setMatches([]);
        setGroups([]);
        setPredictions([]);
        setRanking([]);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const [pRes, rankingRes, matchesRes, groupsRes] = await Promise.all([
          fetch('/predictions'),
          fetch('/ranking'),
          fetch('/matches'),
          fetch('/groups')
        ]);
        if (pRes.ok) {
          setPredictions(await pRes.json());
        }
        if (rankingRes.ok) {
          setRanking(await rankingRes.json());
        }
        if (matchesRes.ok) {
          setMatches(await matchesRes.json());
        }
        if (groupsRes.ok) {
          setGroups(await groupsRes.json());
        }
      } catch (err) {
        console.error('dashboard data error', err);
        setError(t('networkError'));
      } finally {
        setLoading(false);
      }
    }
    loadBaseData();
  }, [penca, t]);

  const getPrediction = useCallback((pencaId, matchId) => {
    if (!user) return undefined;
    return predictions.find(
      p => p.pencaId === pencaId && p.matchId === matchId && p.username === user.username
    );
  }, [predictions, user]);

  const handlePrediction = async (e, pencaId, matchId) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
      const res = await fetch('/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, matchId })
      });
      const result = await res.json();
      if (res.ok) {
        const updated = predictions.filter(
          p => !(p.pencaId === pencaId && p.matchId === matchId && p.username === user?.username)
        );
        if (user) {
          updated.push({ pencaId, matchId, result1: Number(data.result1), result2: Number(data.result2), username: user.username });
        }
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
        {penca ? (
          <Stack spacing={3}>
            <PencaSection
              penca={penca}
              matches={matches}
              groups={groups}
              getPrediction={getPrediction}
              handlePrediction={handlePrediction}
              ranking={ranking}
              currentUsername={user?.username}
              onOpen={loadRanking}
              isLoading={loading}
            />
          </Stack>
        ) : (
          <Stack spacing={2} alignItems="flex-start">
            <Typography variant="body1">{t('noPencas')}</Typography>
            <Button size="small" onClick={loadDashboard}>
              {t('loading')}
            </Button>
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
