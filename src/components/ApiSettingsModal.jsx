import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Database,
  Trash2,
  Info,
  Sparkles,
  MessageSquare,
  FileText,
  Terminal,
  Settings,
  Mail,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { saveApiSettingsToFirestore, fetchApiSettingsFromFirestore, clearAllLeadsFromFirestore } from '../firebaseConfig';

export const DEFAULT_BACKEND_API_URL = 'https://balaji-email-engine.onrender.com';

const ApiSettingsModal = ({ isOpen, onClose, user, onDataCleared }) => {
  if (!isOpen) return null;

  // WhatsApp Business Cloud API Integration State
  const [whatsappToken, setWhatsappToken] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [whatsappWabaId, setWhatsappWabaId] = useState('');
  const [whatsappTemplateName, setWhatsappTemplateName] = useState('buyer_inquiry_reply');
  const [whatsappTemplateLanguage, setWhatsappTemplateLanguage] = useState('en_US');
  const [whatsappSenderNumber, setWhatsappSenderNumber] = useState('');

  // Email Auto-Reply State
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [autoReplySenderName, setAutoReplySenderName] = useState('Balaji Enterprises');

  // Backend API URL State (Render Cloud)
  const [backendApiUrl, setBackendApiUrl] = useState(() => {
    const saved = localStorage.getItem('backend_api_url');
    if (!saved || saved.includes('localhost') || saved.includes('127.0.0.1')) {
      localStorage.setItem('backend_api_url', DEFAULT_BACKEND_API_URL);
      return DEFAULT_BACKEND_API_URL;
    }
    return saved;
  });
  const [testStatus, setTestStatus] = useState(null);

  // UI Feedback State
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [dbSynced, setDbSynced] = useState(false);
  const [isClearingLeads, setIsClearingLeads] = useState(false);

  // Test live backend connection
  const handleTestConnection = async () => {
    setTestStatus({ loading: true });
    try {
      let cleanUrl = (backendApiUrl || '').trim().replace(/\/+$/, '');
      if (!cleanUrl) {
        setTestStatus({ success: false, message: 'Please enter a valid URL (e.g. https://your-service.onrender.com)' });
        return;
      }
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = `https://${cleanUrl}`;
      }
      setBackendApiUrl(cleanUrl);
      localStorage.setItem('backend_api_url', cleanUrl);
      if (user && user.uid) {
        saveApiSettingsToFirestore(user.uid, { backendApiUrl: cleanUrl }).catch(() => {});
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(`${cleanUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setTestStatus({ success: true, message: `Connected! Service is online (${data.service || 'Ready'}).` });
      } else {
        setTestStatus({ success: false, message: `Server responded with HTTP ${res.status}.` });
      }
    } catch (err) {
      const msg = err.name === 'AbortError' 
        ? 'Connection timed out (12s). If Render was idle, it may take 30-50s to wake up. Please wait a moment and try again.'
        : `Could not reach server (${err.message}). If using Render free tier, it may take 30-50s to spin up.`;
      setTestStatus({ success: false, message: msg });
    }
  };

  const handleUrlChange = (val) => {
    setBackendApiUrl(val);
    setTestStatus(null);
    let clean = val.trim().replace(/\/+$/, '');
    if (clean) {
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = `https://${clean}`;
      }
      localStorage.setItem('backend_api_url', clean);
      if (user && user.uid) {
        saveApiSettingsToFirestore(user.uid, { backendApiUrl: clean }).catch(() => {});
      }
    }
  };

  const handleModalClose = () => {
    let cleanUrl = (backendApiUrl || '').trim().replace(/\/+$/, '');
    if (!cleanUrl || cleanUrl.includes('localhost') || cleanUrl.includes('127.0.0.1')) {
      cleanUrl = DEFAULT_BACKEND_API_URL;
    } else if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    localStorage.setItem('backend_api_url', cleanUrl);
    if (user && user.uid) {
      saveApiSettingsToFirestore(user.uid, { backendApiUrl: cleanUrl }).catch(() => {});
    }
    onClose();
  };

  // Load saved credentials from Firestore Database (or localStorage fallback)
  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      // WhatsApp local fallbacks
      setWhatsappToken(localStorage.getItem('whatsapp_access_token') || '');
      setWhatsappPhoneId(localStorage.getItem('whatsapp_phone_id') || '');
      setWhatsappWabaId(localStorage.getItem('whatsapp_waba_id') || '');
      setWhatsappTemplateName(localStorage.getItem('whatsapp_template_name') || 'buyer_inquiry_reply');
      setWhatsappTemplateLanguage(localStorage.getItem('whatsapp_template_language') || 'en_US');
      setWhatsappSenderNumber(localStorage.getItem('whatsapp_sender_number') || '');

      // Email auto-reply local fallbacks
      const storedAutoReply = localStorage.getItem('auto_reply_email_enabled');
      setAutoReplyEnabled(storedAutoReply === null ? true : storedAutoReply === 'true');
      setAutoReplySenderName(localStorage.getItem('auto_reply_sender_name') || 'Balaji Enterprises');
      
      const savedUrl = localStorage.getItem('backend_api_url');
      if (!savedUrl || savedUrl.includes('localhost') || savedUrl.includes('127.0.0.1')) {
        setBackendApiUrl(DEFAULT_BACKEND_API_URL);
        localStorage.setItem('backend_api_url', DEFAULT_BACKEND_API_URL);
      } else {
        setBackendApiUrl(savedUrl);
      }

      if (user && user.uid) {
        const res = await fetchApiSettingsFromFirestore(user.uid);
        if (res.success && res.data && isMounted) {
          if (res.data.whatsappToken !== undefined) setWhatsappToken(res.data.whatsappToken);
          if (res.data.whatsappPhoneId !== undefined) setWhatsappPhoneId(res.data.whatsappPhoneId);
          if (res.data.whatsappWabaId !== undefined) setWhatsappWabaId(res.data.whatsappWabaId);
          if (res.data.whatsappTemplateName !== undefined) setWhatsappTemplateName(res.data.whatsappTemplateName);
          if (res.data.whatsappTemplateLanguage !== undefined) setWhatsappTemplateLanguage(res.data.whatsappTemplateLanguage);
          if (res.data.whatsappSenderNumber !== undefined) setWhatsappSenderNumber(res.data.whatsappSenderNumber);
          if (res.data.autoReplyEnabled !== undefined) setAutoReplyEnabled(res.data.autoReplyEnabled);
          if (res.data.autoReplySenderName !== undefined) setAutoReplySenderName(res.data.autoReplySenderName);
          
          if (res.data.backendApiUrl && !res.data.backendApiUrl.includes('localhost') && !res.data.backendApiUrl.includes('127.0.0.1')) {
            setBackendApiUrl(res.data.backendApiUrl);
            localStorage.setItem('backend_api_url', res.data.backendApiUrl);
          } else {
            setBackendApiUrl(DEFAULT_BACKEND_API_URL);
            localStorage.setItem('backend_api_url', DEFAULT_BACKEND_API_URL);
            if (res.data.backendApiUrl) {
              saveApiSettingsToFirestore(user.uid, { backendApiUrl: DEFAULT_BACKEND_API_URL }).catch(() => {});
            }
          }

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

    const cleanBackendUrl = backendApiUrl.trim().replace(/\/+$/, '');

    const settingsData = {
      // WhatsApp Business Integration Payload
      whatsappToken: whatsappToken.trim(),
      whatsappPhoneId: whatsappPhoneId.trim(),
      whatsappWabaId: whatsappWabaId.trim(),
      whatsappTemplateName: whatsappTemplateName.trim(),
      whatsappTemplateLanguage: whatsappTemplateLanguage.trim(),
      whatsappSenderNumber: whatsappSenderNumber.trim(),
      // Email Auto-Reply Payload
      autoReplyEnabled,
      autoReplySenderName: autoReplySenderName.trim(),
      // Backend URL
      backendApiUrl: cleanBackendUrl
    };

    // Save to LocalStorage
    localStorage.setItem('whatsapp_access_token', settingsData.whatsappToken);
    localStorage.setItem('whatsapp_phone_id', settingsData.whatsappPhoneId);
    localStorage.setItem('whatsapp_waba_id', settingsData.whatsappWabaId);
    localStorage.setItem('whatsapp_template_name', settingsData.whatsappTemplateName);
    localStorage.setItem('whatsapp_template_language', settingsData.whatsappTemplateLanguage);
    localStorage.setItem('whatsapp_sender_number', settingsData.whatsappSenderNumber);
    localStorage.setItem('backend_api_url', cleanBackendUrl);
    localStorage.setItem('auto_reply_email_enabled', String(autoReplyEnabled));
    localStorage.setItem('auto_reply_sender_name', autoReplySenderName.trim());

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

  // Clear Stored API Keys
  const handleClearApiKeys = async () => {
    if (window.confirm("Clear all stored WhatsApp integration credentials from settings?")) {
      localStorage.removeItem('whatsapp_access_token');
      localStorage.removeItem('whatsapp_phone_id');
      localStorage.removeItem('whatsapp_waba_id');
      localStorage.removeItem('whatsapp_template_name');
      localStorage.removeItem('whatsapp_sender_number');

      setWhatsappToken('');
      setWhatsappPhoneId('');
      setWhatsappWabaId('');
      setWhatsappSenderNumber('');

      if (user && user.uid) {
        await saveApiSettingsToFirestore(user.uid, {
          whatsappToken: '',
          whatsappPhoneId: '',
          whatsappWabaId: '',
          whatsappSenderNumber: ''
        });
      }
      alert("Stored WhatsApp credentials cleared successfully!");
    }
  };

  // Clear Product Requests Database
  const handleClearDatabaseRecords = async () => {
    if (window.confirm("Clear all Product Request records from the Database?")) {
      setIsClearingLeads(true);

      if (user && user.uid) {
        await clearAllLeadsFromFirestore(user.uid);
      }

      // Also clear from backend server cache and reset local deletion tracker
      try {
        const url = (backendApiUrl || localStorage.getItem('backend_api_url') || DEFAULT_BACKEND_API_URL).replace(/\/+$/, '');
        await fetch(`${url}/api/clear-leads`, { method: 'POST' });
      } catch (_) {}
      try {
        localStorage.removeItem('crm_deleted_lead_ids');
      } catch (_) {}

      setIsClearingLeads(false);

      if (onDataCleared) {
        onDataCleared();
      }

      alert("All product request records cleared from Database.");
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleModalClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Settings className="text-emerald-400" size={24} style={{ color: 'var(--accent-emerald)' }} />
            <div>
              <h3 className="modal-title" style={{ fontSize: '1.2rem' }}>Integration &amp; API Settings</h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px' }}>
                <Database size={12} />
                <span>{dbSynced ? "Synced with Firebase Database" : "Saved to Secure Database"}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Informative Email Direct Setup Banner */}
        <div style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.25)', padding: '0.85rem 1.15rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)', flexShrink: 0 }}>
            <Terminal size={17} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              Email Ingestion &amp; Live Server Engine
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Your Gmail reader runs continuously on Render or locally. Configure its URL below so the dashboard communicates with it.
            </div>
          </div>
        </div>

        {/* Live Backend API Server URL Card */}
        <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Terminal size={16} style={{ color: 'var(--accent-cyan)' }} />
            <span>Backend Server URL (Render Cloud):</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: '1.4' }}>
            Connected to your 24/7 cloud email engine at <code>https://balaji-email-engine.onrender.com</code>.
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-input"
              style={{ flex: 1, minWidth: '240px', padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}
              placeholder="https://balaji-email-engine.onrender.com"
              value={backendApiUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              onBlur={() => {
                let clean = (backendApiUrl || '').trim().replace(/\/+$/, '');
                if (clean) {
                  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
                    clean = `https://${clean}`;
                    setBackendApiUrl(clean);
                  }
                  localStorage.setItem('backend_api_url', clean);
                }
              }}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={handleTestConnection}
              disabled={testStatus?.loading}
              style={{ width: 'auto', padding: '0.5rem 0.9rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            >
              {testStatus?.loading ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
          {testStatus && (
            <div style={{ marginTop: '0.55rem', fontSize: '0.78rem', color: testStatus.success ? 'var(--accent-emerald)' : 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {testStatus.success ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              <span>{testStatus.message}</span>
            </div>
          )}
        </div>

        {savedSuccess && (
          <div className="alert-box success" style={{ marginBottom: '1.25rem' }}>
            <CheckCircle2 size={18} />
            <div>Settings saved successfully!</div>
          </div>
        )}

        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            
            {/* Step-by-Step Setup Guide Card for WhatsApp */}
            <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Info size={16} style={{ color: 'var(--accent-emerald)' }} />
                <span>WhatsApp Business Cloud API Setup:</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '800', flexShrink: 0 }}>1</span>
                  <span>Go to <strong style={{ color: 'var(--text-primary)' }}>developers.facebook.com</strong> &gt; WhatsApp &gt; API Setup</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '800', flexShrink: 0 }}>2</span>
                  <span>Copy your <strong style={{ color: 'var(--accent-emerald)' }}>Permanent Access Token</strong> and <strong style={{ color: 'var(--accent-emerald)' }}>Phone Number ID</strong></span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '800', flexShrink: 0 }}>3</span>
                  <span>Enter your approved Meta <strong style={{ color: 'var(--text-primary)' }}>Message Template Name</strong> (e.g. <code>buyer_inquiry_reply</code>)</span>
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
                  placeholder="e.g. 104829104829104"
                  value={whatsappPhoneId}
                  onChange={(e) => setWhatsappPhoneId(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="whatsapp-waba-id">
                  3. WhatsApp Business Account ID (WABA)
                </label>
                <input
                  id="whatsapp-waba-id"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '1rem' }}
                  placeholder="e.g. 204910294810294"
                  value={whatsappWabaId}
                  onChange={(e) => setWhatsappWabaId(e.target.value)}
                />
              </div>
            </div>

            {/* Field 4 & 5: Template Name & Language Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="whatsapp-template-name">
                  4. Approved Meta Template Name *
                </label>
                <div className="input-container">
                  <FileText size={16} className="input-icon" />
                  <input
                    id="whatsapp-template-name"
                    type="text"
                    required
                    className="form-input"
                    placeholder="buyer_inquiry_reply"
                    value={whatsappTemplateName}
                    onChange={(e) => setWhatsappTemplateName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="whatsapp-template-lang">
                  5. Template Language
                </label>
                <input
                  id="whatsapp-template-lang"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '1rem' }}
                  placeholder="en_US"
                  value={whatsappTemplateLanguage}
                  onChange={(e) => setWhatsappTemplateLanguage(e.target.value)}
                />
              </div>
            </div>

            {/* Field 6: Sender Phone Number */}
            <div className="form-group">
              <label className="form-label" htmlFor="whatsapp-sender-num">
                6. Registered WhatsApp Phone Number (Display Only)
              </label>
              <div className="input-container">
                <Smartphone size={16} className="input-icon" />
                <input
                  id="whatsapp-sender-num"
                  type="text"
                  className="form-input"
                  placeholder="e.g. +91 98765 43210"
                  value={whatsappSenderNumber}
                  onChange={(e) => setWhatsappSenderNumber(e.target.value)}
                />
              </div>
            </div>

            {/* ── EMAIL AUTO-REPLY SECTION ── */}
            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.1rem', marginTop: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={17} style={{ color: 'var(--accent-cyan)' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>Email Auto-Reply to Enquiry</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoReplyEnabled(v => !v)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    color: autoReplyEnabled ? 'var(--accent-emerald)' : 'var(--text-muted)',
                    fontWeight: '700', fontSize: '0.82rem', transition: 'color 0.2s'
                  }}
                  title="Toggle auto email reply on new lead"
                >
                  {autoReplyEnabled
                    ? <><ToggleRight size={26} /> <span>Enabled</span></>
                    : <><ToggleLeft size={26} /> <span>Disabled</span></>}
                </button>
              </div>

              <div style={{
                background: autoReplyEnabled ? 'rgba(16,185,129,0.06)' : 'rgba(148,163,184,0.05)',
                border: `1px solid ${autoReplyEnabled ? 'rgba(16,185,129,0.2)' : 'var(--glass-border)'}`,
                borderRadius: 'var(--radius-md)', padding: '0.9rem 1.1rem',
                fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.6',
                marginBottom: '0.9rem', transition: 'all 0.2s'
              }}>
                {autoReplyEnabled
                  ? <><strong style={{ color: 'var(--accent-emerald)' }}>✅ Active:</strong> When a new enquiry email arrives, the CRM will automatically reply to the sender&apos;s email with their enquiry details and full product catalog list.
                  <br /><span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>The reply uses your configured <code>SELLER_EMAIL</code> Gmail + App Password from <code>.env</code>.</span></>
                  : <><strong style={{ color: 'var(--text-muted)' }}>⏸ Paused:</strong> Auto email replies are disabled. New enquiry emails will be ingested into CRM without sending a reply.</>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="auto-reply-sender-name" style={{ fontSize: '0.82rem' }}>
                  Reply From Name (shown in recipient's inbox)
                </label>
                <div className="input-container">
                  <Mail size={15} className="input-icon" />
                  <input
                    id="auto-reply-sender-name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Balaji Enterprises"
                    value={autoReplySenderName}
                    onChange={(e) => setAutoReplySenderName(e.target.value)}
                    disabled={!autoReplyEnabled}
                    style={{ opacity: autoReplyEnabled ? 1 : 0.45 }}
                  />
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  This name appears as the sender in the reply email (e.g. &quot;Balaji Enterprises &lt;your@gmail.com&gt;&quot;).
                </p>
              </div>
            </div>

          </div>

          {/* Modal Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--glass-border)', flexWrap: 'wrap', gap: '0.75rem' }}>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', color: 'var(--accent-amber)', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                onClick={handleClearApiKeys}
                title="Clear WhatsApp API Keys"
              >
                Clear Keys
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                onClick={handleClearDatabaseRecords}
                disabled={isClearingLeads}
                title="Clear Ingested Leads from Database"
              >
                {isClearingLeads ? "Clearing..." : "Clear Leads DB"}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={isSaving}
                style={{ width: 'auto', padding: '0.65rem 1.5rem', background: 'linear-gradient(135deg, var(--accent-emerald), #059669)' }}
              >
                {isSaving ? (
                  <>
                    <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </form>

      </div>
    </div>
  );
};

export default ApiSettingsModal;
