import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import StageAccordionList from './StageAccordionList';
import useLang from './useLang';
import pointsForPrediction, { calculatePointsBreakdown } from './calcPoints';
import { formatLocalKickoff, matchKickoffValue, minutesUntilKickoff } from './kickoffUtils';

function TabPanel({ current, value, children, sx, ...other }) {
  const isActive = current === value;
  const baseSx = [{ width: '100%', mt: 2 }, !isActive && { display: 'none' }];
  const extraSx = Array.isArray(sx) ? sx : sx ? [sx] : [];

  return (
    <Box
      role="tabpanel"
      hidden={!isActive}
      id={`penca-tabpanel-${value}`}
      aria-labelledby={`penca-tab-${value}`}
      {...other}
      sx={[...baseSx, ...extraSx]}
    >
      {children}
    </Box>
  );
}

export default function PencaSection({ penca, matches, groups, getPrediction, handlePrediction, ranking, currentUsername, onOpen, isLoading }) {
  const [open, setOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('matches');
  const [filter, setFilter] = useState('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [rankingSearch, setRankingSearch] = useState('');
  const { t } = useLang();
  const theme = useTheme();
  const predictionForms = useRef(new Map());

  const matchTimeValue = useCallback(match => matchKickoffValue(match), []);

  const filteredMatches = useMemo(() => {
    let list = [];
    if (Array.isArray(penca.fixture) && penca.fixture.length) {
      const fixtureSet = new Set(penca.fixture.map(String));
      list = matches.filter(m => fixtureSet.has(String(m._id)));
    } else {
      list = matches.filter(m => m.competition === penca.competition);
    }
    const sorted = [...list].sort((a, b) => matchTimeValue(a) - matchTimeValue(b));
    return sorted.filter(match => {
      if (filter === 'upcoming') {
        return match.result1 == null && match.result2 == null;
      }
      if (filter === 'played') {
        return match.result1 != null && match.result2 != null;
      }
      return true;
    });
  }, [filter, matchTimeValue, matches, penca.competition, penca.fixture]);

  const hasAnyMatches = filteredMatches.length > 0;

  function canPredict(match) {
    const minutes = minutesUntilKickoff(match);
    return minutes >= 30;
  }

  async function submitPrediction(e, pencaId, matchId) {
    const formRef = predictionForms.current.get(matchId);
    if (formRef) {
      formRef.setAttribute('data-submitting', 'true');
    }
    try {
      const result = await handlePrediction(e, pencaId, matchId);
      if (result?.success) {
        setSnackbar({ open: true, message: result.message, severity: 'success' });
      } else {
        setSnackbar({ open: true, message: result?.error || t('networkError'), severity: 'error' });
      }
    } finally {
      if (formRef) {
        formRef.removeAttribute('data-submitting');
      }
    }
  }

  const scoringText = penca.rules?.trim() ? penca.rules : t('noRules');
  const participantsCount = (() => {
    if (typeof penca.participantsCount === 'number' && Number.isFinite(penca.participantsCount)) {
      return penca.participantsCount;
    }
    if (typeof penca.participantsCount === 'string') {
      const parsed = Number(penca.participantsCount);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    if (typeof penca.metrics?.participants === 'number' && penca.metrics.participants >= 0) {
      return penca.metrics.participants;
    }
    return Array.isArray(penca.participants) ? penca.participants.length : 0;
  })();
  const participantLimit = penca.participantLimit ? `/${penca.participantLimit}` : '';
  const modeKey = penca.tournamentMode ? `mode_${penca.tournamentMode}` : 'mode_group_stage_knockout';
  const translatedMode = t(modeKey);
  const tournamentLabel = translatedMode === modeKey ? penca.tournamentMode || t('mode_group_stage_knockout') : translatedMode;
  const participantsLabel = `${participantsCount}${participantLimit} ${t('participantsShort')}`.trim();

  const filteredRanking = useMemo(() => {
    const normalized = rankingSearch.trim().toLowerCase();
    return ranking
      .map((entry, index) => ({ ...entry, rank: index + 1 }))
      .filter(entry => {
        if (!normalized) return true;
        return entry.username.toLowerCase().includes(normalized);
      });
  }, [ranking, rankingSearch]);

  const InfoDetails = () => (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          {t('format')}
        </Typography>
        <Chip size="small" color="primary" label={tournamentLabel} />
      </Box>
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          {t('rules')}
        </Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
          {scoringText}
        </Typography>
      </Box>
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          {t('prizes')}
        </Typography>
        <Typography variant="body2">
          {penca.prizes || t('noPrizes')}
        </Typography>
      </Box>
    </Stack>
  );

  const renderTeam = name => (
    <Stack direction="row" spacing={1.5} alignItems="center" key={name} sx={{ minWidth: 0 }}>
      <Box
        component="img"
        src={`/images/${name.replace(/\s+/g, '').toLowerCase()}.png`}
        alt={name}
        sx={{
          width: { xs: 32, sm: 36 },
          height: { xs: 32, sm: 36 },
          borderRadius: '50%',
          objectFit: 'contain',
          backgroundColor: 'background.default'
        }}
      />
      <Typography variant="subtitle1" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
        {name}
      </Typography>
    </Stack>
  );

  const kickoffText = match => {
    const localized = formatLocalKickoff(match);
    if (localized) {
      return localized;
    }
    if (match.date && match.time) {
      return `${match.date} ${match.time}`;
    }
    if (match.originalDate && match.originalTime) {
      return match.originalTimezone
        ? `${match.originalDate} ${match.originalTime} (${match.originalTimezone})`
        : `${match.originalDate} ${match.originalTime}`;
    }
    if (match.date) return match.date;
    if (match.originalDate) return match.originalDate;
    return t('scheduleTbd');
  };

  const renderMatchCard = (match, section) => {
    const pr = getPrediction(penca._id, match._id) || {};
    const editable = canPredict(match);
    const breakdown = calculatePointsBreakdown(pr, match, penca.scoring);
    const breakdownItems = [
      { key: 'exact', label: t('pointsBreakdownExact'), points: breakdown.scoring.exact, earned: breakdown.earned.exact },
      { key: 'outcome', label: t('pointsBreakdownOutcome'), points: breakdown.scoring.outcome, earned: breakdown.earned.outcome },
      {
        key: 'goalDifference',
        label: t('pointsBreakdownGoalDifference'),
        points: breakdown.scoring.goalDifference,
        earned: breakdown.earned.goalDifference
      },
      {
        key: 'team1Goals',
        label: t('pointsBreakdownTeamGoals', { team: match.team1 }),
        points: breakdown.scoring.teamGoals,
        earned: breakdown.earned.team1Goals
      },
      {
        key: 'team2Goals',
        label: t('pointsBreakdownTeamGoals', { team: match.team2 }),
        points: breakdown.scoring.teamGoals,
        earned: breakdown.earned.team2Goals
      },
      {
        key: 'team1CleanSheet',
        label: t('pointsBreakdownCleanSheet', { team: match.team1 }),
        points: breakdown.scoring.cleanSheet,
        earned: breakdown.earned.team1CleanSheet
      },
      {
        key: 'team2CleanSheet',
        label: t('pointsBreakdownCleanSheet', { team: match.team2 }),
        points: breakdown.scoring.cleanSheet,
        earned: breakdown.earned.team2CleanSheet
      }
    ].filter(item => item.points > 0);

    const hasPrediction = pr.result1 != null && pr.result2 != null;
    const hasResult = match.result1 != null && match.result2 != null;

    return (
      <Paper
        variant="outlined"
        sx={theme => ({
          p: { xs: 2, sm: 2.5 },
          borderRadius: 3,
          borderColor: pr.result1 != null ? theme.palette.primary.light : theme.palette.divider,
          backgroundColor: pr.result1 != null ? alpha(theme.palette.primary.main, 0.06) : theme.palette.background.paper
        })}
      >
        <Stack spacing={2}>
          <Stack spacing={0.75}>
            <Typography variant="caption" color="text.secondary">
              {kickoffText(match)}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {match.group_name && <Chip size="small" label={match.group_name} />}
              {match.series && <Chip size="small" color="secondary" label={match.series} />}
            </Stack>
          </Stack>

          <Stack spacing={1.5}>
            {renderTeam(match.team1)}
            <Typography variant="overline" color="text.secondary">
              {t('vs')}
            </Typography>
            {renderTeam(match.team2)}
          </Stack>

          <Box
            component="form"
            ref={node => {
              if (node) {
                predictionForms.current.set(match._id, node);
              } else {
                predictionForms.current.delete(match._id);
              }
            }}
            onSubmit={e => submitPrediction(e, penca._id, match._id)}
            sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
                <TextField
                  name="result1"
                  type="number"
                  defaultValue={pr.result1 ?? ''}
                  required
                  size="small"
                  fullWidth
                  inputProps={{ min: 0, inputMode: 'numeric', pattern: '[0-9]*' }}
                  disabled={!editable}
                />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  -
                </Typography>
                <TextField
                  name="result2"
                  type="number"
                  defaultValue={pr.result2 ?? ''}
                  required
                  size="small"
                  fullWidth
                  inputProps={{ min: 0, inputMode: 'numeric', pattern: '[0-9]*' }}
                  disabled={!editable}
                />
              </Stack>
              <Button
                variant="contained"
                type="submit"
                disabled={!editable}
                size="large"
                fullWidth
                sx={{ flexShrink: 0 }}
              >
                {t('save')}
              </Button>
            </Stack>
            {!editable && (
              <Typography variant="caption" color="text.secondary">
                {t('predictionClosed')}
              </Typography>
            )}
          </Box>

          {hasResult && (
            <Stack spacing={1}>
              <Typography variant="body2" fontWeight={600}>
                {t('result')}: {match.result1} - {match.result2}
              </Typography>
              {hasPrediction && (
                <Stack spacing={0.75}>
                  <Typography variant="body2" color="text.secondary">
                    {t('difference')}: ({pr.result1 - match.result1}/{pr.result2 - match.result2})
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="primary.main">
                    {t('pointsEarned')}: {pointsForPrediction(pr, match, penca.scoring)} {t('pts')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('pointsBreakdownTitle', { stage: section?.label || t('pointsBreakdownDefaultStage') })}
                  </Typography>
                  <Stack spacing={0.5}>
                    {breakdownItems.map(item => (
                      <Box
                        key={item.key}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          px: 1.25,
                          py: 0.75,
                          borderRadius: 1.5,
                          border: theme => `1px solid ${item.earned ? theme.palette.success.light : theme.palette.divider}`,
                          backgroundColor: theme =>
                            item.earned ? alpha(theme.palette.success.light, 0.18) : alpha(theme.palette.background.paper, 0.6)
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ color: item.earned ? 'success.dark' : 'text.secondary', fontWeight: item.earned ? 600 : 400 }}
                        >
                          {item.label}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: item.earned ? 'success.dark' : 'text.secondary', fontWeight: 600 }}
                        >
                          {item.earned ? `+${item.points}` : '+0'}
                        </Typography>
                      </Box>
                    ))}
                    {!breakdownItems.length && (
                      <Typography variant="body2" color="text.secondary">
                        {t('pointsBreakdownHint')}
                      </Typography>
                    )}
                  </Stack>
                </Stack>
              )}
            </Stack>
          )}
        </Stack>
      </Paper>
    );
  };

  return (
    <Box component="section" sx={{ mb: 3 }}>
      <Card
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && onOpen) {
            onOpen();
          }
        }}
        sx={{
          p: { xs: 1.5, sm: 2 },
          cursor: 'pointer',
          borderRadius: 3,
          boxShadow: open ? 8 : 2,
          transition: 'box-shadow .2s ease-in-out'
        }}
      >
        <CardContent
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h6" component="h3">
              {penca.name}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Chip size="small" color="primary" label={tournamentLabel} />
              <Chip size="small" label={participantsLabel} />
            </Stack>
          </Box>
          <Tooltip title={t('viewRules')}>
            <IconButton
              size="small"
              onClick={e => {
                e.stopPropagation();
                setInfoOpen(true);
              }}
            >
              <InfoOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </CardContent>
      </Card>

      {open && (
        <Card sx={{ mt: 1.5, borderRadius: 3, boxShadow: 4 }}>
          <CardContent>
            <Tabs
              value={activeSection}
              onChange={(_, value) => setActiveSection(value)}
              aria-label={t('pencaTabsLabel')}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTabs-flexContainer': {
                  flexWrap: { xs: 'wrap', sm: 'nowrap' },
                  justifyContent: { xs: 'center', md: 'center' },
                  gap: { xs: 1, sm: 0 }
                },
                '& .MuiTab-root': {
                  flex: { xs: '1 1 calc(50% - 8px)', sm: '0 0 auto' },
                  minHeight: 'auto',
                  borderRadius: { xs: 2, sm: 0 }
                }
              }}
            >
              <Tab
                label={t('pencaTabMatches')}
                value="matches"
                id="penca-tab-matches"
                aria-controls="penca-tabpanel-matches"
              />
              <Tab
                label={t('pencaTabRanking')}
                value="ranking"
                id="penca-tab-ranking"
                aria-controls="penca-tabpanel-ranking"
              />
              <Tab
                label={t('pencaTabInfo')}
                value="info"
                id="penca-tab-info"
                aria-controls="penca-tabpanel-info"
              />
            </Tabs>

            <TabPanel current={activeSection} value="matches">
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{
                  mb: 2,
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  flexWrap: 'wrap',
                  rowGap: 1,
                  columnGap: 1
                }}
              >
                <Button
                  size="small"
                  variant={filter === 'all' ? 'contained' : 'outlined'}
                  onClick={e => {
                    e.stopPropagation();
                    setFilter('all');
                  }}
                  fullWidth
                >
                  {t('allMatches')}
                </Button>
                <Button
                  size="small"
                  variant={filter === 'upcoming' ? 'contained' : 'outlined'}
                  onClick={e => {
                    e.stopPropagation();
                    setFilter('upcoming');
                  }}
                  fullWidth
                >
                  {t('upcoming')}
                </Button>
                <Button
                  size="small"
                  variant={filter === 'played' ? 'contained' : 'outlined'}
                  onClick={e => {
                    e.stopPropagation();
                    setFilter('played');
                  }}
                  fullWidth
                >
                  {t('played')}
                </Button>
              </Stack>

              {!hasAnyMatches && !isLoading && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  {t('adminMatchesNoResults')}
                </Alert>
              )}

              <StageAccordionList
                matches={filteredMatches}
                groups={groups}
                t={t}
                matchTimeValue={matchTimeValue}
                renderMatch={renderMatchCard}
                loading={isLoading}
                emptyMessage={t('adminMatchesNoResults')}
                showGroupTables
              />
            </TabPanel>

            <TabPanel current={activeSection} value="ranking">
              <Stack spacing={1.5}>
                <Typography variant="subtitle1">
                  {t('ranking')}
                </Typography>
                <TextField
                  size="small"
                  value={rankingSearch}
                  onChange={e => setRankingSearch(e.target.value)}
                  label={t('searchPlayer')}
                  placeholder={t('searchPlayerPlaceholder')}
                  sx={{ maxWidth: { xs: '100%', sm: 320 } }}
                />
              </Stack>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>{t('participant')}</TableCell>
                      <TableCell>{t('score')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRanking.map(u => (
                      <TableRow
                        key={u.userId}
                        className={`rank-${u.rank} ${u.username === currentUsername ? 'current-user-row' : ''}`.trim()}
                      >
                        <TableCell>{u.rank}</TableCell>
                        <TableCell>
                          <img
                            src={u.avatar}
                            alt={u.username}
                            className="avatar-small"
                            style={{ marginRight: '0.5rem' }}
                          />
                          {u.username}
                        </TableCell>
                        <TableCell>{u.score}</TableCell>
                      </TableRow>
                      ))}
                    {filteredRanking.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Typography variant="body2" color="text.secondary">
                            {t('noRanking')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            <TabPanel current={activeSection} value="info">
              <InfoDetails />
            </TabPanel>
          </CardContent>
        </Card>
      )}

      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{penca.name}</DialogTitle>
        <DialogContent dividers>
          <InfoDetails />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoOpen(false)}>{t('close')}</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return;
          setSnackbar(s => ({ ...s, open: false }));
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
