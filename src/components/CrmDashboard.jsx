import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Settings,
  Sun,
  Moon,
  LogOut,
  ShoppingBag,
  MessageSquare,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Package,
  Clock,
  Building2,
  BadgeCheck,
  Eye,
  X,
  Search,
  Inbox,
  LayoutDashboard,
  Plus,
  Trash2,
  Tag,
  DollarSign,
  CheckCircle2,
  Menu,
  Check,
  FileText,
  Sliders,
  Image,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  Power,
  Send,
  Edit2
} from 'lucide-react';
import {
  logoutUser,
  fetchApiSettingsFromFirestore,
  saveApiSettingsToFirestore,
  fetchLeadsFromFirestore,
  saveLeadToFirestore,
  deleteLeadFromFirestore,
  clearAllLeadsFromFirestore,
  saveProductToFirestore,
  updateProductInFirestore,
  fetchProductsFromFirestore,
  deleteProductFromFirestore,
  clearAllSentRepliesFromFirestore,
  deleteSentReplyFromFirestore
} from '../firebaseConfig';
import ApiSettingsModal from './ApiSettingsModal';
import { parseIndiaMartEmail, DEFAULT_TARGET_SENDER, INDIAMART_SENDER_EMAIL } from '../utils/indiamartParser';

export const DEFAULT_BACKEND_API_URL = 'https://balaji-email-engine.onrender.com';

export const getBackendApiUrl = () => {
  const url = (
    localStorage.getItem('backend_api_url') ||
    import.meta.env.VITE_BACKEND_API_URL ||
    DEFAULT_BACKEND_API_URL
  ).trim();
  // Automatically clear and upgrade any legacy localhost values
  if (!url || url.includes('localhost') || url.includes('127.0.0.1')) {
    localStorage.setItem('backend_api_url', DEFAULT_BACKEND_API_URL);
    return DEFAULT_BACKEND_API_URL;
  }
  return url.replace(/\/+$/, '');
};

// Helpers to track deleted lead IDs locally so auto-polling never resurrects deleted requests
const getDeletedLeadIds = () => {
  try {
    return JSON.parse(localStorage.getItem('crm_deleted_lead_ids') || '[]');
  } catch (_) {
    return [];
  }
};

const addDeletedLeadId = (id) => {
  if (!id) return;
  try {
    const list = getDeletedLeadIds();
    const str = String(id);
    if (!list.includes(str)) {
      list.push(str);
      localStorage.setItem('crm_deleted_lead_ids', JSON.stringify(list));
    }
  } catch (_) {}
};

const clearDeletedLeadIds = () => {
  try {
    localStorage.removeItem('crm_deleted_lead_ids');
  } catch (_) {}
};

