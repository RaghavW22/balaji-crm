import React from 'react';
import { Cpu, Sun, Moon, Sparkles } from 'lucide-react';

const BrandHeader = ({ theme, toggleTheme }) => {
  return (
    <header className="header-bar">
      <div className="brand-logo-group">
        <div className="logo-badge">
          <Cpu className="w-6 h-6" />
        </div>
        <div className="brand-title">
          <span>Balaji CRM</span>
          <span className="ai-pill-tag">
            <Sparkles size={11} style={{ display: 'inline', marginRight: '3px' }} />
            AI Platform
          </span>
        </div>
      </div>

      <div className="header-actions">
        {/* Theme Toggle Button */}
        <button 
          onClick={toggleTheme} 
          className="action-btn-icon"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
        </button>
      </div>
    </header>
  );
};

export default BrandHeader;
