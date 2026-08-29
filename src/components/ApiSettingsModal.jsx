import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Key, 
  MessageSquare, 
  Mail, 
  Save, 
  CheckCircle2, 
  Trash2, 
  Database, 
  Info,
  Globe,
  FileText,
  ShieldCheck,
  Smartphone,
  Zap,
  Check,
  ArrowRight,
  Lock,
  Server,
  Clock
} from 'lucide-react';
import { saveApiSettingsToFirestore, fetchApiSettingsFromFirestore, clearAllLeadsFromFirestore } from '../firebaseConfig';

const ApiSettingsModal = ({ isOpen, onClose, user, onDataCleared }) => {
  if (!isOpen) return null;

  // Email Ingestion Integration State (Auto-fetch every 1-2 mins)
  const [emailAddress, setEmailAddress] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [imapHost, setImapHost] = useState('imap.gmail.com');
  const [imapPort, setImapPort] = useState('993');
  const [fetchIntervalMinutes, setFetchIntervalMinutes] = useState('1');

  // WhatsApp Business Cloud API Integration State
  const [whatsappToken, setWhatsappToken] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [whatsappWabaId, setWhatsappWabaId] = useState('');
  const [whatsappTemplateName, setWhatsappTemplateName] = useState('buyer_inquiry_reply');
  const [whatsappTemplateLanguage, setWhatsappTemplateLanguage] = useState('en_US');
  const [whatsappSenderNumber, setWhatsappSenderNumber] = useState('');

  // UI Feedback State
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [dbSynced, setDbSynced] = useState(false);
  const [isClearingLeads, setIsClearingLeads] = useState(false);

  // Active Settings Tab ('email' | 'whatsapp')
  const [activeTab, setActiveTab] = useState('email');

  // Load saved credentials from Firestore Database (or localStorage fallback)
  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      // Email Ingestion local fallbacks
      setEmailAddress(localStorage.getItem('email_address') || '');
      setEmailPassword(localStorage.getItem('email_password') || '');
      setImapHost(localStorage.getItem('imap_host') || 'imap.gmail.com');
      setImapPort(localStorage.getItem('imap_port') || '993');
      setFetchIntervalMinutes(localStorage.getItem('fetch_interval_minutes') || '1');

      // WhatsApp local fallbacks
      setWhatsappToken(localStorage.getItem('whatsapp_access_token') || '');
      setWhatsappPhoneId(localStorage.getItem('whatsapp_phone_id') || '');
      setWhatsappWabaId(localStorage.getItem('whatsapp_waba_id') || '');
      setWhatsappTemplateName(localStorage.getItem('whatsapp_template_name') || 'buyer_inquiry_reply');
      setWhatsappTemplateLanguage(localStorage.getItem('whatsapp_template_language') || 'en_US');
      setWhatsappSenderNumber(localStorage.getItem('whatsapp_sender_number') || '');

      if (user && user.uid) {
        const res = await fetchApiSettingsFromFirestore(user.uid);
        if (res.success && res.data && isMounted) {
          if (res.data.emailAddress !== undefined) setEmailAddress(res.data.emailAddress);
          if (res.data.emailPassword !== undefined) setEmailPassword(res.data.emailPassword);
          if (res.data.imapHost !== undefined) setImapHost(res.data.imapHost);
          if (res.data.imapPort !== undefined) setImapPort(res.data.imapPort);
          if (res.data.fetchIntervalMinutes !== undefined) setFetchIntervalMinutes(res.data.fetchIntervalMinutes);

          if (res.data.whatsappToken !== undefined) setWhatsappToken(res.data.whatsappToken);
          if (res.data.whatsappPhoneId !== undefined) setWhatsappPhoneId(res.data.whatsappPhoneId);
          if (res.data.whatsappWabaId !== undefined) setWhatsappWabaId(res.data.whatsappWabaId);
          if (res.data.whatsappTemplateName !== undefined) setWhatsappTemplateName(res.data.whatsappTemplateName);
          if (res.data.whatsappTemplateLanguage !== undefined) setWhatsappTemplateLanguage(res.data.whatsappTemplateLanguage);
          if (res.data.whatsappSenderNumber !== undefined) setWhatsappSenderNumber(res.data.whatsappSenderNumber);

          setDbSynced(true);
        }
      }
    };

    loadSettings();
    return () => { isMounted = false; };
  }, [isOpen, user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const settingsData = {
      // Email Integration Payload (Auto Fetch every 1-2 mins)
      emailAddress: emailAddress.trim(),
      emailPassword: emailPassword.trim(),
      imapHost: imapHost.trim(),
      imapPort: imapPort.trim(),
      fetchIntervalMinutes: fetchIntervalMinutes.trim(),

      // WhatsApp Business Integration Payload
      whatsappToken: whatsappToken.trim(),
      whatsappPhoneId: whatsappPhoneId.trim(),
      whatsappWabaId: whatsappWabaId.trim(),
      whatsappTemplateName: whatsappTemplateName.trim(),
      whatsappTemplateLanguage: whatsappTemplateLanguage.trim(),
      whatsappSenderNumber: whatsappSenderNumber.trim()
    };

    // Save to LocalStorage
    localStorage.setItem('email_address', settingsData.emailAddress);
    localStorage.setItem('email_password', settingsData.emailPassword);
    localStorage.setItem('imap_host', settingsData.imapHost);
    localStorage.setItem('imap_port', settingsData.imapPort);
    localStorage.setItem('fetch_interval_minutes', settingsData.fetchIntervalMinutes);

    localStorage.setItem('whatsapp_access_token', settingsData.whatsappToken);
    localStorage.setItem('whatsapp_phone_id', settingsData.whatsappPhoneId);
    localStorage.setItem('whatsapp_waba_id', settingsData.whatsappWabaId);
    localStorage.setItem('whatsapp_template_name', settingsData.whatsappTemplateName);
    localStorage.setItem('whatsapp_template_language', settingsData.whatsappTemplateLanguage);
    localStorage.setItem('whatsapp_sender_number', settingsData.whatsappSenderNumber);

    // Sync with Firestore Database
    if (user && user.uid) {
      await saveApiSettingsToFirestore(user.uid, settingsData);
      setDbSynced(true);
    }

    setIsSaving(false);
    setSavedSuccess(true);

    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  // Button 1: Clear Stored API Keys
  const handleClearApiKeys = async () => {
    if (window.confirm("Clear all stored integration credentials (Email & WhatsApp) from settings?")) {
      localStorage.removeItem('email_address');
      localStorage.removeItem('email_password');
      localStorage.removeItem('imap_host');
      localStorage.removeItem('imap_port');
      localStorage.removeItem('fetch_interval_minutes');
      localStorage.removeItem('whatsapp_access_token');
      localStorage.removeItem('whatsapp_phone_id');
      localStorage.removeItem('whatsapp_waba_id');
      localStorage.removeItem('whatsapp_template_name');
      localStorage.removeItem('whatsapp_sender_number');

      setEmailAddress('');
      setEmailPassword('');
      setImapHost('imap.gmail.com');
      setImapPort('993');
      setFetchIntervalMinutes('1');
      setWhatsappToken('');
      setWhatsappPhoneId('');
      setWhatsappWabaId('');
      setWhatsappSenderNumber('');

      if (user && user.uid) {
        await saveApiSettingsToFirestore(user.uid, {
          emailAddress: '',
          emailPassword: '',
          imapHost: 'imap.gmail.com',
          imapPort: '993',
          fetchIntervalMinutes: '1',
          whatsappToken: '',
          whatsappPhoneId: '',
          whatsappWabaId: '',
          whatsappSenderNumber: ''
        });
      }
      alert("Stored Integration Credentials cleared successfully!");
    }
  };

  // Button 2: Clear Product Requests Database
  const handleClearDatabaseRecords = async () => {
    if (window.confirm("Clear all Product Request records from the Database?")) {
      setIsClearingLeads(true);

      if (user && user.uid) {
        await clearAllLeadsFromFirestore(user.uid);
      }

      setIsClearingLeads(false);

      if (onDataCleared) {
        onDataCleared();
      }

      alert("All product request records cleared from Database.");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Settings className="text-indigo-400" size={24} style={{ color: 'var(--accent-primary)' }} />
            <div>
              <h3 className="modal-title" style={{ fontSize: '1.2rem' }}>Integration & API Settings</h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px' }}>
                <Database size={12} />
                <span>{dbSynced ? "Synced with Firebase Database" : "Saved to Secure Database"}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Tab Buttons for Settings Categories */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
          <button
            type="button"
            className={`btn-secondary ${activeTab === 'email' ? 'active' : ''}`}
            style={{
              flex: 1,
              padding: '0.65rem 0.85rem',
              fontSize: '0.88rem',
              borderColor: activeTab === 'email' ? 'var(--accent-cyan)' : 'var(--glass-border)',
              background: activeTab === 'email' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              color: activeTab === 'email' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: '700'
            }}
            onClick={() => setActiveTab('email')}
          >
            <Mail size={16} style={{ color: 'var(--accent-cyan)' }} />
            <span>Email Ingestion (1 Min)</span>
          </button>

          <button
            type="button"
            className={`btn-secondary ${activeTab === 'whatsapp' ? 'active' : ''}`}
            style={{
              flex: 1,
              padding: '0.65rem 0.85rem',
              fontSize: '0.88rem',
              borderColor: activeTab === 'whatsapp' ? 'var(--accent-emerald)' : 'var(--glass-border)',
              background: activeTab === 'whatsapp' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: activeTab === 'whatsapp' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: '700'
            }}
            onClick={() => setActiveTab('whatsapp')}
          >
            <MessageSquare size={16} style={{ color: 'var(--accent-emerald)' }} />
            <span>WhatsApp Business API</span>
          </button>
        </div>

        {savedSuccess && (
          <div className="alert-box success" style={{ marginBottom: '1.25rem' }}>
            <CheckCircle2 size={18} />
            <div>Integration credentials saved to Firebase Database successfully!</div>
          </div>
        )}

        <form onSubmit={handleSave}>
          
          {/* TAB 1: EMAIL INGESTION & PASSWORD CONFIGURATION */}
          {activeTab === 'email' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              
              {/* Sync Frequency Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(6, 182, 212, 0.1)', padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                  <Clock size={16} />
                  <span>Auto-Fetching Email Leads: Every 1 Minute</span>
                </div>
                <span className="score-badge score-high" style={{ fontSize: '0.7rem' }}>Polling Active (1 Min)</span>
              </div>

              {/* Step-by-Step Setup Guide Card for Email */}
              <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Info size={16} style={{ color: 'var(--accent-cyan)' }} />
                  <span>Simple Setup Guide for Email Lead Fetching:</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '800', flexShrink: 0 }}>1</span>
                    <span>Enter your seller <strong style={{ color: 'var(--text-primary)' }}>Email Address</strong> (e.g. seller@gmail.com)</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '800', flexShrink: 0 }}>2</span>
                    <span>For Gmail, enable 2-Step Verification &amp; generate an <strong style={{ color: 'var(--accent-cyan)' }}>App Password</strong> at myaccount.google.com/apppasswords</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '800', flexShrink: 0 }}>3</span>
                    <span>Enter your <strong style={{ color: 'var(--text-primary)' }}>Email Password / App Password</strong> in Field 2 below</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '800', flexShrink: 0 }}>4</span>
                    <span>Click <strong>Save Integration Settings</strong>. The system will automatically check for incoming lead emails every 1 minute.</span>
                  </div>
                </div>
              </div>

              {/* Field 1: Seller Email Address */}
              <div className="form-group">
                <label className="form-label" htmlFor="email-address">
                  1. Seller Email Address *
                </label>
                <div className="input-container">
                  <Mail size={16} className="input-icon" />
                  <input
                    id="email-address"
                    type="email"
                    required
                    className="form-input"
                    placeholder="e.g. seller.business@gmail.com"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                  />
                </div>
              </div>

              {/* Field 2: Email Password / App Password */}
              <div className="form-group">
                <label className="form-label" htmlFor="email-password">
                  2. Email Password / App Password *
                </label>
                <div className="input-container">
                  <Lock size={16} className="input-icon" />
                  <input
                    id="email-password"
                    type="password"
                    required
                    className="form-input"
                    placeholder="Enter email account password or app password..."
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                  />
                </div>
              </div>

              {/* Field 3 & 4: IMAP Server Host & SSL Port Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="imap-host">
                    3. IMAP Server Host (Default: Gmail)
                  </label>
                  <div className="input-container">
                    <Server size={16} className="input-icon" />
                    <input
                      id="imap-host"
                      type="text"
                      className="form-input"
                      placeholder="imap.gmail.com"
                      value={imapHost}
                      onChange={(e) => setImapHost(e.target.value)}
                    />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px' }}>No change needed for Gmail / Google Workspace</div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="imap-port">
                    4. IMAP Port (SSL)
                  </label>
                  <input
                    id="imap-port"
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '1rem' }}
                    placeholder="993"
                    value={imapPort}
                    onChange={(e) => setImapPort(e.target.value)}
                  />
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px' }}>Standard SSL Port 993 (No change needed)</div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: WHATSAPP BUSINESS CLOUD API CONFIGURATION */}
          {activeTab === 'whatsapp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              
              {/* Simple Step-by-Step Setup Guide Card */}
              <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Info size={16} style={{ color: 'var(--accent-emerald)' }} />
                  <span>Simple Step-by-Step Setup Guide for WhatsApp:</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '800', flexShrink: 0 }}>1</span>
                    <span>Go to <strong style={{ color: 'var(--text-primary)' }}>developers.facebook.com</strong> and open your WhatsApp Business App</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '800', flexShrink: 0 }}>2</span>
                    <span>Under <strong style={{ color: 'var(--text-primary)' }}>WhatsApp &gt; API Setup</strong>, copy your <strong style={{ color: 'var(--accent-emerald)' }}>Permanent Access Token</strong> &amp; <strong style={{ color: 'var(--accent-emerald)' }}>Phone Number ID</strong></span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '800', flexShrink: 0 }}>3</span>
                    <span>Enter your approved Meta <strong style={{ color: 'var(--text-primary)' }}>Message Template Name</strong> (e.g. <code>buyer_inquiry_reply</code>)</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '800', flexShrink: 0 }}>4</span>
                    <span>Click <strong>Save Integration Settings</strong></span>
                  </div>
                </div>
              </div>

              {/* Field 1: Permanent Access Token */}
              <div className="form-group">
                <label className="form-label" htmlFor="whatsapp-token">
                  1. Meta Permanent Access Token / Bearer Token *
                </label>
                <div className="input-container">
                  <Key size={16} className="input-icon" />
                  <input
                    id="whatsapp-token"
                    type="password"
                    required
                    className="form-input"
                    placeholder="EAAG... (Meta Cloud API Access Token)"
                    value={whatsappToken}
                    onChange={(e) => setWhatsappToken(e.target.value)}
                  />
                </div>
              </div>

              {/* Field 2 & 3: Phone Number ID & WABA ID Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="whatsapp-phone-id">
                    2. Phone Number ID *
                  </label>
                  <input
                    id="whatsapp-phone-id"
                    type="text"
                    required
                    className="form-input"
                    style={{ paddingLeft: '1rem' }}
                    placeholder="e.g. 1092837465019"
                    value={whatsappPhoneId}
                    onChange={(e) => setWhatsappPhoneId(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="whatsapp-waba-id">
                    3. WABA Account ID *
                  </label>
                  <input
                    id="whatsapp-waba-id"
                    type="text"
                    required
                    className="form-input"
                    style={{ paddingLeft: '1rem' }}
                    placeholder="e.g. 108927346591234"
                    value={whatsappWabaId}
                    onChange={(e) => setWhatsappWabaId(e.target.value)}
                  />
                </div>
              </div>

              {/* Field 4 & 5: Approved Message Template & Language Code */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="whatsapp-template">
                    4. Approved Template Name *
                  </label>
                  <div className="input-container">
                    <FileText size={16} className="input-icon" />
                    <input
                      id="whatsapp-template"
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. buyer_inquiry_reply"
                      value={whatsappTemplateName}
                      onChange={(e) => setWhatsappTemplateName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="whatsapp-language">
                    5. Language Code
                  </label>
                  <input
                    id="whatsapp-language"
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '1rem' }}
                    placeholder="e.g. en_US / hi"
                    value={whatsappTemplateLanguage}
                    onChange={(e) => setWhatsappTemplateLanguage(e.target.value)}
                  />
                </div>
              </div>

              {/* Field 6: Sender Business Phone Number */}
              <div className="form-group">
                <label className="form-label" htmlFor="whatsapp-sender">
                  6. Sender WhatsApp Phone Number (Optional)
                </label>
                <div className="input-container">
                  <Smartphone size={16} className="input-icon" />
                  <input
                    id="whatsapp-sender"
                    type="text"
                    className="form-input"
                    placeholder="e.g. +91 9876543210"
                    value={whatsappSenderNumber}
                    onChange={(e) => setWhatsappSenderNumber(e.target.value)}
                  />
                </div>
              </div>

            </div>
          )}

          {/* Main Save Button */}
          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1.25rem', marginBottom: '1.25rem' }} disabled={isSaving}>
            {isSaving ? (
              <>
                <div className="spinner"></div>
                <span>Saving Credentials to Database...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Integration Settings</span>
              </>
            )}
          </button>

          {/* Maintenance Actions */}
          <div style={{ borderTop: '1px dashed var(--glass-border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button 
              type="button" 
              onClick={handleClearApiKeys} 
              className="btn-secondary" 
              style={{ width: '100%', fontSize: '0.82rem' }}
            >
              <Key size={15} style={{ color: 'var(--accent-amber)' }} />
              <span>Clear Saved Integration Credentials</span>
            </button>

            <button 
              type="button" 
              onClick={handleClearDatabaseRecords} 
              className="btn-secondary" 
              style={{ width: '100%', borderColor: 'rgba(244, 63, 94, 0.4)', color: 'var(--accent-rose)', fontSize: '0.82rem' }}
              disabled={isClearingLeads}
            >
              <Trash2 size={15} />
              <span>{isClearingLeads ? "Clearing Database Records..." : "Clear Product Requests Database"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApiSettingsModal;

