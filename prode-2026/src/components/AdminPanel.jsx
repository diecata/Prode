import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function AdminPanel() {
  const { profile } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (profile?.is_admin) {
      fetchMatches();
    }
  }, [profile]);

  const fetchMatches = async () => {
    setLoading(true);
    const { data } = await supabase.from('matches').select('*').order('match_order', { ascending: true });
    setMatches(data || []);
    setLoading(false);
  };

  const importFixture = async () => {
    if (!window.confirm('¿Seguro que deseas importar el fixture? Esto podría duplicar partidos si ya existen.')) return;
    
    setImporting(true);
    try {
      const res = await fetch('/fixture.json');
      const data = await res.json();
      
      const formattedMatches = data.map(m => ({
        match_order: m.orden,
        phase: m.fase,
        group_name: m.grupo,
        date_utc: m.fecha_hora_utc_iso,
        home_team: m.equipo_local,
        away_team: m.equipo_visitante,
        stadium: m.estadio,
        city: m.ciudad,
        country: m.pais,
        status: 'pending'
      }));

      const { error } = await supabase.from('matches').insert(formattedMatches);
      
      if (error) throw error;
      alert('Fixture importado correctamente');
      fetchMatches();
    } catch (err) {
      alert('Error importando fixture: ' + err.message);
    }
    setImporting(false);
  };

  const updateTeams = async (matchId, newHomeTeam, newAwayTeam) => {
    const { error } = await supabase
      .from('matches')
      .update({ home_team: newHomeTeam, away_team: newAwayTeam })
      .eq('id', matchId);

    if (error) {
      alert('Error actualizando equipos: ' + error.message);
      return;
    }
    fetchMatches();
  };

  const updateResult = async (matchId, homeScore, awayScore) => {
    const { error } = await supabase
      .from('matches')
      .update({ home_score: homeScore, away_score: awayScore, status: 'finished' })
      .eq('id', matchId);

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    // Trigger point calculation via Supabase RPC
    const { error: rpcError } = await supabase.rpc('calculate_points_for_match', { p_match_id: matchId });
    if (rpcError) {
      alert('Resultados actualizados, pero error al calcular puntos: ' + rpcError.message);
    } else {
      alert('Resultado guardado y puntos calculados.');
      fetchMatches();
    }
  };

  if (!profile?.is_admin) return <Navigate to="/" />;
  if (loading) return <div style={{ textAlign: 'center', marginTop: '2rem' }}>Cargando panel de administración...</div>;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.8rem' }}>Panel de Administración</h2>
        <button 
          onClick={importFixture} 
          disabled={importing}
          style={{ padding: '0.75rem 1.5rem', background: 'var(--primary)', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}>
          {importing ? 'Importando...' : 'Importar Fixture JSON'}
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Cargar Resultados Reales</h3>
        
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
              <th style={thStyle}>Fase</th>
              <th style={thStyle}>Local</th>
              <th style={thStyle}>Visitante</th>
              <th style={thStyle}>Estado</th>
              <th style={thStyle}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {matches.map(m => (
              <tr key={m.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={tdStyle}>{m.phase} {m.group_name && `- G.${m.group_name}`}</td>
                <td colSpan="2" style={tdStyle}>
                  {m.phase === 'Fase de grupos' ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{flex: 1}}>{m.home_team}</span>
                      <span style={{flex: 1}}>{m.away_team}</span>
                    </div>
                  ) : (
                    <EditTeamsForm match={m} onSave={updateTeams} />
                  )}
                </td>
                <td style={tdStyle}>
                  {m.status === 'finished' ? (
                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{m.home_score} - {m.away_score}</span>
                  ) : 'Pendiente'}
                </td>
                <td style={tdStyle}>
                  {m.status === 'pending' && (
                    <MatchResultForm match={m} onSave={updateResult} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatchResultForm({ match, onSave }) {
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');

  const handleSave = () => {
    if (home === '' || away === '') {
      alert('Ingresa ambos resultados');
      return;
    }
    onSave(match.id, parseInt(home), parseInt(away));
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <input type="number" min="0" value={home} onChange={e => setHome(e.target.value)} style={scoreInputStyle} placeholder="L" />
      <span>-</span>
      <input type="number" min="0" value={away} onChange={e => setAway(e.target.value)} style={scoreInputStyle} placeholder="V" />
      <button onClick={handleSave} style={{ padding: '0.5rem 1rem', background: 'var(--primary)', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>Guardar Res.</button>
    </div>
  );
}

function EditTeamsForm({ match, onSave }) {
  const [home, setHome] = useState(match.home_team);
  const [away, setAway] = useState(match.away_team);

  const handleSave = () => {
    if (home === match.home_team && away === match.away_team) return;
    onSave(match.id, home, away);
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <input type="text" value={home} onChange={e => setHome(e.target.value)} style={{...inputStyle, flex: 1}} />
      <span>vs</span>
      <input type="text" value={away} onChange={e => setAway(e.target.value)} style={{...inputStyle, flex: 1}} />
      <button onClick={handleSave} style={{ padding: '0.5rem', background: 'var(--glass-bg)', color: 'white', borderRadius: '4px', border: '1px solid var(--glass-border)', cursor: 'pointer' }}>✎</button>
    </div>
  );
}

const thStyle = { padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' };
const tdStyle = { padding: '1rem' };
const inputStyle = { padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.3)', color: 'white' };
const scoreInputStyle = { width: '50px', padding: '0.5rem', textAlign: 'center', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.3)', color: 'white' };
