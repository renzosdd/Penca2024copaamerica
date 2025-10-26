import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
  CircularProgress,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GroupTable from './GroupTable';
import roundOrder from './roundOrder';
import useLang from './useLang';
import pointsForPrediction from './calcPoints';
import { formatLocalKickoff, matchKickoffValue, minutesUntilKickoff } from './kickoffUtils';

export default function PencaSection({ penca, matches, groups, getPrediction, handlePrediction, ranking, currentUsername, onOpen, isLoading }) {
  const [open, setOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { t } = useLang();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (open && onOpen) {
      onOpen();
    }
  }, [onOpen, open]);

  const matchTimeValue = match => matchKickoffValue(match);

  function canPredict(match) {
    const minutes = minutesUntilKickoff(match);
    return minutes >= 30;
  }

  async function submitPrediction(e, pencaId, matchId) {
    const result = await handlePrediction(e, pencaId, matchId);
    if (result?.success) {
      setSnackbar({ open: true, message: result.message, severity: 'success' });
    } else {
      setSnackbar({ open: true, message: result?.error || t('networkError'), severity: 'error' });
    }
  }

  const scoringText = penca.rules?.trim() ? penca.rules : t('noRules');
  const participantsCount = typeof penca.participantsCount === 'number'
    ? penca.participantsCount
    : Array.isArray(penca.participants)
      ? penca.participants.length
      : 0;
  const participantLimit = penca.participantLimit ? `/${penca.participantLimit}` : '';
  const modeKey = penca.tournamentMode ? `mode_${penca.tournamentMode}` : 'mode_group_stage_knockout';
  const translatedMode = t(modeKey);
  const tournamentLabel = translatedMode === modeKey ? penca.tournamentMode || t('mode_group_stage_knockout') : translatedMode;
  const participantsLabel = `${participantsCount}${participantLimit} ${t('participantsShort')}`.trim();
  const ownerName = penca.ownerDisplayName || penca.owner?.name || penca.owner?.username || '';

  const groupedMatches = useMemo(() => {
    let list = [];
    if (Array.isArray(penca.fixture) && penca.fixture.length) {
      const fixtureSet = new Set(penca.fixture.map(String));
      list = matches.filter(m => fixtureSet.has(String(m._id)));
    } else {
      list = matches.filter(m => m.competition === penca.competition);
    }
    const sorted = [...list].sort((a, b) => matchTimeValue(a) - matchTimeValue(b));
    const filtered = sorted.filter(match => {
      if (filter === 'upcoming') {
        return match.result1 == null && match.result2 == null;
      }
      if (filter === 'played') {
        return match.result1 != null && match.result2 != null;
      }
      return true;
    });
    return filtered.reduce((acc, match) => {
      const key = match.group_name?.trim() || 'Otros';
      if (!acc[key]) acc[key] = [];
      acc[key].push(match);
      return acc;
    }, {});
  }, [filter, matches, penca.competition, penca.fixture]);

  const isGroupKey = key => /^Grupo\s+/i.test(key);
  const compareGroupKey = (a, b) => {
    const normalize = value => value.replace(/^Grupo\s+/i, '').trim();
    return normalize(a).localeCompare(normalize(b), undefined, { sensitivity: 'base', numeric: true });
  };

  const knockoutOrder = roundOrder.filter(label => !/^Grupo\s+/i.test(label));
  const groupKeys = Object.keys(groupedMatches)
    .filter(isGroupKey)
    .sort(compareGroupKey);
  const knockoutKeys = knockoutOrder.filter(label => Array.isArray(groupedMatches[label]));
  const knockoutSet = new Set(knockoutKeys);
  const otherKeys = Object.keys(groupedMatches)
    .filter(key => !isGroupKey(key) && !knockoutSet.has(key))
    .sort((a, b) => matchTimeValue(groupedMatches[a]?.[0]) - matchTimeValue(groupedMatches[b]?.[0]));
  const hasAnyMatches = groupKeys.length + knockoutKeys.length + otherKeys.length > 0;

  const renderTeam = name => (
    <Stack direction="row" spacing={1} alignItems="center" key={name} sx={{ minWidth: 0 }}>
      <Box
        component="img"
        src={`/images/${name.replace(/\s+/g, '').toLowerCase()}.png`}
        alt={name}
        sx={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'contain', backgroundColor: 'background.default' }}
      />
      <Typography variant="subtitle2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
        {name}
      </Typography>
    </Stack>
  );

  const kickoffText = match => {
    if (formatLocalKickoff(match)) {
      return formatLocalKickoff(match);
    }
    if (match.date && match.time) {
      return `${match.date} ${match.time}`;
    }
    return t('scheduleTbd');
  };

  const renderPredictionCard = match => {
    const pr = getPrediction(penca._id, match._id) || {};
    const editable = canPredict(match);
    return (
      <Paper
        key={match._id}
        variant="outlined"
        sx={theme => ({
          p: 2,
          borderRadius: 3,
          borderColor: pr.result1 != null ? theme.palette.primary.light : theme.palette.divider,
          backgroundColor: pr.result1 != null ? alpha(theme.palette.primary.main, 0.06) : theme.palette.background.paper
        })}
      >
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
              {renderTeam(match.team1)}
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {t('vs')}
              </Typography>
              {renderTeam(match.team2)}
            </Stack>
            <Stack spacing={0.5} alignItems={{ xs: 'flex-start', sm: 'flex-end' }}>
              <Typography variant="body2" color="text.secondary">
                {kickoffText(match)}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {match.group_name && <Chip size="small" label={match.group_name} />}
                {match.series && <Chip size="small" color="secondary" label={match.series} />}
              </Stack>
            </Stack>
          </Stack>

          <Box
            component="form"
            onSubmit={e => submitPrediction(e, penca._id, match._id)}
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 1.5
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                name="result1"
                type="number"
                defaultValue={pr.result1 ?? ''}
                required
                size="small"
                sx={{ width: 70 }}
                inputProps={{ min: 0 }}
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
                sx={{ width: 70 }}
                inputProps={{ min: 0 }}
                disabled={!editable}
              />
            </Stack>
            <Button variant="contained" type="submit" disabled={!editable} sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}>
              {t('save')}
            </Button>
          </Box>

          {match.result1 != null && match.result2 != null && (
            <Stack spacing={0.5}>
              <Typography variant="body2" fontWeight={600}>
                {t('result')}: {match.result1} - {match.result2}
              </Typography>
              {pr.result1 != null && pr.result2 != null && (
                <Typography variant="body2" color="text.secondary">
                  {t('difference')}: ({pr.result1 - match.result1}/{pr.result2 - match.result2}) — {t('pointsEarned')}: {pointsForPrediction(pr, match, penca.scoring)} {t('pts')}
                </Typography>
              )}
            </Stack>
          )}
        </Stack>
      </Paper>
    );
  };

  const renderMatchCard = match => (
    <Paper
      key={match._id}
      variant="outlined"
      sx={{ p: 2, borderRadius: 3, backgroundColor: 'background.paper' }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            {renderTeam(match.team1)}
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {t('vs')}
            </Typography>
            {renderTeam(match.team2)}
          </Stack>
          <Stack spacing={0.5} alignItems={{ xs: 'flex-start', sm: 'flex-end' }}>
            {match.result1 != null && match.result2 != null ? (
              <Typography variant="h6" component="span">
                {match.result1} - {match.result2}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {kickoffText(match)}
              </Typography>
            )}
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {match.group_name && <Chip size="small" label={match.group_name} />}
              {match.series && <Chip size="small" color="secondary" label={match.series} />}
            </Stack>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );

  const renderPredictionSection = key => (
    <Stack key={key} spacing={1.5} sx={{ mb: 2 }}>
      <Typography variant="subtitle2">{key}</Typography>
      {groupedMatches[key].map(renderPredictionCard)}
    </Stack>
  );

  const renderMatchesSection = key => (
    <Stack key={key} spacing={1.5} sx={{ mb: 2 }}>
      <Typography variant="subtitle2">{key}</Typography>
      {groupedMatches[key].map(renderMatchCard)}
      {isGroupKey(key) && Array.isArray(groups) && groups.some(gr => gr.group === key) && (
        <GroupTable groups={groups.filter(gr => gr.group === key)} />
      )}
    </Stack>
  );

  return (
    <Box component="section" sx={{ mb: 3 }}>
      <Card
        onClick={() => setOpen(!open)}
        sx={{
          p: 2,
          cursor: 'pointer',
          borderRadius: 3,
          boxShadow: open ? 8 : 2,
          transition: 'box-shadow .2s ease-in-out'
        }}
      >
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h6" component="h3">
              {penca.name}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Chip size="small" color="primary" label={tournamentLabel} />
              <Chip size="small" label={participantsLabel} />
              {ownerName && (
                <Chip size="small" color="secondary" label={`${t('pencaOwnerLabel')}: ${ownerName}`} />
              )}
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
            <Stack
              direction={isMobile ? 'column' : 'row'}
              spacing={1}
              sx={{ mb: 2, alignItems: 'center', justifyContent: 'flex-start' }}
            >
              <Button
                size="small"
                variant={filter === 'all' ? 'contained' : 'outlined'}
                onClick={() => setFilter('all')}
                fullWidth={isMobile}
              >
                {t('allMatches')}
              </Button>
              <Button
                size="small"
                variant={filter === 'upcoming' ? 'contained' : 'outlined'}
                onClick={() => setFilter('upcoming')}
                fullWidth={isMobile}
              >
                {t('upcoming')}
              </Button>
              <Button
                size="small"
                variant={filter === 'played' ? 'contained' : 'outlined'}
                onClick={() => setFilter('played')}
                fullWidth={isMobile}
              >
                {t('played')}
              </Button>
            </Stack>
            {isLoading && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <CircularProgress size={18} />
                <Typography variant="body2" color="text.secondary">
                  {t('loading')}
                </Typography>
              </Stack>
            )}
            {!isLoading && !hasAnyMatches && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {t('adminMatchesNoResults')}
              </Alert>
            )}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>{t('predictions')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {groupKeys.map(renderPredictionSection)}
                {knockoutKeys.map(renderPredictionSection)}
                {otherKeys.map(renderPredictionSection)}
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ mt: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>{t('matches')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {groupKeys.map(renderMatchesSection)}
                {knockoutKeys.map(renderMatchesSection)}
                {otherKeys.map(renderMatchesSection)}
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ mt: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>{t('ranking')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>{t('participant')}</TableCell>
                        <TableCell>{t('score')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ranking.map((u, idx) => (
                        <TableRow
                          key={u.userId}
                          className={`rank-${idx + 1} ${u.username === currentUsername ? 'current-user-row' : ''}`.trim()}
                        >
                          <TableCell>{idx + 1}</TableCell>
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
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          </CardContent>
        </Card>
      )}

      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{penca.name}</DialogTitle>
        <DialogContent dividers>
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
