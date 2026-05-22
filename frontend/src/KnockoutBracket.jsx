import { useMemo } from 'react';
import { Avatar, Box, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { canonicalStageKey, knockoutIndexFor } from './stageOrdering';
import { formatLocalKickoff, matchKickoffValue } from './kickoffUtils';

function isKnownTeam(name) {
  const value = String(name || '').trim();
  if (!value) return false;
  if (/^[123][A-L]+$/i.test(value)) return false;
  return !/^(Ganador|Perdedor|Winner|Loser)\b/i.test(value);
}

function buildBadgeMap(matches) {
  const map = new Map();
  matches.forEach(match => {
    if (match.team1 && match.team1Badge && !map.has(match.team1)) {
      map.set(match.team1, match.team1Badge);
    }
    if (match.team2 && match.team2Badge && !map.has(match.team2)) {
      map.set(match.team2, match.team2Badge);
    }
  });
  return map;
}

function TeamSlot({ name, badge, score, winner }) {
  const known = isKnownTeam(name);
  const displayName = name || 'A definir';
  return (
    <Box
      sx={theme => ({
        display: 'grid',
        gridTemplateColumns: '28px minmax(0, 1fr) auto',
        alignItems: 'center',
        gap: 1,
        minHeight: 34,
        px: 1,
        py: 0.5,
        borderRadius: 1.25,
        backgroundColor: winner ? theme.palette.success.light : 'transparent',
        color: winner ? theme.palette.success.contrastText : 'inherit'
      })}
    >
      <Tooltip title={displayName} arrow enterTouchDelay={0} leaveTouchDelay={1800}>
        <Avatar
          src={known ? badge || undefined : undefined}
          alt={displayName}
          variant="rounded"
          imgProps={{ referrerPolicy: 'no-referrer' }}
          sx={{
            width: 26,
            height: 26,
            bgcolor: known ? 'grey.100' : 'grey.200',
            color: 'text.secondary',
            border: theme => `1px solid ${theme.palette.divider}`,
            fontSize: 10,
            fontWeight: 700
          }}
        >
          {known ? displayName.slice(0, 2).toUpperCase() : '?'}
        </Avatar>
      </Tooltip>
      <Typography
        variant="body2"
        sx={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontWeight: winner ? 700 : 500,
          color: known ? 'inherit' : 'text.secondary'
        }}
      >
        {displayName}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 18, textAlign: 'right' }}>
        {score ?? ''}
      </Typography>
    </Box>
  );
}

function winnerSide(match) {
  if (match.result1 == null || match.result2 == null) return null;
  if (match.result1 > match.result2) return 'team1';
  if (match.result2 > match.result1) return 'team2';
  return match.penaltyWinner || null;
}

export default function KnockoutBracket({ matches = [], t }) {
  const stages = useMemo(() => {
    const badgeMap = buildBadgeMap(matches);
    const byStage = new Map();

    matches.forEach(match => {
      const stage = canonicalStageKey(match.group_name || match.series || '');
      const index = knockoutIndexFor(stage);
      if (index === -1) return;
      const entry = byStage.get(stage) || { stage, index, matches: [] };
      entry.matches.push({
        ...match,
        team1Badge: match.team1Badge || badgeMap.get(match.team1) || null,
        team2Badge: match.team2Badge || badgeMap.get(match.team2) || null
      });
      byStage.set(stage, entry);
    });

    return [...byStage.values()]
      .sort((a, b) => a.index - b.index)
      .map(stage => ({
        ...stage,
        matches: [...stage.matches].sort((a, b) => {
          const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : Number.MAX_SAFE_INTEGER;
          const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : Number.MAX_SAFE_INTEGER;
          return orderA - orderB || matchKickoffValue(a) - matchKickoffValue(b);
        })
      }));
  }, [matches]);

  if (!stages.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('bracketEmpty')}
      </Typography>
    );
  }

  return (
    <Box sx={{ maxWidth: '100%', overflowX: 'auto', pb: 1 }}>
      <Stack direction="row" spacing={1.5} alignItems="stretch" sx={{ minWidth: { xs: 980, md: '100%' } }}>
        {stages.map(stage => (
          <Box key={stage.stage} sx={{ flex: '1 0 220px', minWidth: 220 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {stage.stage}
            </Typography>
            <Stack spacing={1.25}>
              {stage.matches.map(match => {
                const winner = winnerSide(match);
                const kickoff = formatLocalKickoff(match);
                return (
                  <Paper
                    key={match._id}
                    variant="outlined"
                    sx={{
                      p: 0.75,
                      borderRadius: 2,
                      backgroundColor: 'background.paper'
                    }}
                  >
                    <TeamSlot
                      name={match.team1}
                      badge={match.team1Badge}
                      score={match.result1}
                      winner={winner === 'team1'}
                    />
                    <TeamSlot
                      name={match.team2}
                      badge={match.team2Badge}
                      score={match.result2}
                      winner={winner === 'team2'}
                    />
                    {kickoff && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, px: 1 }}>
                        {kickoff}
                      </Typography>
                    )}
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
