import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography
} from '@mui/material';
import useLang from './useLang';
 
export default function GroupTable({ groups }) {
  const { t } = useLang();
  if (!groups || !groups.length) return null;
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {groups.map(g => (
        <Box key={g.group}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {g.group}
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('team')}</TableCell>
                  <TableCell>{t('pts')}</TableCell>
                  <TableCell>{t('playedShort')}</TableCell>
                  <TableCell>{t('w')}</TableCell>
                  <TableCell>{t('d')}</TableCell>
                  <TableCell>{t('l')}</TableCell>
                  <TableCell>{t('gd')}</TableCell>
                  <TableCell>{t('gf')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...g.teams]
                  .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
                  .map(team => (
                    <TableRow key={team.team}>
                      <TableCell>{team.team}</TableCell>
                      <TableCell>{team.points}</TableCell>
                      <TableCell>{team.wins + team.draws + team.losses}</TableCell>
                      <TableCell>{team.wins}</TableCell>
                      <TableCell>{team.draws}</TableCell>
                      <TableCell>{team.losses}</TableCell>
                      <TableCell>{team.gd}</TableCell>
                      <TableCell>{team.gf}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}
    </Box>
  );
}
