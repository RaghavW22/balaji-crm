import React, { useState } from 'react';
import { X, Key, Save, RotateCcw, ShieldCheck, HelpCircle, ExternalLink } from 'lucide-react';
import { activeFirebaseConfig, isCustomConfigActive, saveFirebaseConfig, clearFirebaseConfig } from '../firebaseConfig';

const FirebaseSettingsModal = ({ isOpen, onClose, brandName, setBrandName }) => {
  if (!isOpen) return null;

  const [tempBrandName, setTempBrandName] = useState(brandName);
  const [config, setConfig] = useState({
    apiKey: activeFirebaseConfig.apiKey || '',
    authDomain: activeFirebaseConfig.authDomain || '',
    projectId: activeFirebaseConfig.projectId || '',
    storageBucket: activeFirebaseConfig.storageBucket || '',
    messagingSenderId: activeFirebaseConfig.messagingSenderId || '',
    appId: activeFirebaseConfig.appId || ''
  });

  const handleChange = (field, val) => {
    setConfig(prev => ({ ...prev, [field]: val }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (tempBrandName.trim()) {
      setBrandName(tempBrandName.trim());
      localStorage.setItem('crm_brand_name', tempBrandName.trim());
    }
    saveFirebaseConfig(config);
  };

  const handleReset = () => {
    if (window.confirm("Reset Firebase configuration to default demo mode?")) {
      clearFirebaseConfig();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Key className="text-indigo-400" size={22} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="modal-title">System Naming & Firebase Settings</h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          {/* Software Branding Section */}
          <div style={{ marginBottom: '1.5rem', background: 'var(--glass-bg)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
            <label className="form-label" htmlFor="custom-brand">
              <span>Software System Name</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>Customizable Naming</span>
            </label>
            <input
              id="custom-brand"
              type="text"
              className="form-input"
              style={{ paddingLeft: '1rem' }}
              value={tempBrandName}
              onChange={(e) => setTempBrandName(e.target.value)}
              placeholder="e.g. NexusAI CRM / Enterprise AI Hub"
              required
            />
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
              Decide your platform's public branding name. You can update this anytime.
            </p>
          </div>

          {/* Firebase Credentials Form */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Firebase API Key Credentials
              </h4>
              <span className={`score-badge ${isCustomConfigActive ? 'score-high' : 'score-mid'}`}>
                {isCustomConfigActive ? 'Custom Project Active' : 'Demo Project Active'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>apiKey</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '0.8rem', fontSize: '0.85rem' }}
                  value={config.apiKey}
                  onChange={(e) => handleChange('apiKey', e.target.value)}
                  placeholder="AIzaSy..."
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>authDomain</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '0.8rem', fontSize: '0.85rem' }}
                  value={config.authDomain}
                  onChange={(e) => handleChange('authDomain', e.target.value)}
                  placeholder="your-app.firebaseapp.com"
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>projectId</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '0.8rem', fontSize: '0.85rem' }}
                  value={config.projectId}
                  onChange={(e) => handleChange('projectId', e.target.value)}
                  placeholder="your-project-id"
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>appId</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '0.8rem', fontSize: '0.85rem' }}
                  value={config.appId}
                  onChange={(e) => handleChange('appId', e.target.value)}
                  placeholder="1:12345:web:abcde"
                />
              </div>
            </div>
          </div>

          {/* Admin User Provisioning Guide */}
          <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.2)', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
            <div style={{ fontWeight: '700', color: 'var(--accent-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={16} />
              <span>How to Create Authorized Initial Login Users:</span>
            </div>
            <ol style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              <li>Open your <strong>Firebase Console</strong> → Select your Project.</li>
              <li>Navigate to <strong>Authentication</strong> → <strong>Users</strong> tab.</li>
              <li>Click <strong>Add User</strong> to manually create your initial Email & Password credentials.</li>
              <li>User can log in directly from this screen or use <strong>Forgot Password</strong> to set a new password.</li>
            </ol>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>
              <Save size={16} />
              <span>Save & Apply Settings</span>
            </button>

            {isCustomConfigActive && (
              <button type="button" onClick={handleReset} className="btn-secondary" style={{ width: 'auto' }}>
                <RotateCcw size={16} />
                <span>Reset Demo</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default FirebaseSettingsModal;
