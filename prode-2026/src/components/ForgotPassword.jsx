import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login', // After resetting, they can log in
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Te hemos enviado un correo con un enlace para restablecer tu contraseña. (Revisa la carpeta de Spam)');
    }
    setLoading(false);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '1rem' }}>
      <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.8rem', fontWeight: 'bold' }}>Recuperar Clave</h2>
        
        {error && <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(239, 68, 68, 0.5)' }}>{error}</div>}
        {message && <div style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(16, 185, 129, 0.5)' }}>{message}</div>}
        
        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Email con el que te registraste</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '8px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
          >
            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>
        </form>
        <p style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Volver al Login</Link>
        </p>
      </div>
    </div>
  );
}
