import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Key, 
  MessageSquare, 
  ShoppingBag, 
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
  ArrowRight
} from 'lucide-react';
import { saveApiSettingsToFirestore, fetchApiSettingsFromFirestore, clearAllLeadsFromFirestore } from '../firebaseConfig';

const ApiSettingsModal = ({ isOpen, onClose, user, onDataCleared }) => {
  if (!isOpen) return null;

  // IndiaMart Push API Integration State
  const [indiamartKey, setIndiamartKey] = useState('');
  const [indiamartMobile, setIndiamartMobile] = useState('');
  const [indiamartWebhookSecret, setIndiamartWebhookSecret] = useState('');
  const [indiamartWebhookUrl, setIndiamartWebhookUrl] = useState('');

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

  // Active Settings Tab ('indiamart' | 'whatsapp')
  const [activeTab, setActiveTab] = useState('indiamart');

  // Load saved credentials from Firestore Database (or localStorage fallback)
  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      // IndiaMart local fallbacks
      setIndiamartKey(localStorage.getItem('indiamart_api_key') || '');
      setIndiamartMobile(localStorage.getItem('indiamart_mobile') || '');
      setIndiamartWebhookSecret(localStorage.getItem('indiamart_webhook_secret') || '');
      setIndiamartWebhookUrl(localStorage.getItem('indiamart_webhook_url') || 'https://balajicrm.web.app/api/indiamart-push');

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
          if (res.data.indiamartKey !== undefined) setIndiamartKey(res.data.indiamartKey);
          if (res.data.indiamartMobile !== undefined) setIndiamartMobile(res.data.indiamartMobile);
          if (res.data.indiamartWebhookSecret !== undefined) setIndiamartWebhookSecret(res.data.indiamartWebhookSecret);
          if (res.data.indiamartWebhookUrl !== undefined) setIndiamartWebhookUrl(res.data.indiamartWebhookUrl);

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
      // IndiaMart Integration Payload (Sync Mode Always Real-Time Push)
      indiamartKey: indiamartKey.trim(),
      indiamartMobile: indiamartMobile.trim(),
      indiamartWebhookSecret: indiamartWebhookSecret.trim(),
      indiamartWebhookUrl: indiamartWebhookUrl.trim(),
      indiamartSyncMode: 'push', // Always Real-time Push

      // WhatsApp Business Integration Payload
      whatsappToken: whatsappToken.trim(),
      whatsappPhoneId: whatsappPhoneId.trim(),
      whatsappWabaId: whatsappWabaId.trim(),
      whatsappTemplateName: whatsappTemplateName.trim(),
      whatsappTemplateLanguage: whatsappTemplateLanguage.trim(),
      whatsappSenderNumber: whatsappSenderNumber.trim()
    };

    // Save to LocalStorage
    localStorage.setItem('indiamart_api_key', settingsData.indiamartKey);
    localStorage.setItem('indiamart_mobile', settingsData.indiamartMobile);
    localStorage.setItem('indiamart_webhook_secret', settingsData.indiamartWebhookSecret);
    localStorage.setItem('indiamart_webhook_url', settingsData.indiamartWebhookUrl);
    localStorage.setItem('indiamart_sync_mode', 'push');

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
    if (window.confirm("Clear all stored integration keys (IndiaMart & WhatsApp) from settings?")) {
      localStorage.removeItem('indiamart_api_key');
      localStorage.removeItem('indiamart_mobile');
      localStorage.removeItem('indiamart_webhook_secret');
      localStorage.removeItem('indiamart_webhook_url');
      localStorage.removeItem('whatsapp_access_token');
      localStorage.removeItem('whatsapp_phone_id');
      localStorage.removeItem('whatsapp_waba_id');
      localStorage.removeItem('whatsapp_template_name');
      localStorage.removeItem('whatsapp_sender_number');

      setIndiamartKey('');
      setIndiamartMobile('');
      setIndiamartWebhookSecret('');
      setWhatsappToken('');
      setWhatsappPhoneId('');
      setWhatsappWabaId('');
      setWhatsappSenderNumber('');

      if (user && user.uid) {
        await saveApiSettingsToFirestore(user.uid, {
          indiamartKey: '',
          indiamartMobile: '',
          indiamartWebhookSecret: '',
          whatsappToken: '',
          whatsappPhoneId: '',
          whatsappWabaId: '',
          whatsappSenderNumber: ''
        });
      }
      alert("Stored API Credentials cleared successfully!");
    }
  };

  // Button 2: Clear Product Requests Database
  const handleClearDatabaseRecords = async () => {
    if (window.confirm("Clear all IndiaMart Product Request records from the Database?")) {
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
            className={`btn-secondary ${activeTab === 'indiamart' ? 'active' : ''}`}
            style={{
              flex: 1,
              padding: '0.65rem 0.85rem',
              fontSize: '0.88rem',
              borderColor: activeTab === 'indiamart' ? 'var(--accent-cyan)' : 'var(--glass-border)',
              background: activeTab === 'indiamart' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              color: activeTab === 'indiamart' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: '700'
            }}
            onClick={() => setActiveTab('indiamart')}
          >
            <ShoppingBag size={16} style={{ color: 'var(--accent-cyan)' }} />
            <span>IndiaMart Push API</span>
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
          
          {/* TAB 1: INDIAMART PUSH API CONFIGURATION */}
          {activeTab === 'indiamart' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              
              {/* Sync Mode Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(6, 182, 212, 0.1)', padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                  <Zap size={16} />
                  <span>Sync Mode: Real-Time Instant Push (Automatic)</span>
                </div>
                <span className="score-badge score-high" style={{ fontSize: '0.7rem' }}>Realtime Active</span>
              </div>

              {/* Simple Step-by-Step Setup Guide Card */}
              <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Info size={16} style={{ color: 'var(--accent-cyan)' }} />
                  <span>Simple Step-by-Step Setup Guide for IndiaMart:</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '800', flexShrink: 0 }}>1</span>
                    <span>Log in to your seller portal at <strong style={{ color: 'var(--text-primary)' }}>seller.indiamart.com</strong></span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '800', flexShrink: 0 }}>2</span>
                    <span>Go to <strong style={{ color: 'var(--text-primary)' }}>Settings &gt; Lead Manager API / Push API</strong></span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '800', flexShrink: 0 }}>3</span>
                    <span>Copy your <strong style={{ color: 'var(--accent-cyan)' }}>CRM API Key (GLUSR_CRM_KEY)</strong> and paste it in Field 1 below</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '800', flexShrink: 0 }}>4</span>
                    <span>Enter your <strong style={{ color: 'var(--text-primary)' }}>Registered Mobile Number</strong> and click <strong>Save Integration Settings</strong></span>
                  </div>
                </div>
              </div>

              {/* Field 1: IndiaMart API Key */}
              <div className="form-group">
                <label className="form-label" htmlFor="indiamart-key">
                  1. IndiaMart CRM API Key (GLUSR_CRM_KEY) *
                </label>
                <div className="input-container">
                  <Key size={16} className="input-icon" />
                  <input
                    id="indiamart-key"
                    type="password"
                    required
                    className="form-input"
                    placeholder="e.g. mKey_XYZ1238912..."
                    value={indiamartKey}
                    onChange={(e) => setIndiamartKey(e.target.value)}
                  />
                </div>
              </div>

              {/* Field 2: Registered Mobile Number */}
              <div className="form-group">
                <label className="form-label" htmlFor="indiamart-mobile">
                  2. Registered Seller Mobile Number *
                </label>
                <div className="input-container">
                  <Smartphone size={16} className="input-icon" />
                  <input
                    id="indiamart-mobile"
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. +91 9876543210"
                    value={indiamartMobile}
                    onChange={(e) => setIndiamartMobile(e.target.value)}
                  />
                </div>
              </div>

              {/* Field 3: Push Webhook Endpoint URL */}
              <div className="form-group">
                <label className="form-label" htmlFor="indiamart-webhook-url">
                  3. Push Webhook Listener Endpoint URL (Optional)
                </label>
                <div className="input-container">
                  <Globe size={16} className="input-icon" />
                  <input
                    id="indiamart-webhook-url"
                    type="text"
                    className="form-input"
                    placeholder="https://balajicrm.web.app/api/indiamart-push"
                    value={indiamartWebhookUrl}
                    onChange={(e) => setIndiamartWebhookUrl(e.target.value)}
                  />
                </div>
              </div>

              {/* Field 4: Webhook Signature Secret */}
              <div className="form-group">
                <label className="form-label" htmlFor="indiamart-webhook-secret">
                  4. Webhook Signature Secret Token (Optional)
                </label>
                <div className="input-container">
                  <ShieldCheck size={16} className="input-icon" />
                  <input
                    id="indiamart-webhook-secret"
                    type="password"
                    className="form-input"
                    placeholder="Secret key for payload authentication"
                    value={indiamartWebhookSecret}
                    onChange={(e) => setIndiamartWebhookSecret(e.target.value)}
                  />
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
              <span>Clear Saved API Credentials</span>
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
