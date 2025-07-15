import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';

export default function GroupTable({ groups }) {
  if (!groups || !groups.length) return null;
  return (
    <div>
      {groups.map(g => (
        <div key={g.group} style={{ marginBottom: '1rem' }}>
          <h6>{g.group}</h6>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Equipo</TableCell>
                  <TableCell>Pts</TableCell>
                  <TableCell>W</TableCell>
                  <TableCell>D</TableCell>
                  <TableCell>L</TableCell>
                  <TableCell>DG</TableCell>
                  <TableCell>GF</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {g.teams
                  .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
                  .map(t => (
                    <TableRow key={t.team}>
                      <TableCell>{t.team}</TableCell>
                      <TableCell>{t.points}</TableCell>
                      <TableCell>{t.wins}</TableCell>
                      <TableCell>{t.draws}</TableCell>
                      <TableCell>{t.losses}</TableCell>
                      <TableCell>{t.gd}</TableCell>
                      <TableCell>{t.gf}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      ))}
    </div>
  );
}
