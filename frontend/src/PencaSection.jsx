import { useState } from 'react';
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
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GroupTable from './GroupTable';
import roundOrder from './roundOrder';
import useLang from './useLang';
import pointsForPrediction from './calcPoints';
import { formatLocalKickoff, matchKickoffValue, minutesUntilKickoff } from './kickoffUtils';

export default function PencaSection({ penca, matches, groups, getPrediction, handlePrediction, ranking, currentUsername }) {
  const [open, setOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { t } = useLang();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
  const participantsCount = Array.isArray(penca.participants) ? penca.participants.length : 0;
  const modeKey = penca.tournamentMode ? `mode_${penca.tournamentMode}` : 'mode_group_stage_knockout';
  const translatedMode = t(modeKey);
  const tournamentLabel = translatedMode === modeKey ? penca.tournamentMode || t('mode_group_stage_knockout') : translatedMode;
  const participantsLabel = `${participantsCount} ${t('participantsShort')}`;

  const pMatches = (() => {
    let list = [];
    if (Array.isArray(penca.fixture) && penca.fixture.length) {
      list = matches.filter(m => penca.fixture.includes(m._id));
    } else {
      list = matches.filter(m => m.competition === penca.competition);
    }
    list.sort((a, b) => matchTimeValue(a) - matchTimeValue(b));
    if (filter === 'upcoming') {
      list = list.filter(m => m.result1 == null && m.result2 == null);
    } else if (filter === 'played') {
      list = list.filter(m => m.result1 != null && m.result2 != null);
    }
    const grouped = {};
    list.forEach(m => {
      const g = m.group_name?.trim() || 'Otros';
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(m);
    });
    return grouped;
  })();

  const isGroupKey = key => /^Grupo\s+/i.test(key);
  const compareGroupKey = (a, b) => {
    const normalize = value => value.replace(/^Grupo\s+/i, '').trim();
    return normalize(a).localeCompare(normalize(b), undefined, { sensitivity: 'base', numeric: true });
  };

  const knockoutOrder = roundOrder.filter(label => !/^Grupo\s+/i.test(label));
  const groupKeys = Object.keys(pMatches)
    .filter(isGroupKey)
    .sort(compareGroupKey);
  const knockoutKeys = knockoutOrder.filter(label => Array.isArray(pMatches[label]));
  const knockoutSet = new Set(knockoutKeys);
  const otherKeys = Object.keys(pMatches)
    .filter(key => !isGroupKey(key) && !knockoutSet.has(key))
    .sort((a, b) => matchTimeValue(pMatches[a]?.[0]) - matchTimeValue(pMatches[b]?.[0]));

  const renderPredictionCard = match => {
    const pr = getPrediction(penca._id, match._id) || {};
    const editable = canPredict(match);
    return (
      <Card key={match._id} className={pr.result1 !== undefined ? 'match-card saved' : 'match-card'}>
        <CardContent>
          <div className="match-header">
            <div className="team">
              <img src={`/images/${match.team1.replace(/\s+/g, '').toLowerCase()}.png`} alt={match.team1} className="circle responsive-img" />
              <span className="team-name">{match.team1}</span>
            </div>
            <span className="vs">{t('vs')}</span>
            <div className="team">
              <img src={`/images/${match.team2.replace(/\s+/g, '').toLowerCase()}.png`} alt={match.team2} className="circle responsive-img" />
              <span className="team-name">{match.team2}</span>
            </div>
          </div>
          <div className="match-details">
            <div className="match-time">
              {formatLocalKickoff(match) ? (
                <span>{formatLocalKickoff(match)}</span>
              ) : match.date && match.time ? (
                <span>{match.date} {match.time}</span>
              ) : (
                <span>{t('scheduleTbd')}</span>
              )}
            </div>
            <form onSubmit={e => submitPrediction(e, penca._id, match._id)}>
              <div className="input-field inline">
                <TextField
                  name="result1"
                  type="number"
                  defaultValue={pr.result1 ?? ''}
                  required
                  size="small"
                  sx={{ width: 60 }}
                  inputProps={{ min: 0 }}
                  disabled={!editable}
                />
                <span>-</span>
                <TextField
                  name="result2"
                  type="number"
                  defaultValue={pr.result2 ?? ''}
                  required
                  size="small"
                  sx={{ width: 60, ml: 1 }}
                  inputProps={{ min: 0 }}
                  disabled={!editable}
                />
              </div>
              <Button variant="contained" type="submit" disabled={!editable}>{t('save')}</Button>
            </form>
          </div>
          {match.result1 !== undefined && match.result2 !== undefined && (
            <div className="match-info">
              <strong>{t('result')}: {match.result1} - {match.result2}</strong>
              {pr.result1 !== undefined && pr.result2 !== undefined && (
                <>
                  {' '}{t('difference')}: ({pr.result1 - match.result1}/{pr.result2 - match.result2})
                  <span className="points-earned">{t('pointsEarned')}: {pointsForPrediction(pr, match, penca.scoring)} {t('pts')}</span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderMatchCard = match => (
    <Card key={match._id} className="match-card">
      <CardContent>
        <div className="match-header">
          <div className="team">
            <img src={`/images/${match.team1.replace(/\s+/g, '').toLowerCase()}.png`} alt={match.team1} className="circle responsive-img" />
            <span className="team-name">{match.team1}</span>
          </div>
          <span className="vs">{t('vs')}</span>
          <div className="team">
            <img src={`/images/${match.team2.replace(/\s+/g, '').toLowerCase()}.png`} alt={match.team2} className="circle responsive-img" />
            <span className="team-name">{match.team2}</span>
          </div>
        </div>
        <div className="match-details">
          {match.result1 !== undefined && match.result2 !== undefined ? (
            <strong>{match.result1} - {match.result2}</strong>
          ) : formatLocalKickoff(match) ? (
            <span>{formatLocalKickoff(match)}</span>
          ) : match.date && match.time ? (
            <span>{match.date} {match.time}</span>
          ) : (
            <span>{t('scheduleTbd')}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderPredictionSection = key => (
    <div key={key} style={{ marginBottom: '1rem' }}>
      <h6>{key}</h6>
      {pMatches[key].map(renderPredictionCard)}
    </div>
  );

  const renderMatchesSection = key => (
    <div key={key} style={{ marginBottom: '1rem' }}>
      <h6>{key}</h6>
      {pMatches[key].map(renderMatchCard)}
    </div>
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