const CrmDashboard = ({ user, theme, toggleTheme, onLogout }) => {
  // Navigation State ('overview' | 'requests' | 'products' | 'settings')
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // MAIN AUTO-REPLY MASTER TOGGLE (START / STOP BUTTON STATE)
  const [isAutoReplyEnabled, setIsAutoReplyEnabled] = useState(() => {
    const saved = localStorage.getItem('is_auto_reply_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  // API Integration Modals & Keys
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [targetSenderEmail, setTargetSenderEmail] = useState(() => {
    return localStorage.getItem('target_sender_email') || DEFAULT_TARGET_SENDER;
  });
  const [isFetchingEmail, setIsFetchingEmail] = useState(false);
  const [fetchNotice, setFetchNotice] = useState(null);
  const [whatsappToken, setWhatsappToken] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');

  // Search Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedProductGroup, setSelectedProductGroup] = useState('all');

  // Full Image Preview Lightbox Modal
  const [previewImageModal, setPreviewImageModal] = useState(null);

  // Selected Inquiry Modal
  const [activeInquiryModal, setActiveInquiryModal] = useState(null);

  // Ingested Product Inquiries State
  const [inquiries, setInquiries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Seller Products State
  const [products, setProducts] = useState([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);

  // Sent auto-reply emails log
  const [sentReplies, setSentReplies] = useState([]);

  // Add/Edit Product Form State
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [productFormNotice, setProductFormNotice] = useState(null);

  const [newProduct, setNewProduct] = useState({
    name: '',
    group: '',
    price: '',
    unit: 'per unit',
    imageUrl: '',
    extraImageUrls: '',
    pdfUrl: '',
    description: '',
    specs: ''
  });

  // Toggle Master Auto-Reply System (START / STOP Handler)
  const toggleAutoReplySystem = async () => {
    const newState = !isAutoReplyEnabled;
    setIsAutoReplyEnabled(newState);
    localStorage.setItem('is_auto_reply_enabled', String(newState));

    if (user && user.uid) {
      await saveApiSettingsToFirestore(user.uid, { isAutoReplyEnabled: newState });
    }
  };

  // Load Dashboard Data (Inquiries, Settings, Products)
  const loadDashboardData = async () => {
    setIsLoading(true);
    setIsProductsLoading(true);

    setEmailAddress(localStorage.getItem('email_address') || '');
    setEmailPassword(localStorage.getItem('email_password') || '');
    setTargetSenderEmail(localStorage.getItem('target_sender_email') || DEFAULT_TARGET_SENDER);
    setWhatsappToken(localStorage.getItem('whatsapp_access_token') || '');
    setWhatsappPhoneId(localStorage.getItem('whatsapp_phone_id') || '');

    const savedAutoReply = localStorage.getItem('is_auto_reply_enabled');
    if (savedAutoReply !== null) {
      setIsAutoReplyEnabled(savedAutoReply === 'true');
    }

    if (user && user.uid) {
      const storageInitKey = `products_initialized_${user.uid}`;
      const hasInitialized = localStorage.getItem(storageInitKey);

      // 1. Sync API Keys & Settings from Firestore Database
      const settingsRes = await fetchApiSettingsFromFirestore(user.uid);
      if (settingsRes.success && settingsRes.data) {
        if (settingsRes.data.emailAddress !== undefined) setEmailAddress(settingsRes.data.emailAddress);
        if (settingsRes.data.emailPassword !== undefined) setEmailPassword(settingsRes.data.emailPassword);
        if (settingsRes.data.targetSenderEmail !== undefined) {
          setTargetSenderEmail(settingsRes.data.targetSenderEmail || DEFAULT_TARGET_SENDER);
          localStorage.setItem('target_sender_email', settingsRes.data.targetSenderEmail || DEFAULT_TARGET_SENDER);
        }
        if (settingsRes.data.whatsappToken !== undefined) setWhatsappToken(settingsRes.data.whatsappToken);
        if (settingsRes.data.whatsappPhoneId !== undefined) setWhatsappPhoneId(settingsRes.data.whatsappPhoneId);
        if (settingsRes.data.isAutoReplyEnabled !== undefined) {
          setIsAutoReplyEnabled(settingsRes.data.isAutoReplyEnabled);
          localStorage.setItem('is_auto_reply_enabled', String(settingsRes.data.isAutoReplyEnabled));
        }
        if (settingsRes.data.backendApiUrl !== undefined && settingsRes.data.backendApiUrl) {
          if (!settingsRes.data.backendApiUrl.includes('localhost') && !settingsRes.data.backendApiUrl.includes('127.0.0.1')) {
            localStorage.setItem('backend_api_url', settingsRes.data.backendApiUrl);
          } else {
            localStorage.setItem('backend_api_url', DEFAULT_BACKEND_API_URL);
            saveApiSettingsToFirestore(user.uid, { backendApiUrl: DEFAULT_BACKEND_API_URL }).catch(() => {});
          }
        }
      }

      // 2. Fetch Buyer Product Requests (Firestore + Live Ingestion Server)
      const deletedIds = new Set(getDeletedLeadIds());
      let combinedLeads = [];
      const leadsRes = await fetchLeadsFromFirestore(user.uid);
      if (leadsRes.success && leadsRes.leads) {
        combinedLeads = leadsRes.leads.filter(l => 
          !deletedIds.has(String(l.id)) && !deletedIds.has(String(l.query_id))
        );
      }

      // Also merge leads captured by the live terminal email fetcher
      try {
        const localApiRes = await fetch(`${getBackendApiUrl()}/api/leads`);
        if (localApiRes.ok) {
          const localData = await localApiRes.json();
          if (localData.leads && Array.isArray(localData.leads)) {
            for (const lead of localData.leads) {
              const qId = String(lead.query_id || '');
              const dId = String(lead.id || '');
              if ((qId && deletedIds.has(qId)) || (dId && deletedIds.has(dId))) {
                // Prune from backend cache if lingering
                fetch(`${getBackendApiUrl()}/api/delete-lead`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id: lead.id,
                    query_id: lead.query_id,
                    emailUid: lead.emailUid,
                    phone: lead.buyer?.phone,
                    productName: lead.product?.name
                  })
                }).catch(() => {});
                continue;
              }
              const alreadyExists = combinedLeads.some(l => 
                l.query_id === lead.query_id || 
                (l.buyer?.phone === lead.buyer?.phone && l.product?.name === lead.product?.name)
              );
              if (!alreadyExists) {
                combinedLeads.unshift(lead);
              }
            }
          }
        }
      } catch (_) {
        // Fallback silently if emailFetcher is restarting
      }

      setInquiries(combinedLeads);

      // 3. Fetch Seller Products Catalog
      const prodRes = await fetchProductsFromFirestore(user.uid);
      if (prodRes.success) {
        setProducts(prodRes.products || []);
        // Sync product catalog to local email server for auto-reply image embedding
        try {
          await fetch(`${getBackendApiUrl()}/api/sync-products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ products: prodRes.products || [] })
          });
        } catch (_) { /* silent — server may be starting up */ }
      } else {
        setProducts([]);
      }

      // 4. Fetch Sent Reply Emails log from backend
      try {
        const repliesRes = await fetch(`${getBackendApiUrl()}/api/sent-replies`);
        if (repliesRes.ok) {
          const repliesData = await repliesRes.json();
          setSentReplies(repliesData.replies || []);
        }
      } catch (_) { /* backend may be starting */ }
    } else {
      setInquiries([]);
      setProducts([]);
    }

    setIsLoading(false);
    setIsProductsLoading(false);
  };

  useEffect(() => {
    loadDashboardData();

    // Set up automated email lead polling loop (runs every 60 seconds / 1 minute)
    const intervalId = setInterval(() => {
      loadDashboardData();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [isSettingsOpen, user]);

  const handleSignOut = async () => {
    await logoutUser();
    onLogout();
  };

  // STRICT CATALOG MATCHER ENGINE: Returns matching product, or NULL if not matched (Auto-reply MUST NOT be sent if null)
  const findBestCatalogMatch = (inquiryProductName) => {
    if (!inquiryProductName || !products || products.length === 0) return null;
    const query = inquiryProductName.toLowerCase().trim();

    // 1. Direct or Partial String Match
    let matched = products.find(p => p.name.toLowerCase().includes(query) || query.includes(p.name.toLowerCase()));
    if (matched) return { product: matched, matchType: 'Direct Catalog Match' };

    // 2. Keyword Search Match
    const tokens = query.split(/\s+/).filter(t => t.length > 2);
    for (const prod of products) {
      const name = prod.name.toLowerCase();
      const specs = (prod.specs || '').toLowerCase();
      const desc = (prod.description || '').toLowerCase();

      for (const token of tokens) {
        if (name.includes(token) || specs.includes(token) || desc.includes(token)) {
          return { product: prod, matchType: 'Keyword Match' };
        }
      }
    }

    // STRICT RULE: If no match found in seller catalog, return NULL!
    return null;
  };

  // INGEST / FETCH INQUIRY EMAIL (STRICTLY FILTERED TO targetSenderEmail)
  const handleSimulateOrFetchEmail = async (customEmailText, customSender) => {
    setIsFetchingEmail(true);
    setFetchNotice(null);

    // Live inbox check via backend fetcher API
    if (!customEmailText) {
      try {
        const apiRes = await fetch(`${getBackendApiUrl()}/api/fetch-now`);
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          if (apiData.leads && apiData.leads.length > 0) {
            const deletedIds = new Set(getDeletedLeadIds());
            const activeLeads = apiData.leads.filter(l => 
              !deletedIds.has(String(l.id)) && !deletedIds.has(String(l.query_id))
            );
            setInquiries(activeLeads);
            setFetchNotice({
              type: 'success',
              text: `✅ Inbox synchronized! Loaded inquiry emails.`
            });
          } else {
            setFetchNotice({
              type: 'info',
              text: `📭 No new unread inquiry emails. Inbox is up to date.`
            });
          }
          setIsFetchingEmail(false);
          return;
        }
      } catch (_) {
        setFetchNotice({
          type: 'error',
          text: `⚠️ Ingestion server not reachable at ${getBackendApiUrl()}. If using Render, ensure your Render URL is set in Settings.`
        });
        setIsFetchingEmail(false);
        return;
      }
    }

    const emailContent = customEmailText;
    const sender = customSender || targetSenderEmail;

    // Run parser with strict allowed sender validation (25128067@pvgcoet.ac.in)
    const parseResult = parseIndiaMartEmail(emailContent, sender, targetSenderEmail);

    if (!parseResult.success) {
      setFetchNotice({ type: 'error', text: parseResult.error });
      setIsFetchingEmail(false);
      return;
    }

    const leadData = parseResult.data;

    // Check against seller catalog
    const matchRes = findBestCatalogMatch(leadData.product?.name);
    let whatsappStatus = { sent: false, reason: 'Auto-reply disabled or no product match' };

    if (!isAutoReplyEnabled) {
      whatsappStatus = {
        sent: false,
        reason: 'Auto-Reply is currently STOPPED. Enable Auto-Reply to automatically send WhatsApp responses.'
      };
    } else if (matchRes && matchRes.product) {
      whatsappStatus = {
        sent: true,
        templateName: localStorage.getItem('whatsapp_template_name') || 'buyer_inquiry_reply',
        matchedProduct: matchRes.product.name,
        priceSent: matchRes.product.price,
        specsSent: matchRes.product.specs || 'Standard specifications',
        photoSent: matchRes.product.imageUrl || ''
      };
    } else {
      whatsappStatus = {
        sent: false,
        reason: `Product "${leadData.product?.name}" was not found in your seller catalog. Auto-reply blocked to prevent wrong pricing.`
      };
    }

    leadData.whatsappStatus = whatsappStatus;

    // Save lead to Firestore Database
    let savedId = `lead-${Date.now()}`;
    if (user && user.uid) {
      const saveRes = await saveLeadToFirestore(user.uid, leadData);
      if (saveRes.success) savedId = saveRes.id;
    }

    const newInquiry = { id: savedId, ...leadData };
    setInquiries(prev => [newInquiry, ...prev]);

    setFetchNotice({
      type: 'success',
      text: `✅ Successfully fetched inquiry from ${targetSenderEmail}! (${whatsappStatus.sent ? 'WhatsApp Auto-Reply Sent' : 'Auto-Reply Blocked: ' + whatsappStatus.reason})`
    });

    setIsFetchingEmail(false);
  };

  // Open Add Product Modal (clean form)
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setNewProduct({
      name: '',
      group: '',
      price: '',
      unit: 'per unit',
      imageUrl: '',
      extraImageUrls: '',
      pdfUrl: '',
      description: '',
      specs: ''
    });
    setProductFormNotice(null);
    setIsAddProductModalOpen(true);
  };

  // Open Edit Product Modal (pre-filled with current product)
  const handleOpenEditProduct = (prod) => {
    setEditingProduct(prod);
    setNewProduct({
      name: prod.name || '',
      group: prod.group || prod.category || '',
      price: prod.price || '',
      unit: prod.unit || 'per unit',
      imageUrl: prod.imageUrl || '',
      extraImageUrls: Array.isArray(prod.extraImageUrls) ? prod.extraImageUrls.join('\n') : (prod.extraImageUrls || ''),
      pdfUrl: prod.pdfUrl || '',
      description: prod.description || '',
      specs: prod.specs || ''
    });
    setProductFormNotice(null);
    setIsAddProductModalOpen(true);
  };

  // Add / Edit Product Submit Handler
  const handleAddProductSubmit = async (e) => {
    e.preventDefault();
    if (!newProduct.name.trim() || !newProduct.price.trim()) {
      setProductFormNotice({ type: 'error', text: 'Please fill in Product Name and Price.' });
      return;
    }

    setIsSubmittingProduct(true);
    setProductFormNotice(null);

    const productPayload = {
      name: newProduct.name.trim(),
      group: (newProduct.group || '').trim() || 'General',
      price: newProduct.price.startsWith('₹') || newProduct.price.startsWith('$') ? newProduct.price.trim() : `₹${newProduct.price.trim()}`,
      unit: newProduct.unit.trim() || 'per unit',
      imageUrl: newProduct.imageUrl.trim() || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop',
      extraImageUrls: newProduct.extraImageUrls.trim()
        ? newProduct.extraImageUrls.split(/[,\n]+/).map(s => s.trim()).filter(u => u.startsWith('http'))
        : [],
      pdfUrl: (newProduct.pdfUrl || '').trim(),
      description: newProduct.description.trim() || 'No description provided.',
      specs: newProduct.specs.trim() || 'Standard Specifications',
      updatedAt: new Date().toISOString()
    };

    let result = { success: true, id: editingProduct ? editingProduct.id : `local-prod-${Date.now()}` };
    if (user && user.uid) {
      if (editingProduct) {
        result = await updateProductInFirestore(user.uid, editingProduct.id, productPayload);
      } else {
        result = await saveProductToFirestore(user.uid, productPayload);
      }
      localStorage.setItem(`products_initialized_${user.uid}`, 'true');
    }

    if (result.success) {
      const savedProduct = { id: editingProduct ? editingProduct.id : result.id, ...productPayload };
      setProducts(prev => {
        const updated = editingProduct
          ? prev.map(p => p.id === editingProduct.id ? savedProduct : p)
          : [savedProduct, ...prev];
        // Sync updated catalog to email server for image and pdf embedding in auto-reply
        fetch(`${getBackendApiUrl()}/api/sync-products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ products: updated })
        }).catch(() => {});
        return updated;
      });

      setProductFormNotice({ 
        type: 'success', 
        text: editingProduct ? 'Product updated successfully!' : 'Product added successfully!' 
      });
      setTimeout(() => {
        setIsAddProductModalOpen(false);
        setEditingProduct(null);
        setProductFormNotice(null);
        setNewProduct({
          name: '',
          group: '',
          price: '',
          unit: 'per unit',
          imageUrl: '',
          extraImageUrls: '',
          pdfUrl: '',
          description: '',
          specs: ''
        });
      }, 700);
    } else {
      setProductFormNotice({ type: 'error', text: result.error || 'Failed to save product to database.' });
    }

    setIsSubmittingProduct(false);
  };

  // Delete Product Handler
  const handleDeleteProduct = async (productId) => {
    if (window.confirm("Are you sure you want to remove this product from your catalog?")) {
      setProducts(prev => prev.filter(p => p.id !== productId));
      if (user && user.uid) {
        localStorage.setItem(`products_initialized_${user.uid}`, 'true');
        await deleteProductFromFirestore(user.uid, productId);
      }
    }
  };



  // Delete Product Request Handler
  const handleDeleteInquiry = async (inquiryId, inquiryObj = null) => {
    if (window.confirm("Are you sure you want to delete this product request?")) {
      const targetItem = inquiryObj || inquiries.find(item => (item.id || item.query_id) === inquiryId);
      const queryId = targetItem?.query_id || (String(inquiryId).startsWith('IMQ') ? inquiryId : null);
      const firestoreId = targetItem?.id && targetItem.id !== targetItem.query_id ? targetItem.id : (inquiryId !== queryId ? inquiryId : null);

      if (inquiryId) addDeletedLeadId(inquiryId);
      if (queryId) addDeletedLeadId(queryId);
      if (firestoreId) addDeletedLeadId(firestoreId);

      setInquiries(prev => prev.filter(item => 
        (item.id || item.query_id) !== inquiryId && 
        (!queryId || item.query_id !== queryId)
      ));
      if (activeInquiryModal && ((activeInquiryModal.id || activeInquiryModal.query_id) === inquiryId || (queryId && activeInquiryModal.query_id === queryId))) {
        setActiveInquiryModal(null);
      }

      if (user && user.uid) {
        await deleteLeadFromFirestore(user.uid, firestoreId || inquiryId, queryId);
      }

      try {
        await fetch(`${getBackendApiUrl()}/api/delete-lead`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: firestoreId || inquiryId,
            query_id: queryId,
            emailUid: targetItem?.emailUid,
            phone: targetItem?.buyer?.phone,
            productName: targetItem?.product?.name
          })
        });
      } catch (_) {}
    }
  };

  // Clear All Inquiries Handler (cleans all cached & database requests)
  const handleClearAllInquiries = async () => {
    if (window.confirm("Are you sure you want to clear all product requests?")) {
      inquiries.forEach(item => {
        if (item.id) addDeletedLeadId(item.id);
        if (item.query_id) addDeletedLeadId(item.query_id);
      });
      setInquiries([]);
      setActiveInquiryModal(null);
      if (user && user.uid) {
        await clearAllLeadsFromFirestore(user.uid);
      }
      try {
        await fetch(`${getBackendApiUrl()}/api/clear-leads`, { method: 'POST' });
      } catch (_) {}
      setFetchNotice({ type: 'info', text: 'All product inquiries have been cleared.' });
    }
  };

  // Delete Single Sent Reply Handler
  const handleDeleteSentReply = async (reply, index) => {
    if (window.confirm("Are you sure you want to delete this sent reply record?")) {
      setSentReplies(prev => prev.filter((_, i) => i !== index));
      if (user && user.uid && reply.id) {
        await deleteSentReplyFromFirestore(user.uid, reply.id);
      }
      try {
        await fetch(`${getBackendApiUrl()}/api/delete-sent-reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sentAt: reply.sentAt, index })
        });
      } catch (_) {}
    }
  };

  // Clear All Sent Replies Handler (clears from website, backend cache, and Firestore)
  const handleClearAllSentReplies = async () => {
    if (window.confirm("Are you sure you want to clear all sent reply history? This will remove all records from the website and database.")) {
      setSentReplies([]);
      if (user && user.uid) {
        await clearAllSentRepliesFromFirestore(user.uid);
      }
      try {
        await fetch(`${getBackendApiUrl()}/api/clear-sent-replies`, { method: 'POST' });
      } catch (_) {}
    }
  };

  // Filter inquiries
  const filteredInquiries = inquiries.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const buyerName = item.buyer?.name?.toLowerCase() || '';
    const companyName = item.buyer?.company?.toLowerCase() || '';
    const productName = item.product?.name?.toLowerCase() || '';
    const categoryName = item.product?.category?.toLowerCase() || '';
    const queryId = item.query_id?.toLowerCase() || '';

    return (
      buyerName.includes(q) ||
      companyName.includes(q) ||
      productName.includes(q) ||
      categoryName.includes(q) ||
      queryId.includes(q)
    );
  });

  // Filter seller products by selected group and search keyword
  const filteredProducts = products.filter((item) => {
    const itemGroup = (item.group || item.category || 'General').trim();
    if (selectedProductGroup !== 'all' && itemGroup.toLowerCase() !== selectedProductGroup.toLowerCase()) {
      return false;
    }
    if (!productSearchQuery.trim()) return true;
    const q = productSearchQuery.toLowerCase().trim();
    const name = item.name?.toLowerCase() || '';
    const specs = item.specs?.toLowerCase() || '';
    const description = item.description?.toLowerCase() || '';
    const grp = itemGroup.toLowerCase();

    return name.includes(q) || specs.includes(q) || description.includes(q) || grp.includes(q);
  });

  return (
    <div className="layout-content">
      {/* Seller Header Bar */}
      <header className="header-bar">
        <div className="brand-logo-group">
          <div className="logo-badge">
            <Cpu className="w-6 h-6" />
          </div>
          <div className="brand-title">
            <span>Balaji CRM</span>
            <span className="ai-pill-tag">
              <Sparkles size={11} style={{ display: 'inline', marginRight: '3px' }} />
              Seller Portal
            </span>
          </div>
        </div>

        <div className="header-actions" style={{ gap: '0.75rem' }}>

          {/* MAIN START & STOP BUTTON FOR AUTO-REPLY SYSTEM */}
          <button
            onClick={toggleAutoReplySystem}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'all 0.2s ease',
              border: isAutoReplyEnabled ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(244, 63, 94, 0.4)',
              background: isAutoReplyEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              color: isAutoReplyEnabled ? 'var(--accent-emerald)' : 'var(--accent-rose)',
              boxShadow: isAutoReplyEnabled ? '0 0 10px rgba(16, 185, 129, 0.25)' : 'none'
            }}
            title={isAutoReplyEnabled ? "Click to STOP Auto-Reply System" : "Click to START Auto-Reply System"}
          >
            {isAutoReplyEnabled ? (
              <>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-emerald)', boxShadow: '0 0 6px var(--accent-emerald)' }}></span>
                <span>Auto-Reply: <strong>RUNNING</strong></span>
                <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: '10px', background: 'var(--accent-rose)', color: '#fff', marginLeft: '4px', fontWeight: 'bold' }}>STOP</span>
              </>
            ) : (
              <>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-rose)' }}></span>
                <span>Auto-Reply: <strong>STOPPED</strong></span>
                <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: '10px', background: 'var(--accent-emerald)', color: '#fff', marginLeft: '4px', fontWeight: 'bold' }}>START</span>
              </>
            )}
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="action-btn-icon"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="btn-secondary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Mobile Top Navigation Toggle Bar */}
      <div className="mobile-sidebar-toggle-bar">
        <button
          className="btn-secondary"
          style={{ width: 'auto', padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        >
          <Menu size={18} />
          <span>Dashboard Menu ({activeTab.toUpperCase()})</span>
        </button>

        {/* Mobile Master Start/Stop Auto-Reply Button */}
        <button
          onClick={toggleAutoReplySystem}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '16px',
            fontSize: '0.75rem',
            fontWeight: '700',
            border: isAutoReplyEnabled ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(244, 63, 94, 0.4)',
            background: isAutoReplyEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            color: isAutoReplyEnabled ? 'var(--accent-emerald)' : 'var(--accent-rose)'
          }}
        >
          {isAutoReplyEnabled ? "🟢 RUNNING (STOP)" : "🔴 STOPPED (START)"}
        </button>
      </div>

      {/* Main Dashboard Layout Container (Sidebar + Content Viewport) */}
      <div className="dashboard-layout-container">

        {/* SIDEBAR NAVIGATION PANEL */}
        <aside className={`sidebar-aside ${!isMobileSidebarOpen ? 'mobile-collapsed' : ''}`}>
          <div>
            <div className="sidebar-nav-section-title">Navigation Menu</div>
            <ul className="sidebar-nav-list">
              <li>
                <button
                  className={`sidebar-nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('overview');
                    setIsMobileSidebarOpen(false);
                  }}
                >
                  <LayoutDashboard size={18} />
                  <span>Overview</span>
                </button>
              </li>

              <li>
                <button
                  className={`sidebar-nav-btn ${activeTab === 'requests' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('requests');
                    setIsMobileSidebarOpen(false);
                  }}
                >
                  <ShoppingBag size={18} />
                  <span>Product Requests</span>
                  <span className="sidebar-badge">{inquiries.length}</span>
                </button>
              </li>

              <li>
                <button
                  className={`sidebar-nav-btn ${activeTab === 'products' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('products');
                    setIsMobileSidebarOpen(false);
                  }}
                >
                  <Package size={18} />
                  <span>My Products</span>
                  <span className="sidebar-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-emerald)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                    {products.length}
                  </span>
                </button>
              </li>

              <li>
                <button
                  className={`sidebar-nav-btn ${activeTab === 'sent-replies' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('sent-replies');
                    setIsMobileSidebarOpen(false);
                    // Refresh replies on tab visit
                    fetch(`${getBackendApiUrl()}/api/sent-replies`).then(r => r.json()).then(d => setSentReplies(d.replies || [])).catch(() => {});
                  }}
                >
                  <Send size={18} />
                  <span>Sent Replies</span>
                  {sentReplies.length > 0 && (
                    <span className="sidebar-badge" style={{ background: 'rgba(96, 165, 250, 0.2)', color: 'var(--accent-cyan)', borderColor: 'rgba(96, 165, 250, 0.3)' }}>
                      {sentReplies.length}
                    </span>
                  )}
                </button>
              </li>

              <li>
                <button
                  className={`sidebar-nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => {
                    setIsSettingsOpen(true);
                    setIsMobileSidebarOpen(false);
                  }}
                >
                  <Settings size={18} />
                  <span>API Settings</span>
                  {(!whatsappToken) && (
                    <span className="sidebar-badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-amber)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                      Setup
                    </span>
                  )}
                </button>
              </li>
            </ul>
          </div>

          {/* Sidebar Footer User Info */}
          <div className="sidebar-user-card">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Logged in as</div>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent-cyan)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Seller Account
            </div>
          </div>
        </aside>

        {/* MAIN DASHBOARD CONTENT VIEWPORT */}
        <main className="dashboard-main-viewport">

          {/* VIEW 1: OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div>
              {/* Welcome Banner with Master Auto-Reply Status Badge */}
              <div className="dashboard-hero" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div className="hero-welcome">
                  <h1>Welcome to Seller Dashboard</h1>
                  <p>
                    Automated catalog matching and WhatsApp Business API responses for email buyer requests (strictly fetching only from {targetSenderEmail} every 1 minute).
                  </p>
                </div>

                {/* Master Auto-Reply Status Control Card */}
                <div style={{
                  background: 'var(--glass-bg)',
                  border: `1px solid ${isAutoReplyEnabled ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)'}`,
                  padding: '0.85rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  boxShadow: isAutoReplyEnabled ? '0 0 15px rgba(16, 185, 129, 0.1)' : 'none'
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700', marginBottom: '4px' }}>
                      Reply Engine
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        className={`score-badge ${isAutoReplyEnabled ? 'score-high' : 'score-low'}`}
                        style={{
                          fontSize: '0.82rem',
                          padding: '0.25rem 0.65rem',
                          fontWeight: '800',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: isAutoReplyEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                          color: isAutoReplyEnabled ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                          borderColor: isAutoReplyEnabled ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'
                        }}
                      >
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: isAutoReplyEnabled ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                          display: 'inline-block',
                          boxShadow: isAutoReplyEnabled ? '0 0 8px var(--accent-emerald)' : 'none'
                        }}></span>
                        STATUS: {isAutoReplyEnabled ? 'RUNNING' : 'STOPPED'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={toggleAutoReplySystem}
                    type="button"
                    className={isAutoReplyEnabled ? "btn-secondary" : "btn-primary"}
                    style={{
                      padding: '0.55rem 1.1rem',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      width: 'auto',
                      borderColor: isAutoReplyEnabled ? 'rgba(244, 63, 94, 0.5)' : 'none',
                      color: isAutoReplyEnabled ? 'var(--accent-rose)' : '#fff',
                      background: isAutoReplyEnabled ? 'rgba(244, 63, 94, 0.1)' : 'linear-gradient(135deg, var(--accent-emerald), #059669)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isAutoReplyEnabled ? (
                      <>
                        <Pause size={15} />
                        <span>Pause Auto-Reply</span>
                      </>
                    ) : (
                      <>
                        <Play size={15} />
                        <span>Start Auto-Reply</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

              {/* Overview KPI Cards Grid */}
              <div className="kpi-grid">
                <div className="kpi-card" onClick={() => setActiveTab('requests')} style={{ cursor: 'pointer' }}>
                  <div className="kpi-icon-box" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}>
                    <ShoppingBag size={24} />
                  </div>
                  <div>
                    <div className="kpi-val">{inquiries.length}</div>
                    <div className="kpi-label">Email Inquiries</div>
                    <div className="kpi-trend up">
                      <Clock size={12} /> Active (&lt; 7 Days)
                    </div>
                  </div>
                </div>

                <div className="kpi-card" onClick={() => setActiveTab('products')} style={{ cursor: 'pointer' }}>
                  <div className="kpi-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)' }}>
                    <Package size={24} />
                  </div>
                  <div>
                    <div className="kpi-val">{products.length}</div>
                    <div className="kpi-label">Listed Products</div>
                    <div className="kpi-trend up">
                      <Package size={12} /> View Catalog
                    </div>
                  </div>
                </div>

                <div className="kpi-card" onClick={() => setIsSettingsOpen(true)} style={{ cursor: 'pointer' }}>
                  <div className="kpi-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)' }}>
                    <Mail size={24} />
                  </div>
                  <div>
                    <div className="kpi-val" style={{ fontSize: '0.88rem', color: 'var(--accent-emerald)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '185px' }} title="raghavw2006@gmail.com">
                      raghavw2006@gmail.com
                    </div>
                    <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent-emerald)', display: 'inline-block' }}></span>
                      Mailbox Connected (IMAP)
                    </div>
                    <div className="kpi-trend up" style={{ color: 'var(--accent-cyan)', fontSize: '0.72rem' }}>
                      Filter: {targetSenderEmail}
                    </div>
                  </div>
                </div>

                <div className="kpi-card" onClick={() => setIsSettingsOpen(true)} style={{ cursor: 'pointer' }}>
                  <div className="kpi-icon-box" style={{ background: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-secondary)' }}>
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <div className="kpi-val" style={{ fontSize: '1.2rem', color: whatsappToken ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                      {whatsappToken ? 'Active' : 'Missing Token'}
                    </div>
                    <div className="kpi-label">WhatsApp Business API</div>
                    <div className="kpi-trend neutral">
                      {whatsappToken ? '● Auto-Template Ready' : '⚠ Action Required'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Summary Grid */}
              <div className="dashboard-sections-grid">

                {/* Recent Inquiries Preview */}
                <div className="section-panel">
                  <div className="panel-header">
                    <div className="panel-title">
                      <Mail size={20} style={{ color: 'var(--accent-cyan)' }} />
                      <span>Recent Email Buyer Inquiries</span>
                    </div>
                    <button
                      className="btn-secondary"
                      style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                      onClick={() => setActiveTab('requests')}
                    >
                      View All ({inquiries.length})
                    </button>
                  </div>

                  <div className="activity-list">
                    {inquiries.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '1.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No buyer product requests yet.
                      </div>
                    ) : (
                      inquiries.slice(0, 3).map((inquiry) => {
                        const isSent = inquiry.whatsappStatus?.sent === true;
                        return (
                          <div key={inquiry.id || inquiry.query_id} className="activity-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div className="activity-user">
                                <div className="avatar-circle">
                                  {inquiry.buyer?.name ? inquiry.buyer.name.charAt(0) : 'B'}
                                </div>
                                <div>
                                  <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                                    {inquiry.product?.name}
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    Buyer: {inquiry.buyer?.name} ({inquiry.buyer?.company})
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  className="btn-secondary"
                                  style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
                                  onClick={() => {
                                    setActiveTab('requests');
                                    setActiveInquiryModal(inquiry);
                                  }}
                                >
                                  <Eye size={14} />
                                  <span>View Details</span>
                                </button>
                                <button
                                  className="btn-secondary"
                                  style={{ width: 'auto', padding: '0.4rem 0.65rem', fontSize: '0.78rem', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                                  onClick={() => handleDeleteInquiry(inquiry.id || inquiry.query_id, inquiry)}
                                  title="Delete Product Request"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            {/* WhatsApp Auto-Reply Delivery Banner */}
                            {isSent ? (
                              <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '0.45rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--accent-emerald)', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle2 size={14} />
                                <span><strong>WhatsApp Template Auto-Sent:</strong> Photo &amp; Specs Delivered</span>
                              </div>
                            ) : (
                              <div style={{ background: 'rgba(244, 63, 94, 0.08)', padding: '0.45rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--accent-rose)', border: '1px solid rgba(244, 63, 94, 0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <XCircle size={14} />
                                <span><strong>Auto-Reply Blocked:</strong> Product Not Found in Catalog</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Quick Products Overview Panel */}
                <div className="section-panel">
                  <div className="panel-header">
                    <div className="panel-title">
                      <Package size={20} style={{ color: 'var(--accent-emerald)' }} />
                      <span>Catalog Overview</span>
                    </div>
                    <button
                      className="btn-secondary"
                      style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                      onClick={() => setActiveTab('products')}
                    >
                      Go to Products
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {products.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '1.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No products added yet. Click 'Go to Products' to add your catalog.
                      </div>
                    ) : (
                      products.slice(0, 3).map(prod => (
                        <div key={prod.id} style={{ padding: '0.75rem 1rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {prod.imageUrl && (
                              <img src={prod.imageUrl} alt={prod.name} style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--glass-border)' }} />
                            )}
                            <div>
                              <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{prod.name}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}><span style={{ color: 'var(--accent-emerald)' }}>{prod.price}</span> ({prod.unit})</div>
                            </div>
                          </div>
                          <span className="score-badge score-high" style={{ fontSize: '0.7rem' }}>Active</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* VIEW 2: PRODUCT REQUESTS (EMAIL INGESTION) TAB */}
          {activeTab === 'requests' && (
            <div className="section-panel">
              <div className="panel-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <div className="panel-title">
                  <Mail size={22} style={{ color: 'var(--accent-cyan)' }} />
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>Email Product Inquiries ({filteredInquiries.length})</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '400' }}>
                      Automated Catalog Matching &amp; WhatsApp Business Template Dispatch for Email Leads
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                  {/* Search Input Bar */}
                  <div className="input-container" style={{ width: '240px' }}>
                    <Search size={16} className="input-icon" />
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: '0.5rem 0.8rem 0.5rem 2.4rem', fontSize: '0.85rem' }}
                      placeholder="Search requests..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSimulateOrFetchEmail()}
                    disabled={isFetchingEmail}
                    className="btn-primary"
                    style={{ padding: '0.5rem 0.95rem', fontSize: '0.82rem', width: 'auto', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-primary))' }}
                    title="Fetch latest inquiry emails from inbox"
                  >
                    {isFetchingEmail ? (
                      <>
                        <div className="spinner" style={{ width: '13px', height: '13px' }}></div>
                        <span>Fetching...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>Fetch Inquiries</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleClearAllInquiries()}
                    disabled={inquiries.length === 0}
                    className="btn-secondary"
                    style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem', width: 'auto', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                    title="Clear all product requests"
                  >
                    <Trash2 size={14} />
                    <span>Clear All</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    className="btn-secondary"
                    style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem', width: 'auto' }}
                  >
                    <Settings size={14} />
                    <span>Settings</span>
                  </button>
                </div>
              </div>

              {/* Ingestion / Fetch Feedback Alert Box */}
              {fetchNotice && (
                <div className={`alert-box ${fetchNotice.type}`} style={{ marginTop: '0.85rem' }}>
                  {fetchNotice.text}
                </div>
              )}

              {/* Notice if Auto-Reply System is Stopped */}
              {!isAutoReplyEnabled && (
                <div style={{ marginTop: '1.25rem', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.85rem 1.1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--accent-rose)', fontSize: '0.85rem', fontWeight: '700' }}>
                    <AlertTriangle size={18} />
                    <span>Auto-Reply System is currently STOPPED. Incoming email leads will NOT receive automated WhatsApp replies.</span>
                  </div>
                  <button
                    onClick={toggleAutoReplySystem}
                    className="btn-primary"
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', width: 'auto', background: 'linear-gradient(135deg, var(--accent-emerald), #059669)' }}
                  >
                    <Play size={14} />
                    <span>START AUTO-REPLY NOW</span>
                  </button>
                </div>
              )}

              {/* List of Ingested Product Inquiries */}
              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <div className="spinner" style={{ margin: '0 auto 1rem auto', width: '28px', height: '28px' }}></div>
                  <span>Fetching active product requests from database...</span>
                </div>
              ) : filteredInquiries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: 'var(--glass-bg)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--glass-border)', marginTop: '1.25rem' }}>
                  <Inbox size={42} style={{ color: 'var(--text-muted)', marginBottom: '0.85rem' }} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    {searchQuery.trim() ? "No matching product requests found" : "No Product Requests Yet"}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto' }}>
                    {searchQuery.trim()
                      ? `No requests match "${searchQuery}". Try searching with another name or keyword.`
                      : "Incoming buyer inquiries from email will automatically appear here every 1 minute."}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.25rem' }}>
                  {filteredInquiries.map((inquiry) => {
                    const matchRes = findBestCatalogMatch(inquiry.product?.name);
                    const matchedProd = matchRes ? matchRes.product : null;
                    const isWhatsAppSent = inquiry.whatsappStatus?.sent === true;

                    return (
                      <div
                        key={inquiry.id || inquiry.query_id}
                        className="activity-item"
                        style={{
                          padding: '1.35rem 1.5rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1.1rem',
                          background: 'var(--glass-bg)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: 'var(--radius-md)'
                        }}
                      >
                        {/* Top Line: Buyer Info & View Details Action */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div className="avatar-circle" style={{ width: '48px', height: '48px', fontSize: '1.2rem', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-primary))' }}>
                              {inquiry.buyer?.name ? inquiry.buyer.name.charAt(0) : 'B'}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                <span style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                                  {inquiry.product?.name}
                                </span>
                                <span className="score-badge score-mid" style={{ fontSize: '0.72rem' }}>
                                  Qty: {inquiry.product?.quantity}
                                </span>
                              </div>

                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Buyer: <strong style={{ color: 'var(--text-primary)' }}>{inquiry.buyer?.name}</strong> ({inquiry.buyer?.company}) • <span style={{ color: 'var(--accent-cyan)' }}>{inquiry.buyer?.location?.city}, {inquiry.buyer?.location?.state}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <button
                              onClick={() => setActiveInquiryModal(inquiry)}
                              className="btn-secondary"
                              style={{ fontSize: '0.85rem', padding: '0.65rem 1.25rem', width: 'auto' }}
                            >
                              <Eye size={16} />
                              <span>View Inquiry Details</span>
                            </button>
                            <button
                              onClick={() => handleDeleteInquiry(inquiry.id || inquiry.query_id, inquiry)}
                              className="btn-secondary"
                              style={{ fontSize: '0.85rem', padding: '0.65rem 1rem', width: 'auto', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.35)' }}
                              title="Delete Product Request"
                            >
                              <Trash2 size={16} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>

                        {/* DEDICATED AUTOMATED WHATSAPP TEMPLATE STATUS INDICATOR PANEL */}
                        <div style={{ background: isWhatsAppSent ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)', padding: '0.9rem 1.15rem', borderRadius: '8px', border: `1px solid ${isWhatsAppSent ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>

                          {/* Left: Status Icon & Details */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {isWhatsAppSent ? (
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)' }}>
                                <CheckCircle2 size={22} />
                              </div>
                            ) : (
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(244, 63, 94, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-rose)' }}>
                                <XCircle size={22} />
                              </div>
                            )}

                            <div>
                              <div style={{ fontSize: '0.88rem', fontWeight: '800', color: isWhatsAppSent ? 'var(--accent-emerald)' : 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                WhatsApp Reply Status: {isWhatsAppSent ? "AUTOMATED TEMPLATE SENT" : "AUTO-REPLY BLOCKED"}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {isWhatsAppSent
                                  ? `Approved Meta Template "${inquiry.whatsappStatus?.templateName || 'buyer_inquiry_reply'}" delivered with catalog photo, price (${inquiry.whatsappStatus?.priceSent || matchedProd?.price}), and specs.`
                                  : (inquiry.whatsappStatus?.reason || "Requested product is not found in seller catalog. Auto-reply was automatically prevented to avoid wrong pricing.")
                                }
                              </div>
                            </div>
                          </div>

                          {/* Right: Helpful Action for Unmatched Product */}
                          {!isWhatsAppSent && (
                            <button
                              onClick={() => setIsAddProductModalOpen(true)}
                              className="btn-secondary"
                              style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', borderColor: 'rgba(244, 63, 94, 0.4)', color: 'var(--accent-rose)' }}
                            >
                              <Plus size={14} />
                              <span>Add Product to Catalog</span>
                            </button>
                          )}

                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: MY PRODUCTS & ADD PRODUCT CATALOG TAB */}
          {activeTab === 'products' && (
            <div>
              <div className="section-panel">
                <div className="panel-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                  <div className="panel-title">
                    <Package size={24} style={{ color: 'var(--accent-emerald)' }} />
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>Product Catalog ({filteredProducts.length})</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '400' }}>
                        Manage your products and add new inventory to showcase to buyers
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Product Search Bar */}
                    <div className="input-container" style={{ width: '280px' }}>
                      <Search size={16} className="input-icon" />
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '0.5rem 0.8rem 0.5rem 2.4rem', fontSize: '0.85rem' }}
                        placeholder="Search products by name or specs..."
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                      />
                    </div>

                    {/* ADD NEW PRODUCT BUTTON */}
                    <button
                      className="btn-primary"
                      style={{ width: 'auto', padding: '0.65rem 1.25rem', fontSize: '0.88rem' }}
                      onClick={handleOpenAddProduct}
                    >
                      <Plus size={18} />
                      <span>Add New Product</span>
                    </button>
                  </div>
                </div>

                {/* GROUP CATEGORY FILTER TABS BAR */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  overflowX: 'auto',
                  padding: '0.75rem 0 0.85rem 0',
                  borderBottom: '1px solid var(--glass-border)',
                  marginBottom: '1rem'
                }}>
                  <button
                    onClick={() => setSelectedProductGroup('all')}
                    style={{
                      padding: '0.4rem 0.95rem',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                      border: selectedProductGroup === 'all' ? '1px solid var(--accent-emerald)' : '1px solid var(--glass-border)',
                      background: selectedProductGroup === 'all' ? 'rgba(16, 185, 129, 0.18)' : 'var(--glass-bg)',
                      color: selectedProductGroup === 'all' ? 'var(--accent-emerald)' : 'var(--text-secondary)'
                    }}
                  >
                    All Groups ({products.length})
                  </button>
                  {Array.from(new Set(products.map(p => (p.group || p.category || '').trim()).filter(Boolean))).map(grp => {
                    const count = products.filter(p => (p.group || p.category || '').trim().toLowerCase() === grp.toLowerCase()).length;
                    const isSelected = selectedProductGroup.toLowerCase() === grp.toLowerCase();
                    return (
                      <button
                        key={grp}
                        onClick={() => setSelectedProductGroup(grp)}
                        style={{
                          padding: '0.4rem 0.95rem',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s',
                          border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--glass-border)',
                          background: isSelected ? 'rgba(6, 182, 212, 0.18)' : 'var(--glass-bg)',
                          color: isSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)'
                        }}
                      >
                        <Tag size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                        {grp} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* PRODUCT CARDS CATALOG GRID */}
                {isProductsLoading ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem auto', width: '28px', height: '28px' }}></div>
                    <span>Loading your products catalog...</span>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: 'var(--glass-bg)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--glass-border)', marginTop: '1.25rem' }}>
                    <Package size={42} style={{ color: 'var(--text-muted)', marginBottom: '0.85rem' }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      {productSearchQuery.trim() || selectedProductGroup !== 'all' ? "No matching products found" : "No Products Added Yet"}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.25rem auto' }}>
                      {productSearchQuery.trim() || selectedProductGroup !== 'all'
                        ? `No products match your current filters. Try selecting "All Groups" or clearing the search.`
                        : "Click below to add your first product to your seller catalog."}
                    </p>
                    <button
                      className="btn-primary"
                      style={{ width: 'auto', margin: '0 auto', padding: '0.65rem 1.25rem', fontSize: '0.88rem' }}
                      onClick={handleOpenAddProduct}
                    >
                      <Plus size={16} />
                      <span>Add New Product Now</span>
                    </button>
                  </div>
                ) : (
                  <div className="product-card-grid">
                    {filteredProducts.map((product) => {
                      const extraList = Array.isArray(product.extraImageUrls)
                        ? product.extraImageUrls.filter(Boolean)
                        : (typeof product.extraImageUrls === 'string'
                            ? product.extraImageUrls.split(/[,\n]+/).map(s => s.trim()).filter(Boolean)
                            : []);
                      const allImgs = product.imageUrl ? [product.imageUrl, ...extraList] : extraList;

                      return (
                        <div key={product.id} className="product-card">

                          <div>
                            {/* Full Uncropped Product Image with Click-to-Expand Lightbox */}
                            {product.imageUrl && (
                              <div
                                onClick={() => setPreviewImageModal({
                                  url: product.imageUrl,
                                  title: product.name,
                                  group: product.group || product.category || 'General',
                                  allImages: allImgs,
                                  activeIndex: 0
                                })}
                                style={{
                                  width: '100%',
                                  height: '210px',
                                  borderRadius: 'var(--radius-md)',
                                  overflow: 'hidden',
                                  marginBottom: '0.85rem',
                                  position: 'relative',
                                  border: '1px solid var(--glass-border)',
                                  background: 'rgba(15, 23, 42, 0.4)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                                title="Click to view full uncropped image"
                              >
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  style={{
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    objectFit: 'contain',
                                    transition: 'transform 0.25s ease'
                                  }}
                                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop'; }}
                                />
                                {/* View Full Image Badge Overlay */}
                                <div style={{
                                  position: 'absolute',
                                  bottom: '8px',
                                  right: '8px',
                                  background: 'rgba(0, 0, 0, 0.72)',
                                  backdropFilter: 'blur(4px)',
                                  color: '#ffffff',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.7rem',
                                  fontWeight: '600',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  pointerEvents: 'none'
                                }}>
                                  <Eye size={12} />
                                  <span>Full Image</span>
                                  {extraList.length > 0 && <span>(+{extraList.length})</span>}
                                </div>
                              </div>
                            )}

                            {/* Card Header & Product Name */}
                            <div className="product-card-header">
                              <div>
                                <div style={{ marginBottom: '4px' }}>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.7rem',
                                    fontWeight: '700',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: 'rgba(6, 182, 212, 0.12)',
                                    color: 'var(--accent-cyan)',
                                    border: '1px solid rgba(6, 182, 212, 0.25)'
                                  }}>
                                    <Tag size={11} />
                                    {product.group || product.category || 'General'}
                                  </span>
                                </div>
                                <h3 className="product-title">{product.name}</h3>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <button
                                  onClick={() => handleOpenEditProduct(product)}
                                  style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', padding: '0.2rem' }}
                                  title="Edit Product in Catalog"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(product.id)}
                                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
                                  title="Delete Product"
                                >
                                  <Trash2 size={16} style={{ color: 'var(--accent-rose)' }} />
                                </button>
                              </div>
                            </div>

                            {/* Price & Unit Box */}
                            <div className="product-price-box">
                              <div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Price</div>
                                <div className="product-price-val">{product.price}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pricing Unit</div>
                                <div className="product-stock-val">{product.unit || 'per unit'}</div>
                              </div>
                            </div>

                            {/* Description */}
                            <div className="product-specs-list" style={{ marginBottom: '0.6rem' }}>
                              <strong style={{ color: 'var(--text-primary)' }}>Description: </strong>
                              {product.description}
                            </div>

                            {/* Technical Specifications */}
                            {product.specs && (
                              <div style={{ background: 'var(--input-bg)', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)' }}>
                                <strong style={{ color: 'var(--accent-cyan)', display: 'block', marginBottom: '2px' }}>Technical Specifications:</strong>
                                {product.specs}
                              </div>
                            )}

                            {/* PDF Brochure Badge */}
                            {product.pdfUrl && (
                              <div style={{ marginTop: '0.65rem', padding: '0.45rem 0.75rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <FileText size={15} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-primary)' }}>PDF Brochure Attached</span>
                                <a
                                  href={product.pdfUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--accent-cyan)', textDecoration: 'underline', fontWeight: '600' }}
                                >
                                  View PDF
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Footer */}
                          <div className="product-card-footer" style={{ marginTop: '1.25rem' }}>
                            <span className="score-badge score-high" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}>
                              <CheckCircle2 size={13} /> Active Catalog Item
                            </span>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 4: SENT REPLIES TAB */}
          {activeTab === 'sent-replies' && (
            <div>
              <div className="section-panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <Send size={24} style={{ color: 'var(--accent-cyan)' }} />
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>Sent Auto-Replies ({sentReplies.length})</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '400' }}>
                        Log of all auto-reply emails dispatched by the CRM engine
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {sentReplies.length > 0 && (
                      <button
                        className="btn-secondary"
                        style={{
                          width: 'auto',
                          padding: '0.55rem 1rem',
                          fontSize: '0.82rem',
                          color: '#f43f5e',
                          borderColor: 'rgba(244, 63, 94, 0.35)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                        onClick={handleClearAllSentReplies}
                        title="Clear all sent reply logs from website & database"
                      >
                        <Trash2 size={15} />
                        <span>Clear All History</span>
                      </button>
                    )}
                    <button
                      className="btn-secondary"
                      style={{ width: 'auto', padding: '0.55rem 1rem', fontSize: '0.82rem' }}
                      onClick={() => fetch(`${getBackendApiUrl()}/api/sent-replies`).then(r => r.json()).then(d => setSentReplies(d.replies || [])).catch(() => {})}
                    >
                      <CheckCircle2 size={15} />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                {sentReplies.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: 'var(--glass-bg)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--glass-border)', marginTop: '1.25rem' }}>
                    <Send size={42} style={{ color: 'var(--text-muted)', marginBottom: '0.85rem' }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>No Replies Sent Yet</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto' }}>
                      Auto-reply emails will appear here after the CRM engine processes incoming enquiries.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem' }}>
                    {sentReplies.map((reply, idx) => (
                      <div key={idx} style={{
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem 1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}>
                        {/* Reply Header Row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                            <span className="score-badge score-high" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}>
                              <CheckCircle2 size={12} /> Sent
                            </span>
                            <span style={{ fontWeight: '700', color: 'var(--accent-cyan)', fontSize: '0.9rem' }}>
                              {reply.buyerName || 'Buyer'}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>→</span>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{reply.to}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                              <Clock size={13} />
                              {new Date(reply.sentAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteSentReply(reply, idx)}
                              title="Delete this sent reply record"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '4px 6px',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                transition: 'color 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.color = '#f43f5e'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Reply Details */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <div style={{ background: 'var(--input-bg)', borderRadius: '8px', padding: '0.5rem 0.75rem', border: '1px solid var(--glass-border)' }}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '2px' }}>PRODUCT ENQUIRED</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{reply.productName || '—'}</div>
                          </div>
                          {reply.matchedProductName && (
                            <div style={{ background: 'rgba(16,185,129,0.07)', borderRadius: '8px', padding: '0.5rem 0.75rem', border: '1px solid rgba(16,185,129,0.2)' }}>
                              <div style={{ fontSize: '0.68rem', color: 'var(--accent-emerald)', marginBottom: '2px' }}>CATALOG MATCH SENT</div>
                              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{reply.matchedProductName}</div>
                            </div>
                          )}
                          <div style={{ background: 'var(--input-bg)', borderRadius: '8px', padding: '0.5rem 0.75rem', border: '1px solid var(--glass-border)' }}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '2px' }}>ORDER VALUE</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--accent-emerald)' }}>{reply.orderValue || '—'}</div>
                          </div>
                          <div style={{ background: 'var(--input-bg)', borderRadius: '8px', padding: '0.5rem 0.75rem', border: '1px solid var(--glass-border)' }}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '2px' }}>IMAGES EMBEDDED</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: reply.imageCount > 0 ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                              {reply.imageCount > 0 ? `${reply.imageCount} image${reply.imageCount > 1 ? 's' : ''}` : 'None'}
                            </div>
                          </div>
                        </div>

                        {/* Subject line */}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--glass-border)', paddingTop: '0.5rem', marginTop: '0.1rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Subject: </span>{reply.subject}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ADD / EDIT PRODUCT FORM MODAL */}
      {isAddProductModalOpen && (
        <div className="modal-backdrop" onClick={() => { setIsAddProductModalOpen(false); setEditingProduct(null); }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Package className="text-emerald-400" size={24} style={{ color: 'var(--accent-emerald)' }} />
                <div>
                  <h3 className="modal-title" style={{ fontSize: '1.2rem' }}>
                    {editingProduct ? 'Edit Catalog Product' : 'Add New Product'}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {editingProduct
                      ? 'Update product specifications, brochure PDF, price and photos'
                      : 'Enter product details, brochure PDF, and photos to showcase to buyers'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setIsAddProductModalOpen(false); setEditingProduct(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Notification Alert */}
            {productFormNotice && (
              <div className={`alert-box ${productFormNotice.type}`}>
                {productFormNotice.text}
              </div>
            )}

            <form onSubmit={handleAddProductSubmit}>

              {/* 1. Product Name */}
              <div className="form-group">
                <label className="form-label">1. Product Name *</label>
                <div className="input-container">
                  <Package size={16} className="input-icon" />
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Industrial Water Pump 5HP"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  />
                </div>
              </div>

              {/* 2. Product Group / Category */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Tag size={16} style={{ color: 'var(--accent-cyan)' }} />
                    <span>2. Product Group / Category *</span>
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Categorize your products</span>
                </label>
                <div className="input-container">
                  <Tag size={16} className="input-icon" />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Industrial Paints, Thinners, Coatings, Solvents, Machinery"
                    value={newProduct.group || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, group: e.target.value })}
                  />
                </div>
                {/* Group Quick Presets */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '0.5rem' }}>
                  {['Industrial Paints', 'Primers & Coats', 'Thinners & Solvents', 'Epoxy Coatings', 'Machinery & Tools', 'Chemicals'].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewProduct({ ...newProduct, group: preset })}
                      style={{
                        fontSize: '0.72rem',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        border: (newProduct.group || '').toLowerCase() === preset.toLowerCase() ? '1px solid var(--accent-cyan)' : '1px solid var(--glass-border)',
                        background: (newProduct.group || '').toLowerCase() === preset.toLowerCase() ? 'rgba(6, 182, 212, 0.18)' : 'var(--input-bg)',
                        color: (newProduct.group || '').toLowerCase() === preset.toLowerCase() ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3 & 4. Price & Pricing Unit Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* 3. Price */}
                <div className="form-group">
                  <label className="form-label">3. Price (INR / Currency) *</label>
                  <div className="input-container">
                    <DollarSign size={16} className="input-icon" />
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. ₹25,000"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    />
                  </div>
                </div>

                {/* 4. Pricing Unit */}
                <div className="form-group">
                  <label className="form-label">4. Pricing Unit</label>
                  <div className="input-container">
                    <Tag size={16} className="input-icon" />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. per unit / per set"
                      value={newProduct.unit}
                      onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* 4. Product Image URL */}
              <div className="form-group">
                <label className="form-label">4. Main Product Image URL</label>
                <div className="input-container">
                  <Image size={16} className="input-icon" />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Paste image URL (e.g. https://domain.com/photo.jpg)"
                    value={newProduct.imageUrl}
                    onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                  />
                </div>

                {/* Helpful Photo Upload Guidance Box */}
                <div style={{ marginTop: '0.65rem', padding: '0.65rem 0.85rem', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  <strong style={{ color: 'var(--accent-cyan)', display: 'block', marginBottom: '3px' }}>📸 How to get an Image URL by uploading a photo:</strong>
                  <ol style={{ margin: '0 0 0 1.1rem', padding: 0 }}>
                    <li>Open a free instant image host: <a href="https://imgbb.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-emerald)', fontWeight: 'bold' }}>ImgBB.com</a> or <a href="https://postimages.org" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-emerald)', fontWeight: 'bold' }}>Postimages.org</a></li>
                    <li>Upload your product photo from your phone or computer.</li>
                    <li>Copy the <strong>"Direct Link"</strong> (ends with <code>.jpg</code> or <code>.png</code>) and paste it into the field above!</li>
                  </ol>
                </div>
              </div>

              {/* 4b. Extra Product Images */}
              <div className="form-group">
                <label className="form-label">4b. Additional Product Images (Optional)</label>
                <textarea
                  className="form-input"
                  style={{ paddingLeft: '1rem', minHeight: '70px', resize: 'vertical', fontFamily: 'inherit' }}
                  placeholder={`Paste extra image URLs, one per line or comma-separated:\nhttps://example.com/photo2.jpg\nhttps://example.com/photo3.jpg`}
                  value={newProduct.extraImageUrls}
                  onChange={(e) => setNewProduct({ ...newProduct, extraImageUrls: e.target.value })}
                />
                <div style={{ marginTop: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  All images will be embedded in the reply email sent to buyers.
                </div>
              </div>

              {/* 4c. Product Catalog / Brochure PDF URL */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={16} style={{ color: 'var(--accent-emerald)' }} />
                  <span>4c. Product Brochure / Catalogue PDF Link (Sent with Email)</span>
                </label>
                <div className="input-container">
                  <FileText size={16} className="input-icon" />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Paste PDF link (e.g. Google Drive link, Dropbox, or any .pdf URL)"
                    value={newProduct.pdfUrl || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, pdfUrl: e.target.value })}
                  />
                </div>
                <div style={{ marginTop: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  📄 When an inquiry is received for this product, this PDF brochure will be automatically downloaded and attached to the auto-reply email!
                </div>
              </div>

              {/* 5. Technical Specifications */}
              <div className="form-group">
                <label className="form-label">5. Technical Specifications</label>
                <div className="input-container">
                  <Sliders size={16} className="input-icon" />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Flow rate: 500 LPM, Head max: 40m, Power: 5HP"
                    value={newProduct.specs}
                    onChange={(e) => setNewProduct({ ...newProduct, specs: e.target.value })}
                  />
                </div>
              </div>

              {/* 6. Description */}
              <div className="form-group">
                <label className="form-label">6. Description</label>
                <textarea
                  className="form-input"
                  style={{ paddingLeft: '1rem', minHeight: '80px', resize: 'vertical' }}
                  placeholder="Enter detailed features and description of the product..."
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.85rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setIsAddProductModalOpen(false); setEditingProduct(null); }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmittingProduct}
                >
                  {isSubmittingProduct ? (
                    <>
                      <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                      <span>Saving Product...</span>
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      <span>{editingProduct ? 'Update Product in Catalog' : 'Save Product to Catalog'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL PRODUCT REQUEST DETAILS MODAL */}
      {activeInquiryModal && (
        <div className="modal-backdrop" onClick={() => setActiveInquiryModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>

            {/* Modal Top Bar */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Package className="text-cyan-400" size={24} style={{ color: 'var(--accent-cyan)' }} />
                <div>
                  <h3 className="modal-title" style={{ fontSize: '1.2rem' }}>Product Request Details</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Query ID: <span style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>{activeInquiryModal.query_id}</span> • Source: {activeInquiryModal.lead_source || 'Email Ingestion'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => handleDeleteInquiry(activeInquiryModal.id || activeInquiryModal.query_id, activeInquiryModal)}
                  className="btn-secondary"
                  style={{
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.8rem',
                    color: 'var(--accent-rose)',
                    borderColor: 'rgba(244, 63, 94, 0.4)'
                  }}
                  title="Delete Product Request"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
                <button
                  onClick={() => setActiveInquiryModal(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Modal Body: Structured Fields One by One */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Status Badges Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {activeInquiryModal.status?.is_verified && (
                  <span className="score-badge score-high" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <BadgeCheck size={14} /> Verified Buyer Inquiry
                  </span>
                )}
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={13} /> Received: {new Date(activeInquiryModal.timestamp).toLocaleString()}
                </span>
              </div>

              {/* DEDICATED AUTOMATED WHATSAPP TEMPLATE STATUS CARD */}
              <div style={{ background: activeInquiryModal.whatsappStatus?.sent ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)', padding: '1.1rem 1.25rem', borderRadius: 'var(--radius-md)', border: `1px solid ${activeInquiryModal.whatsappStatus?.sent ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}` }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: activeInquiryModal.whatsappStatus?.sent ? 'var(--accent-emerald)' : 'var(--accent-rose)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {activeInquiryModal.whatsappStatus?.sent ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                  <span>Automated WhatsApp Business Template Status</span>
                </div>

                {activeInquiryModal.whatsappStatus?.sent ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                      ✅ WhatsApp Template Auto-Sent Successfully
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      • <strong>Meta Template:</strong> <code>{activeInquiryModal.whatsappStatus?.templateName || 'buyer_inquiry_reply'}</code><br />
                      • <strong>Matched Catalog Item:</strong> {activeInquiryModal.whatsappStatus?.matchedProduct}<br />
                      • <strong>Price Delivered:</strong> <span style={{ color: 'var(--accent-emerald)', fontWeight: 'bold' }}>{activeInquiryModal.whatsappStatus?.priceSent}</span><br />
                      • <strong>Technical Specs Delivered:</strong> {activeInquiryModal.whatsappStatus?.specsSent}
                    </div>
                    {activeInquiryModal.whatsappStatus?.photoSent && (
                      <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <img src={activeInquiryModal.whatsappStatus.photoSent} alt="Sent photo" style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--glass-border)' }} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>📸 Catalog photo delivered to buyer's WhatsApp</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    🛑 <strong>Auto-Reply Status: BLOCKED (NO CATALOG MATCH)</strong><br />
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-rose)', display: 'block', marginTop: '4px' }}>
                      {activeInquiryModal.whatsappStatus?.reason || "The product requested by the buyer is not listed in your seller catalog. Automated WhatsApp response was blocked to prevent sending wrong details."}
                    </span>
                  </div>
                )}
              </div>

              {/* 1. PRODUCT DETAILS SECTION */}
              <div style={{ background: 'var(--glass-bg)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-cyan)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Package size={16} />
                  <span>Product & Order Specification</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.85rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Product Name</div>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{activeInquiryModal.product?.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-secondary)' }}>{activeInquiryModal.product?.category}</div>
                  </div>
                </div>

                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Required Quantity</div>
                  <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--accent-emerald)' }}>{activeInquiryModal.product?.quantity}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Requirement Details / Buyer Notes</div>
                  <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--glass-border)', fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                    "{activeInquiryModal.product?.requirement_details}"
                  </div>
                </div>
              </div>

              {/* INDIAMART SPECIFIC DETAILS CARD (if available) */}
              {(activeInquiryModal.product?.grade || activeInquiryModal.product?.orderValue || activeInquiryModal.buyer?.productsOfInterest || (activeInquiryModal.enquiredProductsList && activeInquiryModal.enquiredProductsList.length > 0)) && (
                <div style={{ background: 'rgba(56, 189, 248, 0.06)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-cyan)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Mail size={16} />
                    <span>IndiaMART Requirement &amp; Buyer Intelligence</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.85rem' }}>
                    {activeInquiryModal.product?.grade && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Grade</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>{activeInquiryModal.product.grade}</div>
                      </div>
                    )}
                    {activeInquiryModal.product?.orderValue && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Probable Order Value</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--accent-emerald)' }}>{activeInquiryModal.product.orderValue}</div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.85rem' }}>
                    {activeInquiryModal.product?.requirementType && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Requirement Type</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{activeInquiryModal.product.requirementType}</div>
                      </div>
                    )}
                    {activeInquiryModal.buyer?.memberSince && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Member Since</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{activeInquiryModal.buyer.memberSince}</div>
                      </div>
                    )}
                  </div>

                  {activeInquiryModal.buyer?.productsOfInterest && (
                    <div style={{ marginBottom: '0.85rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Products of Interest</div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--accent-cyan)', fontWeight: '600', marginTop: '2px' }}>
                        {activeInquiryModal.buyer.productsOfInterest}
                      </div>
                    </div>
                  )}

                  {activeInquiryModal.enquiredProductsList && activeInquiryModal.enquiredProductsList.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Products Enquired by Buyer:</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {activeInquiryModal.enquiredProductsList.map((item, idx) => (
                          <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--glass-border)', fontSize: '0.82rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Tag size={13} style={{ color: 'var(--accent-amber)' }} />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2. BUYER (CUSTOMER) DETAILS SECTION */}
              <div style={{ background: 'var(--glass-bg)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Building2 size={16} />
                  <span>Buyer Information</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.85rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Buyer Name</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>{activeInquiryModal.buyer?.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Company Name</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-secondary)' }}>{activeInquiryModal.buyer?.company}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.85rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phone Number</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Phone size={14} />
                      <span>{activeInquiryModal.buyer?.phone}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email Address</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Mail size={14} />
                      <span>{activeInquiryModal.buyer?.email}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Buyer Location</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
                    <MapPin size={14} style={{ color: 'var(--accent-amber)' }} />
                    <span>{activeInquiryModal.buyer?.location?.city}, {activeInquiryModal.buyer?.location?.state}, {activeInquiryModal.buyer?.location?.country}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}



      {/* FULL PRODUCT IMAGE LIGHTBOX MODAL */}
      {previewImageModal && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 1200, background: 'rgba(0, 0, 0, 0.88)', backdropFilter: 'blur(8px)' }}
          onClick={() => setPreviewImageModal(null)}
        >
          <div
            style={{
              maxWidth: '92vw',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1.1rem',
              background: 'rgba(15, 23, 42, 0.95)',
              color: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Image size={18} style={{ color: 'var(--accent-cyan)' }} />
                <span style={{ fontWeight: '700', fontSize: '0.98rem' }}>{previewImageModal.title}</span>
                {previewImageModal.group && (
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: 'rgba(6, 182, 212, 0.2)',
                    color: 'var(--accent-cyan)',
                    border: '1px solid rgba(6, 182, 212, 0.3)'
                  }}>
                    {previewImageModal.group}
                  </span>
                )}
                {previewImageModal.allImages?.length > 1 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ({previewImageModal.activeIndex + 1} of {previewImageModal.allImages.length})
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <a
                  href={previewImageModal.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: '600' }}
                >
                  Open Original &nearr;
                </a>
                <button
                  onClick={() => setPreviewImageModal(null)}
                  style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                  title="Close Full Image View"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Main Full Image View Area */}
            <div style={{
              background: '#020617',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              maxHeight: '74vh',
              overflow: 'hidden'
            }}>
              <img
                src={previewImageModal.url}
                alt={previewImageModal.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: '6px'
                }}
              />
            </div>

            {/* Thumbnail Switcher (if product has multiple images) */}
            {previewImageModal.allImages?.length > 1 && (
              <div style={{
                width: '100%',
                display: 'flex',
                gap: '8px',
                padding: '0.65rem 1rem',
                background: 'rgba(15, 23, 42, 0.95)',
                overflowX: 'auto',
                justifyContent: 'center'
              }}>
                {previewImageModal.allImages.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt=""
                    onClick={() => setPreviewImageModal({ ...previewImageModal, url: img, activeIndex: idx })}
                    style={{
                      width: '50px',
                      height: '50px',
                      objectFit: 'cover',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: previewImageModal.activeIndex === idx ? '2px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.2)',
                      opacity: previewImageModal.activeIndex === idx ? 1 : 0.6
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* API Settings Modal */}
      <ApiSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          loadDashboardData();
        }}
        user={user}
        onDataCleared={() => setInquiries([])}
      />
    </div>
  );
};

export default CrmDashboard;
