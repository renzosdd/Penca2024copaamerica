import React, { useMemo } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { SingleEliminationBracket, Match } from '@g-loot/react-tournament-brackets';
import roundOrder from './roundOrder';

export default function MUIBracket({ bracket }) {
  const matches = useMemo(() => {
    if (!bracket) return [];
    const rounds = roundOrder.slice(4);
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
          startTime: `${m.date}T${m.time}`,
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

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>Bracket Prototype</Typography>
      <Paper sx={{ p: 2, overflowX: 'auto' }}>
        <SingleEliminationBracket
          matchComponent={Match}
          matches={matches}
        />
      </Paper>
    </Box>
  );
}
