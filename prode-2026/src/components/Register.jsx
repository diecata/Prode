import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // First, verify if the group code exists
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('id')
      .eq('code', groupCode)
      .single();

    if (groupError || !groupData) {
      console.error("Supabase Error:", groupError);
      if (groupError && groupError.message && !groupError.message.includes('Row not found') && !groupError.details?.includes('0 rows')) {
         setError('Error de conexión con la base de datos: ' + groupError.message + '. Verifica que hayas ejecutado el schema.sql y configurado las variables de entorno.');
      } else {
         setError('El código de grupo no existe.');
      }
      setLoading(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          group_code: groupCode
        }
      }
    });

    if (signUpError) {
      setError(signUpError.message);
    } else {
      alert('Registro exitoso. Ya puedes iniciar sesión.');
      navigate('/login');
    }
    setLoading(false);
  };

  return (
    <div className="register-container animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1rem' }}>
      <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '2rem', fontWeight: 'bold' }}>Registro</h2>
        {error && <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(239, 68, 68, 0.5)' }}>{error}</div>}
        
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nombre</label>
              <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Apellido</label>
              <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Código de Grupo</label>
            <input type="text" required value={groupCode} onChange={(e) => setGroupCode(e.target.value.toUpperCase())} placeholder="Ej: GASENER" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Contraseña</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} style={inputStyle} />
          </div>
          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? 'Registrando...' : 'Registrarme'}
          </button>
        </form>
        <p style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          ¿Ya tienes cuenta? <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' };
const buttonStyle = { marginTop: '1rem', padding: '0.75rem', borderRadius: '8px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' };
