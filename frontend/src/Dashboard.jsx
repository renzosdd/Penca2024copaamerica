import { useCallback, useEffect, useState } from 'react';
import { Button, CircularProgress, Alert, Container, Stack, Typography, Box, Chip } from '@mui/material';
import PencaSection from './PencaSection';
import JoinPenca from './JoinPenca';
import ProfileForm from './ProfileForm';
import useLang from './useLang';


export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [pencas, setPencas] = useState([]);
  const [matchesByCompetition, setMatchesByCompetition] = useState({});
  const [predictions, setPredictions] = useState([]);
  const [rankings, setRankings] = useState({});
  const [groupsByCompetition, setGroupsByCompetition] = useState({});
  const [loading, setLoading] = useState(false);
  const [competitionLoading, setCompetitionLoading] = useState({});
  const [error, setError] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { t } = useLang();

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setPencas(data.pencas || []);
        setMatchesByCompetition({});
        setGroupsByCompetition({});
      } else {
        setError(t('networkError'));
      }
    } catch (err) {
      console.error('dashboard fetch error', err);
      setError(t('networkError'));
    }
  }, [t]);

  const loadRanking = useCallback(async id => {
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
  }, [t]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    async function loadBaseData() {
      if (!pencas.length) {
        setMatchesByCompetition({});
        setGroupsByCompetition({});
        setPredictions([]);
        setRankings({});
        return;
      }
      setLoading(true);
      setError('');
      try {
        const pRes = await fetch('/predictions');
        if (pRes.ok) {
          setPredictions(await pRes.json());
        }
        await Promise.all(pencas.map(p => loadRanking(p._id)));
      } catch (err) {
        console.error('dashboard data error', err);
        setError(t('networkError'));
      } finally {
        setLoading(false);
      }
    }
    loadBaseData();
  }, [loadRanking, pencas, t]);

  const ensureCompetitionData = useCallback(async competitionName => {
    if (!competitionName) return;
    const hasMatches = Array.isArray(matchesByCompetition[competitionName]);
    const hasGroups = Array.isArray(groupsByCompetition[competitionName]);
    if (hasMatches && hasGroups) return;

    setCompetitionLoading(state => ({ ...state, [competitionName]: true }));
    try {
      if (!hasMatches) {
        const res = await fetch(`/competitions/${encodeURIComponent(competitionName)}/matches`);
        if (res.ok) {
          const data = await res.json();
          setMatchesByCompetition(prev => ({ ...prev, [competitionName]: data }));
        }
      }
      if (!hasGroups) {
        const resGroups = await fetch(`/groups/${encodeURIComponent(competitionName)}`);
        if (resGroups.ok) {
          const groups = await resGroups.json();
          setGroupsByCompetition(prev => ({ ...prev, [competitionName]: groups }));
        }
      }
    } catch (err) {
      console.error('competition data error', err);
      setError(t('networkError'));
    } finally {
      setCompetitionLoading(state => ({ ...state, [competitionName]: false }));
    }
  }, [groupsByCompetition, matchesByCompetition, t]);

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
        body: JSON.stringify({ ...data, pencaId, matchId })
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

        {pencas.length > 0 && (
          <Chip
            size="small"
            color="default"
            label={`${pencas.length} ${t('pencas')}`}
            sx={{ alignSelf: 'flex-start' }}
          />
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
                matches={matchesByCompetition[p.competition] || []}
                groups={groupsByCompetition[p.competition] || []}
                getPrediction={getPrediction}
                handlePrediction={handlePrediction}
                ranking={rankings[p._id] || []}
                currentUsername={user?.username}
                onOpen={() => ensureCompetitionData(p.competition)}
                isLoading={Boolean(competitionLoading[p.competition])}
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
