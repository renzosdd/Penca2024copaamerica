import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [pencas, setPencas] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const data = await res.json();
          setPencas(data.pencas || []);
        }
      } catch (err) {
        console.error('dashboard fetch error', err);
      }
    }
    load();
  }, []);

  return (
    <div className="container" style={{ marginTop: '2rem' }}>
      <h5>Mis Pencas</h5>
      {pencas.length === 0 && <p>No est\u00e1s en ninguna penca.</p>}
      {pencas.map((p) => (
        <div key={p._id} className="card">
          <div className="card-content">
            <span className="card-title">{p.name}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
