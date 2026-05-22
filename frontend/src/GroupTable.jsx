import React from 'react';
import {
  Avatar,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Typography
} from '@mui/material';
import useLang from './useLang';

const numericCellSx = {
  px: { xs: 0.35, sm: 0.75 },
  py: 0.75,
  textAlign: 'center',
  whiteSpace: 'nowrap'
};

const flagCellSx = {
  ...numericCellSx,
  width: { xs: 42, sm: 52 }
};

function TeamFlag({ team }) {
  const label = team.team || '';
  return (
    <Tooltip title={label} arrow enterTouchDelay={0} leaveTouchDelay={1800}>
      <Avatar
        src={team.badge || undefined}
        alt={label}
        variant="rounded"
        imgProps={{ referrerPolicy: 'no-referrer' }}
        sx={{
          width: { xs: 28, sm: 32 },
          height: { xs: 28, sm: 32 },
          mx: 'auto',
          bgcolor: 'grey.100',
          color: 'text.secondary',
          border: theme => `1px solid ${theme.palette.divider}`,
          fontSize: 11,
          fontWeight: 700
        }}
      >
        {label.slice(0, 2).toUpperCase() || '?'}
      </Avatar>
    </Tooltip>
  );
}
 
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
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxWidth: '100%', overflowX: 'hidden' }}>
            <Table size="small" sx={{ width: '100%', tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={flagCellSx}>{t('teamShort')}</TableCell>
                  <TableCell sx={numericCellSx}>{t('pts')}</TableCell>
                  <TableCell sx={numericCellSx}>{t('playedShort')}</TableCell>
                  <TableCell sx={numericCellSx}>{t('w')}</TableCell>
                  <TableCell sx={numericCellSx}>{t('d')}</TableCell>
                  <TableCell sx={numericCellSx}>{t('l')}</TableCell>
                  <TableCell sx={numericCellSx}>{t('gd')}</TableCell>
                  <TableCell sx={numericCellSx}>{t('gf')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...g.teams]
                  .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
                  .map(team => (
                    <TableRow key={team.team}>
                      <TableCell sx={flagCellSx}>
                        <TeamFlag team={team} />
                      </TableCell>
                      <TableCell sx={numericCellSx}>{team.points}</TableCell>
                      <TableCell sx={numericCellSx}>{team.wins + team.draws + team.losses}</TableCell>
                      <TableCell sx={numericCellSx}>{team.wins}</TableCell>
                      <TableCell sx={numericCellSx}>{team.draws}</TableCell>
                      <TableCell sx={numericCellSx}>{team.losses}</TableCell>
                      <TableCell sx={numericCellSx}>{team.gd}</TableCell>
                      <TableCell sx={numericCellSx}>{team.gf}</TableCell>
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
