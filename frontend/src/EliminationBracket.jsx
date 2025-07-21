import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import roundOrder from './roundOrder';
 
export default function EliminationBracket({ bracket }) {
  if (!bracket) return null;
  const order = roundOrder.slice(4);
  return (
    <div>
      {order.map(r => (
        bracket[r] && bracket[r].length ? (
          <div key={r} style={{ marginBottom: '1rem' }}>
            <h6>{r}</h6>
            {bracket[r].map(m => (
              <Card key={m._id} className="match-card">
                <CardContent>
                  <div className="match-header">
                    <div className="team">
                      <Typography variant="body1" className="team-name">
                        {m.team1}
                      </Typography>
                    </div>
                    <Typography variant="body2" className="vs">
                      vs
                    </Typography>
                    <div className="team">
                      <Typography variant="body1" className="team-name">
                        {m.team2}
                      </Typography>
                    </div>
                  </div>
                  {m.result1 != null && m.result2 != null && (
                    <div className="match-details">
                      {m.result1} - {m.result2}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null
      ))}
    </div>
  );
}
