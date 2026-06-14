import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function Leaderboard() {
  const { profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.group_id) {
      fetchLeaderboard();
    }
  }, [profile]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('group_id', profile.group_id)
      .order('total_points', { ascending: false });
      
    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '2rem' }}>Cargando ranking...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.8rem' }}>Tabla de Posiciones</h2>
        <div style={{ background: 'var(--glass-bg)', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
          Grupo: <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{profile?.groups?.name}</span>
        </div>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
              <th style={thStyle}>Pos</th>
              <th style={thStyle}>Jugador</th>
              <th style={{...thStyle, textAlign: 'right'}}>Puntos Totales</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, index) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={tdStyle}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: index < 3 ? 'var(--primary)' : 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {index + 1}
                  </div>
                </td>
                <td style={{...tdStyle, fontWeight: u.id === profile.id ? 'bold' : 'normal', color: u.id === profile.id ? 'var(--primary)' : 'inherit'}}>
                  {u.first_name} {u.last_name}
                </td>
                <td style={{...tdStyle, textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem'}}>
                  {u.total_points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = { padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600', borderBottom: '1px solid var(--glass-border)' };
const tdStyle = { padding: '1rem' };
