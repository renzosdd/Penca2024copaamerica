import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  Snackbar,
  Alert
} from '@mui/material';
import GroupTable from './GroupTable';
import useLang from './useLang';

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export default function CompetitionWizard({ open, onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [groupsCount, setGroupsCount] = useState(1);
  const [teamsPerGroup, setTeamsPerGroup] = useState(2);
  const [qualifiersPerGroup, setQualifiersPerGroup] = useState(2);
  const [teams, setTeams] = useState([]);
  const [previewGroups, setPreviewGroups] = useState([]);
  const [previewMatches, setPreviewMatches] = useState([]);
  const [fixtureFile, setFixtureFile] = useState(null);
  const [error, setError] = useState('');
  const { t } = useLang();
 
  useEffect(() => {
    if (open) {
      setStep(0);
      setName('');
      setGroupsCount(1);
      setTeamsPerGroup(2);
      setQualifiersPerGroup(2);
      setTeams([]);
      setPreviewGroups([]);
      setPreviewMatches([]);
      setFixtureFile(null);
      setError('');
    }
  }, [open]);

  const updateTeam = (g, t, value) => {
    setTeams(prev => {
      const arr = prev.map(row => row.slice());
      arr[g][t] = value;
      return arr;
    });
  };

  const handleFileChange = async e => {
    const file = e.target.files[0];
    setFixtureFile(file || null);
    setPreviewGroups([]);
    setPreviewMatches([]);
    setError('');
    if (file) {
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const matches = Array.isArray(json) ? json : json.matches;
        const err = validateMatches(matches);
        if (err) {
          setError(err);
          return;
        }
        if (Array.isArray(matches)) {
          const map = {};
          matches.forEach(m => {
            const g = m.group_name || '';
            if (!g) return;
            if (!map[g]) map[g] = new Set();
            map[g].add(m.team1);
            map[g].add(m.team2);
          });
          const groups = Object.entries(map).map(([name, set]) => ({ name, teams: Array.from(set) }));
          setPreviewGroups(groups);
          setPreviewMatches(matches);
        }
      } catch (err) {
        console.error('file read error', err);
        setError('Invalid file');
      }
    }
  };

  const next = async () => {
    if (step === 0) {
      if (fixtureFile) {
        setStep(1);
      } else {
        if (teams.length === 0) {
          const initial = Array.from({ length: groupsCount }, () =>
            Array.from({ length: teamsPerGroup }, () => '')
          );
          setTeams(initial);
        } else {
          setTeams(prev => {
            const arr = Array.from({ length: groupsCount }, (_, g) =>
              Array.from({ length: teamsPerGroup }, (_, t) =>
                (prev[g] && prev[g][t]) ? prev[g][t] : ''
              )
            );
            return arr;
          });
        }
        setStep(1);
      }
    } else {
      if (fixtureFile) {
        submitImported();
      } else {
        submit();
      }
    }
  };

  const submit = async () => {
    const matches = [];
    for (let g = 0; g < groupsCount; g++) {
      const groupName = `Grupo ${letters[g]}`;
      for (let i = 0; i < teamsPerGroup; i++) {
        for (let j = i + 1; j < teamsPerGroup; j++) {
          matches.push({
            team1: teams[g][i],
            team2: teams[g][j],
            competition: name,
            group_name: groupName,
            series: 'Fase de grupos',
            tournament: name
          });
        }
      }
    }
    const err = validateMatches(matches);
    if (err) {
      setError(err);
      return;
    }
    try {
      const res = await fetch('/admin/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          groupsCount,
          integrantsPerGroup: teamsPerGroup,
          qualifiersPerGroup,
          fixture: matches
        })
      });
      if (res.ok) {
        if (onCreated) onCreated();
        onClose();
      }
    } catch (err) {
      console.error('wizard submit error', err);
      setError('Submit failed');
    }
  };

  const submitImported = async () => {
    const err = validateMatches(previewMatches);
    if (err) {
      setError(err);
      return;
    }
    try {
      const res = await fetch('/admin/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          groupsCount: previewGroups.length,
          integrantsPerGroup: previewGroups[0]?.teams?.length || 0,
          qualifiersPerGroup,
          fixture: previewMatches
        })
      });
      if (res.ok) {
        if (onCreated) onCreated();
        onClose();
      }
    } catch (err) {
      console.error('wizard submit error', err);
      setError('Submit failed');
    }
  };

  function validateMatches(matches) {
    if (!Array.isArray(matches)) return 'Invalid matches data';
    const required = ['date', 'time', 'team1', 'team2', 'group_name', 'series', 'tournament'];
    const seen = new Set();
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      for (const f of required) {
        if (!m[f]) return `${t('missingField') || 'Missing field'}: ${f}`;
      }
      const key = `${m.date}|${m.time}|${m.team1}|${m.team2}`;
      if (seen.has(key)) return 'Duplicate match detected';
      seen.add(key);
    }
    return '';
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('newCompetition')}</DialogTitle>
      <DialogContent>
        {step === 0 && (
          <div>
            <TextField
              label={t('name')}
              value={name}
              onChange={e => setName(e.target.value)}
              required
              size="small"
            />
            <TextField
              type="number"
              label={t('groups')}
              value={groupsCount}
              onChange={e => setGroupsCount(Number(e.target.value))}
              size="small"
              sx={{ ml: 1, width: 80 }}
              inputProps={{ min: 1 }}
            />
            <TextField
              type="number"
              label={t('integrants')}
              value={teamsPerGroup}
              onChange={e => setTeamsPerGroup(Number(e.target.value))}
              size="small"
              sx={{ ml: 1, width: 100 }}
              inputProps={{ min: 2 }}
            />
            <TextField
              type="number"
              label={t('qualifiers')}
              value={qualifiersPerGroup}
              onChange={e => setQualifiersPerGroup(Number(e.target.value))}
              size="small"
              sx={{ ml: 1, width: 100 }}
              inputProps={{ min: 1 }}
            />
            <input type="file" accept="application/json" onChange={handleFileChange} style={{ marginLeft: '1rem' }} />
          </div>
        )}
        {step === 1 && previewMatches.length === 0 && (
          <div>
            {teams.map((group, gi) => (
              <div key={gi} style={{ marginBottom: '1rem' }}>
                <h6>{`${t('group')} ${letters[gi]}`}</h6>
                {group.map((team, ti) => (
                  <TextField
                    key={ti}
                    label={`${t('team')} ${ti + 1}`}
                    value={team}
                    onChange={e => updateTeam(gi, ti, e.target.value)}
                    size="small"
                    fullWidth
                    sx={{ mb: 1 }}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
        {step === 1 && previewMatches.length > 0 && (
          <div>
            <GroupTable
              groups={previewGroups.map(g => ({
                group: g.name,
                teams: g.teams.map(team => ({
                  team,
                  points: 0,
                  wins: 0,
                  draws: 0,
                  losses: 0,
                  gd: 0,
                  gf: 0
                }))
              }))}
            />
            <div>
              <h6>{t('matches')}</h6>
              <List>
                {previewMatches.map((m, idx) => (
                  <ListItem key={idx}>
                    <ListItemText primary={`${m.team1} vs ${m.team2} - ${m.date}`} />
                  </ListItem>
                ))}
              </List>
            </div>
          </div>
        )}
      </DialogContent>
      <DialogActions>
        {step === 1 && (
          <Button onClick={() => setStep(0)}>{t('back')}</Button>
        )}
        <Button onClick={next} variant="contained">
          {step === 0 ? t('next') : t('create')}
        </Button>
      </DialogActions>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" onClose={() => setError('')} sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}
