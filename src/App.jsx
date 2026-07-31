import React, { useState, useEffect } from 'react';
import ParticleBackground from './components/ParticleBackground';
import BrandHeader from './components/BrandHeader';
import LoginForm from './components/LoginForm';
import CrmDashboard from './components/CrmDashboard';
import { subscribeAuthState } from './firebaseConfig';

function App() {
  // Theme state ('dark' | 'light')
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('crm_theme') || 'dark';
  });

  // Authenticated User State
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Synchronize Theme Attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('crm_theme', theme);
  }, [theme]);

  // Subscribe to Firebase Auth State (auto-logs in if Remember Me was selected)
  useEffect(() => {
    const unsubscribe = subscribeAuthState((currentUser) => {
      setUser(currentUser);
      setIsInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  if (isInitializing) {
    return (
      <div className="app-viewport" data-theme={theme} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ParticleBackground />
        <div style={{ zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--text-primary)', fontWeight: '600' }}>
          <div className="spinner" style={{ width: '24px', height: '24px', borderWidth: '3px' }}></div>
          <span>Loading Balaji CRM...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-viewport" data-theme={theme}>
      {/* Background Animated Neural Particles */}
      <ParticleBackground />

      {/* Grid Overlay Effect */}
      <div className="grid-overlay" />

      {/* Ambient Gradient Background Glows */}
      <div className="ambient-glow" />

      {/* View Switcher based on Authentication */}
      {user ? (
        <CrmDashboard
          user={user}
          theme={theme}
          toggleTheme={toggleTheme}
          onLogout={() => setUser(null)}
        />
      ) : (
        <div className="layout-content">
          <BrandHeader
            theme={theme}
            toggleTheme={toggleTheme}
          />
          <LoginForm
            onLoginSuccess={(loggedInUser) => setUser(loggedInUser)}
          />
        </div>
      )}
    </div>
  );
}

export default App;
