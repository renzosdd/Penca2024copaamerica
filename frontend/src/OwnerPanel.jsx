import { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  FormControlLabel,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import useLang from './useLang';

export default function OwnerPanel() {
  const [pencas, setPencas] = useState([]);
  const [rankings, setRankings] = useState({});
  const [matches, setMatches] = useState([]);
  const { t } = useLang();
  const [expandedPenca, setExpandedPenca] = useState(null);
  const [filter, setFilter] = useState('all');


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

  const sanitizeScoring = scoring => ({
    exact: Number(scoring?.exact) || 0,
    outcome: Number(scoring?.outcome) || 0,
    goalDifference: Number(scoring?.goalDifference) || 0,
    teamGoals: Number(scoring?.teamGoals) || 0,
    cleanSheet: Number(scoring?.cleanSheet) || 0
  });

  const autoRules = scoring => {
    const s = sanitizeScoring(scoring);
    return [
      `• ${s.exact} ${t('ruleExact')}`,
      `• ${s.outcome} ${t('ruleOutcome')}`,
      `• ${s.goalDifference} ${t('ruleGoalDifference')}`,
      `• ${s.teamGoals} ${t('ruleTeamGoals')}`,
      `• ${s.cleanSheet} ${t('ruleCleanSheet')}`
    ].join('\n');
  };

  const updateField = (id, field, value) => {
    setPencas(ps => ps.map(p => p._id === id ? { ...p, [field]: value } : p));
  };

  const updateScoring = (id, key, val) => {
    setPencas(ps => ps.map(p => {
      if (p._id !== id) return p;
      const scoring = sanitizeScoring({ ...p.scoring, [key]: val });
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
    if (filter === 'upcoming') {
      list = list.filter(m => m.result1 == null && m.result2 == null);
    } else if (filter === 'played') {
      list = list.filter(m => m.result1 != null && m.result2 != null);
    }
    const grouped = {};
    list.forEach(m => {
      const g = m.group_name || 'Otros';
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(m);
    });
    return grouped;
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
      <Stack spacing={3}>
        <Typography variant="h5">{t('ownerMyPencas')}</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Button size="small" variant={filter === 'all' ? 'contained' : 'outlined'} onClick={() => setFilter('all')} fullWidth={false}>
            {t('allMatches')}
          </Button>
          <Button size="small" variant={filter === 'upcoming' ? 'contained' : 'outlined'} onClick={() => setFilter('upcoming')} fullWidth={false}>
            {t('upcoming')}
          </Button>
          <Button size="small" variant={filter === 'played' ? 'contained' : 'outlined'} onClick={() => setFilter('played')} fullWidth={false}>
            {t('played')}
          </Button>
        </Stack>
      {pencas.map(p => {
        const ranking = rankings[p._id] || [];
        const pMatches = filterMatches(p);
        const pending = Array.isArray(p.pendingRequests) ? p.pendingRequests : [];
        const participants = Array.isArray(p.participants) ? p.participants : [];
        const scoring = sanitizeScoring(p.scoring);
        const modeKey = p.tournamentMode ? `mode_${p.tournamentMode}` : 'mode_group_stage_knockout';
        const translatedMode = t(modeKey);
        const tournamentLabel = translatedMode === modeKey ? p.tournamentMode || t('mode_group_stage_knockout') : translatedMode;

        return (
          <Accordion
            key={p._id}
            expanded={expandedPenca === p._id}
            onChange={(_, exp) => setExpandedPenca(exp ? p._id : null)}
            sx={{ borderRadius: 2, boxShadow: 3 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 1 }}>
                <Typography component="span" fontWeight="bold">
                  {p.name} · {p.code}
                </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={tournamentLabel} color="primary" />
                    <FormControlLabel
                      control={<Checkbox checked={p.isPublic || false} onChange={e => togglePublic(p._id, e.target.checked)} />}
                      label={t('public')}
                    />
                  </Stack>
                </Box>
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

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 2 }}>
                <TextField
                  label={t('exact')}
                  type="number"
                  size="small"
                  value={scoring.exact}
                  onChange={e => updateScoring(p._id, 'exact', e.target.value)}
                />
                <TextField
                  label={t('outcome')}
                  type="number"
                  size="small"
                  value={scoring.outcome}
                  onChange={e => updateScoring(p._id, 'outcome', e.target.value)}
                />
                <TextField
                  label={t('goalDifferenceLabel')}
                  type="number"
                  size="small"
                  value={scoring.goalDifference}
                  onChange={e => updateScoring(p._id, 'goalDifference', e.target.value)}
                />
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 1 }}>
                <TextField
                  label={t('teamGoalsLabel')}
                  type="number"
                  size="small"
                  value={scoring.teamGoals}
                  onChange={e => updateScoring(p._id, 'teamGoals', e.target.value)}
                />
                <TextField
                  label={t('cleanSheetLabel')}
                  type="number"
                  size="small"
                  value={scoring.cleanSheet}
                  onChange={e => updateScoring(p._id, 'cleanSheet', e.target.value)}
                />
              </Stack>

              <TextField
                label={t('regulation')}
                value={p.rules || ''}
                onChange={e => updateField(p._id, 'rules', e.target.value)}
                multiline
                fullWidth
                size="small"
                sx={{ mt: 2 }}
              />
              <TextField
                label={t('awards')}
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
                sx={{ mt: 2 }}
                onClick={() => saveInfo(p._id)}
              >
                {t('save')}
              </Button>
              <Typography variant="subtitle1" sx={{ mt: 2 }}>
                {t('requests')}
              </Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                {pending.map(u => (
                  <Stack
                    key={u._id || u}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ border: theme => `1px solid ${theme.palette.divider}`, borderRadius: 1, px: 2, py: 1 }}
                  >
                    <Typography variant="body2">{u.username || u}</Typography>
                    <Button size="small" onClick={() => approve(p._id, u._id || u)}>
                      {t('approve')}
                    </Button>
                  </Stack>
                ))}
                {pending.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    {t('noRequests')}
                  </Typography>
                )}
              </Stack>

              <Typography variant="subtitle1" sx={{ mt: 2 }}>
                {t('participants')}
              </Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                {participants.map(u => (
                  <Stack
                    key={u._id || u}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ border: theme => `1px solid ${theme.palette.divider}`, borderRadius: 1, px: 2, py: 1 }}
                  >
                    <Typography variant="body2">{u.username || u}</Typography>
                    <Button size="small" color="error" onClick={() => removeParticipant(p._id, u._id || u)}>
                      {t('remove')}
                    </Button>
                  </Stack>
                ))}
                {participants.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    {t('noParticipants')}
                  </Typography>
                )}
              </Stack>

              <Typography variant="subtitle1" sx={{ mt: 2 }}>
                {t('ranking')}
              </Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                {ranking.map((u, idx) => (
                  <Stack
                    key={u.userId}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ border: theme => `1px solid ${theme.palette.divider}`, borderRadius: 1, px: 2, py: 1 }}
                  >
                    <Typography variant="body2">
                      {idx + 1}. {u.username}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {u.score}
                    </Typography>
                  </Stack>
                ))}
                {ranking.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    {t('noRanking')}
                  </Typography>
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>
        );
      })}
      </Stack>
    </Container>
  );
}
