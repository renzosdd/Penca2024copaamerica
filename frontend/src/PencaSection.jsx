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

export default function PencaSection({ penca, matches, groups, getPrediction, handlePrediction, ranking, currentUsername }) {
  const [open, setOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { t } = useLang();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  function canPredict(match) {
    const start = new Date(`${match.date}T${match.time}:00`);
    const diff = (start - new Date()) / 60000;
    return diff >= 30;
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
    list.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
    if (filter === 'upcoming') {
      list = list.filter(m => m.result1 == null && m.result2 == null);
    } else if (filter === 'played') {
      list = list.filter(m => m.result1 != null && m.result2 != null);
    }
    const grouped = {};
    list.forEach(m => {
      const g = m.group_name || 'Otros';
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(m);
    });
    return grouped;
  })();

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
                {Object.keys(pMatches)
                  .filter(g => g.startsWith('Grupo'))
                  .sort((a, b) => {
                    const ai = roundOrder.indexOf(a);
                    const bi = roundOrder.indexOf(b);
                    if (ai === -1 && bi === -1) return a.localeCompare(b);
                    if (ai === -1) return 1;
                    if (bi === -1) return -1;
                    return ai - bi;
                  })
                  .map(g => (
                    <div key={g} style={{ marginBottom: '1rem' }}>
                      <h6>{g}</h6>
                      {pMatches[g].map(m => {
                        const pr = getPrediction(penca._id, m._id) || {};
                        const editable = canPredict(m);
                        return (
                          <Card key={m._id} className={pr.result1 !== undefined ? 'match-card saved' : 'match-card'}>
                            <CardContent>
                              <div className="match-header">
                                <div className="team">
                                  <img src={`/images/${m.team1.replace(/\s+/g, '').toLowerCase()}.png`} alt={m.team1} className="circle responsive-img" />
                                  <span className="team-name">{m.team1}</span>
                                </div>
                                <span className="vs">{t('vs')}</span>
                                <div className="team">
                                  <img src={`/images/${m.team2.replace(/\s+/g, '').toLowerCase()}.png`} alt={m.team2} className="circle responsive-img" />
                                  <span className="team-name">{m.team2}</span>
                                </div>
                              </div>
                              <div className="match-details">
                                <form onSubmit={e => submitPrediction(e, penca._id, m._id)}>
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
                              {m.result1 !== undefined && m.result2 !== undefined && (
                                <div className="match-info">
                                  <strong>{t('result')}: {m.result1} - {m.result2}</strong>
                                  {pr.result1 !== undefined && pr.result2 !== undefined && (
                                    <>
                                      {' '}{t('difference')}: ({pr.result1 - m.result1}/{pr.result2 - m.result2})
                                      <span className="points-earned">{t('pointsEarned')}: {pointsForPrediction(pr, m, penca.scoring)} {t('pts')}</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ))}

                <div style={{ marginTop: '1rem' }}>
                    <h6>{t('knockout')}</h6>
                    {roundOrder
                      .slice(4)
                      .filter(r => pMatches[r])
                      .map(r => (
                        <div key={r} style={{ marginBottom: '1rem' }}>
                          <h6>{r}</h6>
                          {pMatches[r].map(m => {
                            const pr = getPrediction(penca._id, m._id) || {};
                            const editable = canPredict(m);
                            return (
                              <Card key={m._id} className={pr.result1 !== undefined ? 'match-card saved' : 'match-card'}>
                                <CardContent>
                                  <div className="match-header">
                                    <div className="team">
                                      <img src={`/images/${m.team1.replace(/\s+/g, '').toLowerCase()}.png`} alt={m.team1} className="circle responsive-img" />
                                      <span className="team-name">{m.team1}</span>
                                    </div>
                                    <span className="vs">{t('vs')}</span>
                                    <div className="team">
                                      <img src={`/images/${m.team2.replace(/\s+/g, '').toLowerCase()}.png`} alt={m.team2} className="circle responsive-img" />
                                      <span className="team-name">{m.team2}</span>
                                    </div>
                                  </div>
                                  <div className="match-details">
                                    <form onSubmit={e => submitPrediction(e, penca._id, m._id)}>
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
                                  {m.result1 !== undefined && m.result2 !== undefined && (
                                    <div className="match-info">
                                      <strong>{t('result')}: {m.result1} - {m.result2}</strong>
                                      {pr.result1 !== undefined && pr.result2 !== undefined && (
                                        <>
                                          {' '}{t('difference')}: ({pr.result1 - m.result1}/{pr.result2 - m.result2})
                                          <span className="points-earned">{t('pointsEarned')}: {pointsForPrediction(pr, m, penca.scoring)} {t('pts')}</span>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      ))}
                  </div>
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ mt: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>{t('matches')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {Object.keys(pMatches)
                  .filter(g => g.startsWith('Grupo'))
                  .sort((a, b) => {
                    const ai = roundOrder.indexOf(a);
                    const bi = roundOrder.indexOf(b);
                    if (ai === -1 && bi === -1) return a.localeCompare(b);
                    if (ai === -1) return 1;
                    if (bi === -1) return -1;
                    return ai - bi;
                  })
                  .map(g => (
                    <div key={g} style={{ marginBottom: '1rem' }}>
                      <h6>{g}</h6>
                      {pMatches[g].map(m => (
                        <Card key={m._id} className="match-card">
                          <CardContent>
                            <div className="match-header">
                              <div className="team">
                                <img src={`/images/${m.team1.replace(/\s+/g, '').toLowerCase()}.png`} alt={m.team1} className="circle responsive-img" />
                                <span className="team-name">{m.team1}</span>
                              </div>
                              <span className="vs">{t('vs')}</span>
                              <div className="team">
                                <img src={`/images/${m.team2.replace(/\s+/g, '').toLowerCase()}.png`} alt={m.team2} className="circle responsive-img" />
                                <span className="team-name">{m.team2}</span>
                              </div>
                            </div>
                            <div className="match-details">
                              {m.result1 !== undefined && m.result2 !== undefined ? (
                                <strong>{m.result1} - {m.result2}</strong>
                              ) : (
                                <span>{m.date} {m.time}</span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ))}

                {['Cuartos de final', 'Semifinales', 'Tercer puesto', 'Final']
                  .filter(r => pMatches[r])
                  .map(r => (
                    <div key={r} style={{ marginBottom: '1rem' }}>
                      <h6>{r}</h6>
                      {pMatches[r].map(m => (
                        <Card key={m._id} className="match-card">
                          <CardContent>
                            <div className="match-header">
                              <div className="team">
                                <img src={`/images/${m.team1.replace(/\s+/g, '').toLowerCase()}.png`} alt={m.team1} className="circle responsive-img" />
                                <span className="team-name">{m.team1}</span>
                              </div>
                              <span className="vs">{t('vs')}</span>
                              <div className="team">
                                <img src={`/images/${m.team2.replace(/\s+/g, '').toLowerCase()}.png`} alt={m.team2} className="circle responsive-img" />
                                <span className="team-name">{m.team2}</span>
                              </div>
                            </div>
                            <div className="match-details">
                              {m.result1 !== undefined && m.result2 !== undefined ? (
                                <strong>{m.result1} - {m.result2}</strong>
                              ) : (
                                <span>{m.date} {m.time}</span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ))}
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
    </div>
  );
}
