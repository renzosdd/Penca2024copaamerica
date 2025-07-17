import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export default function CompetitionWizard({ open, onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [groupsCount, setGroupsCount] = useState(1);
  const [teamsPerGroup, setTeamsPerGroup] = useState(2);
  const [teams, setTeams] = useState([]);

  const handleFileUpload = e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target.result;
      let names = [];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        names = text
          .split(/\r?\n/)
          .map(l => l.trim())
          .filter(Boolean);
      } else {
        try {
          const arr = JSON.parse(text);
          if (Array.isArray(arr)) names = arr;
        } catch (err) {
          console.error('failed to parse file', err);
        }
      }
      const arr = [];
      for (let g = 0; g < groupsCount; g++) {
        const group = [];
        for (let t = 0; t < teamsPerGroup; t++) {
          group.push(names[g * teamsPerGroup + t] || '');
        }
        arr.push(group);
      }
      setTeams(arr);
    };
    reader.readAsText(file);
  };


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
    try {
      const res = await fetch('/admin/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          groupsCount,
          integrantsPerGroup: teamsPerGroup
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
            <input
              type="file"
              accept=".json,.csv"
              onChange={handleFileUpload}
              style={{ display: 'block', marginTop: '10px' }}
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
