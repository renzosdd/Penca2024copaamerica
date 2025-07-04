import { useEffect, useState } from 'react';

export default function Admin() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/admin/edit', { headers: { Accept: 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error('admin fetch error', err);
      }
    }
    load();
  }, []);

  return (
    <div className="container" style={{ marginTop: '2rem' }}>
      <h5>Admin</h5>
      {users.map((u) => (
        <div key={u._id}>{u.username}</div>
      ))}
    </div>
  );
}
