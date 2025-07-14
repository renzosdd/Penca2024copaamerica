import React, { useMemo } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { SingleEliminationBracket, Match } from '@g-loot/react-tournament-brackets';

export default function MUIBracket({ bracket }) {
  const matches = useMemo(() => {
    if (!bracket) return [];
    const rounds = ['Cuartos de final', 'Semifinales', 'Tercer puesto', 'Final'];
    let id = 1;
    const list = [];
    for (const round of rounds) {
      const arr = bracket[round] || [];
      for (const m of arr) {
        list.push({
          id: id++,
          name: round,
          nextMatchId: null,
          tournamentRoundText: round,
          startTime: new Date(`${m.date}T${m.time}`),
          state: 'SCHEDULED',
          participants: [
            { id: m.team1, name: m.team1 },
            { id: m.team2, name: m.team2 }
          ]
        });
      }
    }
    return list;
  }, [bracket]);

  if (!matches.length) return null;

  const theme = {
    textColor: '#212121',
    matchBackground: '#fafafa',
    score: { background: '#1976d2' }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>Bracket Prototype</Typography>
      <Paper sx={{ p: 2, overflowX: 'auto' }}>
        <SingleEliminationBracket
          matchComponent={Match}
          matches={matches}
          theme={theme}
        />
      </Paper>
    </Box>
  );
}
