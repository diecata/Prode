import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Outlet, NavLink } from 'react-router-dom';

export default function Dashboard() {
  const { profile, signOut } = useAuth();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="glass-panel" style={{ padding: '1rem 2rem', margin: '1rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary)' }}>PRODE 2026</h1>
        
        <nav style={{ display: 'flex', gap: '2rem' }}>
          <NavLink to="/" end style={navLinkStyle}>Fixture</NavLink>
          <NavLink to="/leaderboard" style={navLinkStyle}>Ranking</NavLink>
          {profile?.is_admin && (
             <NavLink to="/admin" style={navLinkStyle}>Admin</NavLink>
          )}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold' }}>{profile?.first_name} {profile?.last_name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{profile?.groups?.name} - {profile?.total_points} pts</div>
          </div>
          <button onClick={signOut} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'white' }}>
            Salir
          </button>
        </div>
      </header>

      <main style={{ flex: 1, padding: '1rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <Outlet />
      </main>
    </div>
  );
}

const navLinkStyle = ({ isActive }) => ({
  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
  textDecoration: 'none',
  fontWeight: isActive ? 'bold' : 'normal',
  padding: '0.5rem 0',
  borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
  transition: 'all 0.2s'
});
