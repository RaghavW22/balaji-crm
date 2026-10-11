import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Smartphone,
  CheckCircle2,
  AlertCircle,
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

  // UI Feedback State
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [dbSynced, setDbSynced] = useState(false);
  const [isClearingLeads, setIsClearingLeads] = useState(false);

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
      // WhatsApp Business Integration Payload
      whatsappToken: whatsappToken.trim(),
      whatsappPhoneId: whatsappPhoneId.trim(),
      whatsappWabaId: whatsappWabaId.trim(),
      whatsappTemplateName: whatsappTemplateName.trim(),
      whatsappTemplateLanguage: whatsappTemplateLanguage.trim(),
      whatsappSenderNumber: whatsappSenderNumber.trim(),
      // Email Auto-Reply Payload
      autoReplyEnabled,
      autoReplySenderName: autoReplySenderName.trim()
    };

    // Save to LocalStorage
    localStorage.setItem('whatsapp_access_token', settingsData.whatsappToken);
    localStorage.setItem('whatsapp_phone_id', settingsData.whatsappPhoneId);
    localStorage.setItem('whatsapp_waba_id', settingsData.whatsappWabaId);
    localStorage.setItem('whatsapp_template_name', settingsData.whatsappTemplateName);
    localStorage.setItem('whatsapp_template_language', settingsData.whatsappTemplateLanguage);
    localStorage.setItem('whatsapp_sender_number', settingsData.whatsappSenderNumber);
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

      setIsClearingLeads(false);

      if (onDataCleared) {
        onDataCleared();
      }

      alert("All product request records cleared from Database.");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
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
            onClick={onClose}
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
              Email Ingestion is Managed Directly
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Your email credentials &amp; inbox reader are configured in your <code>.env</code> file and monitored live in your terminal.
            </div>
          </div>
        </div>

        {savedSuccess && (
          <div className="alert-box success" style={{ marginBottom: '1.25rem' }}>
            <CheckCircle2 size={18} />
            <div>WhatsApp Integration settings saved successfully!</div>
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
