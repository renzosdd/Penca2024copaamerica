import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField
} from '@mui/material';
import useLang from './useLang';

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export default function CompetitionWizard({ open, onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [groupsCount, setGroupsCount] = useState(1);
  const [teamsPerGroup, setTeamsPerGroup] = useState(2);
  const [qualifiersPerGroup, setQualifiersPerGroup] = useState(2);
  const [teams, setTeams] = useState([]);
  const { t } = useLang();
 
  useEffect(() => {
    if (open) {
      setStep(0);
      setName('');
      setGroupsCount(1);
      setTeamsPerGroup(2);
      setQualifiersPerGroup(2);
      setTeams([]);
    }
  }, [open]);

  const updateTeam = (g, t, value) => {
    setTeams(prev => {
      const arr = prev.map(row => row.slice());
      arr[g][t] = value;
      return arr;
    });
  };

  const next = () => {
    if (step === 0) {
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
    } else {
      submit();
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
    }
  };

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

          </div>
        )}
        {step === 1 && (
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
      </DialogContent>
      <DialogActions>
        {step === 1 && (
          <Button onClick={() => setStep(0)}>{t('back')}</Button>
        )}
        <Button onClick={next} variant="contained">
          {step === 0 ? t('next') : t('create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
