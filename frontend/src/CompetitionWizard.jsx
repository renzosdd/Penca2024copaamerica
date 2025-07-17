import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export default function CompetitionWizard({ open, onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [groupsCount, setGroupsCount] = useState(1);
  const [teamsPerGroup, setTeamsPerGroup] = useState(2);
  const [teams, setTeams] = useState([]);


  useEffect(() => {
    if (open) {
      setStep(0);
      setName('');
      setGroupsCount(1);
      setTeamsPerGroup(2);
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
    const data = new FormData();
    data.append('name', name);
    data.append('groupsCount', groupsCount);
    data.append('integrantsPerGroup', teamsPerGroup);

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
    const blob = new Blob([JSON.stringify(matches)], {
      type: 'application/json'
    });
    data.append('fixture', blob, 'fixture.json');
    try {
      const res = await fetch('/admin/competitions', {
        method: 'POST',
        body: data
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
      <DialogTitle>Nueva Competencia</DialogTitle>
      <DialogContent>
        {step === 0 && (
          <div>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nombre"
              required
            />
            <input
              type="number"
              value={groupsCount}
              onChange={e => setGroupsCount(Number(e.target.value))}
              placeholder="Grupos"
              style={{ marginLeft: '10px', width: '80px' }}
              min={1}
            />
            <input
              type="number"
              value={teamsPerGroup}
              onChange={e => setTeamsPerGroup(Number(e.target.value))}
              placeholder="Integrantes"
              style={{ marginLeft: '10px', width: '100px' }}
              min={2}
            />
          </div>
        )}
        {step === 1 && (
          <div>
            {teams.map((group, gi) => (
              <div key={gi} style={{ marginBottom: '1rem' }}>
                <h6>{`Grupo ${letters[gi]}`}</h6>
                {group.map((team, ti) => (
                  <input
                    key={ti}
                    type="text"
                    value={team}
                    onChange={e => updateTeam(gi, ti, e.target.value)}
                    placeholder={`Equipo ${ti + 1}`}
                    style={{ display: 'block', marginBottom: '5px' }}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
      <DialogActions>
        {step === 1 && (
          <Button onClick={() => setStep(0)}>Atrás</Button>
        )}
        <Button onClick={next} variant="contained">
          {step === 0 ? 'Siguiente' : 'Crear'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
