import React from 'react';

export default function EliminationBracket({ bracket }) {
  if (!bracket) return null;
  const order = ['Cuartos de final', 'Semifinales', 'Tercer puesto', 'Final'];
  return (
    <div>
      {order.map(r => (
        bracket[r] && bracket[r].length ? (
          <div key={r} style={{ marginBottom: '1rem' }}>
            <h6>{r}</h6>
            {bracket[r].map(m => (
              <div key={m._id} className="match-card">
                <div className="match-header">
                  <div className="team">
                    <span className="team-name">{m.team1}</span>
                  </div>
                  <span className="vs">vs</span>
                  <div className="team">
                    <span className="team-name">{m.team2}</span>
                  </div>
                </div>
                {m.result1 != null && m.result2 != null && (
                  <div className="match-details">
                    {m.result1} - {m.result2}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null
      ))}
    </div>
  );
}
