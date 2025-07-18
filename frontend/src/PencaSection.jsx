import { useState } from 'react';
import {
  Card,
  CardContent,
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import GroupTable from './GroupTable';
import roundOrder from './roundOrder';

export default function PencaSection({ penca, matches, groups, getPrediction, handlePrediction, ranking, bracket }) {
  const [open, setOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  function canPredict(match) {
    const start = new Date(`${match.date}T${match.time}:00`);
    const diff = (start - new Date()) / 60000;
    return diff >= 30;
  }

  const pMatches = (() => {
    let list = [];
    if (Array.isArray(penca.fixture) && penca.fixture.length) {
      list = matches.filter(m => penca.fixture.includes(m._id));
    } else {
      list = matches.filter(m => m.competition === penca.competition);
    }
    list.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
    const grouped = {};
    list.forEach(m => {
      const g = m.group_name || 'Otros';
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(m);
    });
    return grouped;
  })();

  return (
    <div style={{ marginBottom: '1rem' }}>
      <Card style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <CardContent>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <strong>{penca.name}</strong>
            <IconButton
              size="small"
              onClick={e => {
                e.stopPropagation();
                setInfoOpen(true);
              }}
            >
              <InfoOutlined fontSize="small" />
            </IconButton>
          </div>
        </CardContent>
      </Card>
      {open && (
        <Card style={{ marginTop: '0', borderTop: 'none', padding: '1rem' }}>
          <CardContent>
            <Accordion>
              <AccordionSummary expandIcon="▶">
                <Typography>Predicciones</Typography>
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
                                <span className="vs">vs</span>
                                <div className="team">
                                  <img src={`/images/${m.team2.replace(/\s+/g, '').toLowerCase()}.png`} alt={m.team2} className="circle responsive-img" />
                                  <span className="team-name">{m.team2}</span>
                                </div>
                              </div>
                              <div className="match-details">
                                <form onSubmit={e => handlePrediction(e, penca._id, m._id)}>
                                  <div className="input-field inline">
                                    <TextField
                                      name="result1"
                                      type="number"
                                      defaultValue={pr.result1 || ''}
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
                                      defaultValue={pr.result2 || ''}
                                      required
                                      size="small"
                                      sx={{ width: 60, ml: 1 }}
                                      inputProps={{ min: 0 }}
                                      disabled={!editable}
                                    />
                                  </div>
                                  <Button variant="contained" type="submit" disabled={!editable}>Guardar</Button>
                                </form>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ))}

                {!bracket && (
                  <div style={{ marginTop: '1rem' }}>
                    <h6>Eliminatorias</h6>
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
                                    <span className="vs">vs</span>
                                    <div className="team">
                                      <img src={`/images/${m.team2.replace(/\s+/g, '').toLowerCase()}.png`} alt={m.team2} className="circle responsive-img" />
                                      <span className="team-name">{m.team2}</span>
                                    </div>
                                  </div>
                                  <div className="match-details">
                                    <form onSubmit={e => handlePrediction(e, penca._id, m._id)}>
                                      <div className="input-field inline">
                                        <TextField
                                          name="result1"
                                          type="number"
                                          defaultValue={pr.result1 || ''}
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
                                          defaultValue={pr.result2 || ''}
                                          required
                                          size="small"
                                          sx={{ width: 60, ml: 1 }}
                                          inputProps={{ min: 0 }}
                                          disabled={!editable}
                                        />
                                      </div>
                                      <Button variant="contained" type="submit" disabled={!editable}>Guardar</Button>
                                    </form>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      ))}
                  </div>
                )}
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ mt: 1 }}>
              <AccordionSummary expandIcon="▶">
                <Typography>Partidos</Typography>
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
                              <span className="vs">vs</span>
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
                              <span className="vs">vs</span>
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
              <AccordionSummary expandIcon="▶">
                <Typography>Ranking</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <ul className="collection">
                  {ranking.map((u, idx) => (
                    <li key={u.userId} className={`collection-item rank-${idx + 1}`.trim()}>
                      <img src={u.avatar} alt={u.username} className="avatar-small" /> {u.username} - {u.score}
                    </li>
                  ))}
                </ul>
              </AccordionDetails>
            </Accordion>
          </CardContent>
        </Card>
      )}

      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)}>
        <DialogTitle>{penca.name}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" gutterBottom>
            Reglas
          </Typography>
          <Typography variant="body2" paragraph>
            {penca.rules || 'Sin reglas definidas'}
          </Typography>
          <Typography variant="subtitle2" gutterBottom>
            Premios
          </Typography>
          <Typography variant="body2">
            {penca.prizes || 'Sin premios definidos'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
