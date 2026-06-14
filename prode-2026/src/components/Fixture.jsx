import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function Fixture() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [dirtyPredictions, setDirtyPredictions] = useState({});
  const [savingAll, setSavingAll] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Fetch matches
    const { data: matchesData } = await supabase
      .from('matches')
      .select('*')
      .order('match_order', { ascending: true });

    // Fetch user predictions
    const { data: predsData } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', user.id);

    const predsMap = {};
    if (predsData) {
      predsData.forEach(p => {
        predsMap[p.match_id] = p;
      });
    }

    setMatches(matchesData || []);
    setPredictions(predsMap);
    setLoading(false);
  };

  const handlePredictionChange = (matchId, team, value) => {
    const numValue = value === '' ? '' : parseInt(value, 10);
    setPredictions(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [team === 'home' ? 'home_score' : 'away_score']: numValue
      }
    }));
    setDirtyPredictions(prev => ({ ...prev, [matchId]: true }));
  };

  const saveSinglePrediction = async (matchId) => {
    const pred = predictions[matchId];
    if (!pred || pred.home_score === '' || pred.home_score === undefined || pred.away_score === '' || pred.away_score === undefined) {
      alert('Debes completar ambos goles antes de guardar.');
      return;
    }

    const { error } = await supabase
      .from('predictions')
      .upsert({
        user_id: user.id,
        match_id: matchId,
        home_score: pred.home_score,
        away_score: pred.away_score,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, match_id' });

    if (error) {
      console.error('Error al guardar:', error.message);
      alert('⚠️ No se pudo guardar tu pronóstico. Es posible que ya esté bloqueado (falta menos de 30 minutos) o haya un error de conexión.');
    } else {
      setDirtyPredictions(prev => ({ ...prev, [matchId]: false }));
      // Optional: Fetch data again to ensure UI has the updated_at timestamp
      fetchData();
    }
  };

  const saveAllPredictions = async () => {
    const toSave = [];
    Object.keys(dirtyPredictions).forEach(matchId => {
      if (dirtyPredictions[matchId]) {
        const pred = predictions[matchId];
        if (pred && pred.home_score !== '' && pred.home_score !== undefined && pred.away_score !== '' && pred.away_score !== undefined) {
          toSave.push({
            user_id: user.id,
            match_id: matchId,
            home_score: pred.home_score,
            away_score: pred.away_score,
            updated_at: new Date().toISOString()
          });
        }
      }
    });

    if (toSave.length === 0) {
      alert('No tienes pronósticos completos nuevos para guardar.');
      return;
    }

    setSavingAll(true);
    const { error } = await supabase
      .from('predictions')
      .upsert(toSave, { onConflict: 'user_id, match_id' });

    if (error) {
      alert('Error guardando todo: ' + error.message);
    } else {
      setDirtyPredictions({});
      alert('¡Todos tus pronósticos fueron guardados exitosamente!');
      fetchData();
    }
    setSavingAll(false);
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '2rem' }}>Cargando fixture...</div>;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const displayedMatches = showAllMatches 
    ? matches 
    : matches.filter(match => new Date(match.date_utc).getTime() >= startOfToday.getTime());

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.8rem', margin: 0 }}>Fixture y Pronósticos</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.95rem', color: 'var(--text-main)', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            <input 
              type="checkbox" 
              checked={showAllMatches} 
              onChange={(e) => setShowAllMatches(e.target.checked)} 
              style={{ cursor: 'pointer' }}
            />
            Mostrar fechas anteriores
          </label>

          {Object.values(dirtyPredictions).some(v => v) && (
            <button 
              onClick={saveAllPredictions}
              disabled={savingAll}
              style={{ 
                padding: '0.8rem 1.5rem', 
                background: '#f59e0b', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontWeight: 'bold', 
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}>
              {savingAll ? 'Guardando...' : '💾 Guardar Todo'}
            </button>
          )}
        </div>
      </div>
      
      <div className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '2rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--primary)' }}>
        <h3 style={{ marginBottom: '0.5rem', color: 'var(--primary)', fontSize: '1.2rem' }}>Reglas de Puntuación</h3>
        <ul style={{ marginLeft: '1.5rem', fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
          <li><strong style={{color: 'white'}}>12 Puntos (Pleno Exacto):</strong> Acertar quién gana (o el empate) y la cantidad exacta de goles de ambos.</li>
          <li><strong style={{color: 'white'}}>7 Puntos:</strong> Acertar quién gana (o el empate) + acertar la cantidad de goles de uno de los dos equipos.</li>
          <li><strong style={{color: 'white'}}>5 Puntos:</strong> Acertar quién gana (o el empate), pero fallar en la cantidad de goles de ambos equipos.</li>
          <li><strong style={{color: 'white'}}>2 Puntos (Consuelo):</strong> Fallar en quién gana o empata, pero haber acertado la cantidad de goles de uno.</li>
          <li><strong style={{color: 'white'}}>0 Puntos:</strong> No acertar el ganador ni la cantidad de goles de ninguno de los equipos.</li>
        </ul>
        <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <i>Recuerda presionar el botón "Guardar" luego de ingresar tus resultados. Tienes tiempo de modificarlos hasta 30 minutos antes de cada partido.</i>
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
        {displayedMatches.map(match => {
          const isLocked = new Date(match.date_utc).getTime() - (30 * 60 * 1000) < new Date().getTime();
          const pred = predictions[match.id] || {};
          
          return (
            <div key={match.id} className="glass-panel" style={{ padding: '1.5rem', position: 'relative', opacity: isLocked ? 0.8 : 1 }}>
              {isLocked && (
                <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  BLOQUEADO
                </div>
              )}
              
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                <div>{match.phase} - Grupo {match.group_name}</div>
                <div>{new Date(match.date_utc).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })} hs</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                {/* Home Team */}
                <div style={{ flex: 1, textAlign: 'right', fontWeight: 'bold' }}>{match.home_team}</div>
                
                {/* Inputs */}
                <div style={{ display: 'flex', gap: '0.5rem', margin: '0 1rem' }}>
                  <input 
                    type="number" 
                    min="0" 
                    max="20"
                    value={pred.home_score !== undefined ? pred.home_score : ''}
                    onChange={(e) => handlePredictionChange(match.id, 'home', e.target.value)}
                    disabled={isLocked}
                    style={scoreInputStyle}
                  />
                  <span style={{ alignSelf: 'center', fontWeight: 'bold' }}>-</span>
                  <input 
                    type="number" 
                    min="0" 
                    max="20"
                    value={pred.away_score !== undefined ? pred.away_score : ''}
                    onChange={(e) => handlePredictionChange(match.id, 'away', e.target.value)}
                    disabled={isLocked}
                    style={scoreInputStyle}
                  />
                </div>
                
                {/* Away Team */}
                <div style={{ flex: 1, textAlign: 'left', fontWeight: 'bold' }}>{match.away_team}</div>
              </div>

              {match.status === 'pending' && (
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  {dirtyPredictions[match.id] ? (
                    <div className="animate-fade-in">
                      <span style={{ fontSize: '0.85rem', color: '#fbbf24', display: 'block', marginBottom: '0.5rem' }}>
                        ⚠️ Sin guardar. Haz clic en Guardar o perderás el cambio.
                      </span>
                      <button 
                        onClick={() => saveSinglePrediction(match.id)}
                        style={{ padding: '0.4rem 1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                        Guardar Partido
                      </button>
                    </div>
                  ) : pred.updated_at ? (
                    <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold' }}>✅ Pronóstico Guardado</span>
                  ) : null}
                </div>
              )}

              {match.status === 'finished' && (
                <div style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--primary)' }}>
                  Resultado Real: {match.home_score} - {match.away_score}
                  <div style={{ fontWeight: 'bold', marginTop: '0.2rem' }}>Puntos ganados: {pred.points_earned || 0}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const scoreInputStyle = {
  width: '45px',
  height: '45px',
  textAlign: 'center',
  fontSize: '1.2rem',
  fontWeight: 'bold',
  borderRadius: '8px',
  border: '1px solid var(--glass-border)',
  background: 'rgba(0,0,0,0.3)',
  color: 'white',
  MozAppearance: 'textfield'
};
