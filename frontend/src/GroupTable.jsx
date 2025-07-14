import React from 'react';

export default function GroupTable({ groups }) {
  if (!groups || !groups.length) return null;
  return (
    <div>
      {groups.map(g => (
        <div key={g.group} style={{ marginBottom: '1rem' }}>
          <h6>{g.group}</h6>
          <table className="striped">
            <thead>
              <tr>
                <th>Equipo</th>
                <th>Pts</th>
                <th>DG</th>
                <th>GF</th>
              </tr>
            </thead>
            <tbody>
              {g.teams
                .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
                .map(t => (
                  <tr key={t.team}>
                    <td>{t.team}</td>
                    <td>{t.points}</td>
                    <td>{t.gd}</td>
                    <td>{t.gf}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
