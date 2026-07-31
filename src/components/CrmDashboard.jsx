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
  Power
} from 'lucide-react';
import { 
  logoutUser, 
  fetchApiSettingsFromFirestore, 
  saveApiSettingsToFirestore,
  fetchLeadsFromFirestore,
  saveProductToFirestore,
  fetchProductsFromFirestore,
  deleteProductFromFirestore
} from '../firebaseConfig';
import ApiSettingsModal from './ApiSettingsModal';

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
  const [indiamartKey, setIndiamartKey] = useState('');
  const [whatsappToken, setWhatsappToken] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');

  // Search Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');

  // Selected Inquiry Modal
  const [activeInquiryModal, setActiveInquiryModal] = useState(null);

  // Initial Sample Seller Products Catalog
  const defaultSampleProducts = [
    {
      id: "prod-demo-1",
      name: "Industrial Water Pump 5HP",
      price: "₹24,500",
      unit: "per unit",
      imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop",
      description: "High-efficiency heavy duty three phase centrifugal pump designed for industrial continuous operation.",
      specs: "Flow rate: 500 LPM, Head max: 40m, Power: 5HP 415V"
    },
    {
      id: "prod-demo-2",
      name: "Heavy Duty CNC Lathe Machine",
      price: "₹4,85,000",
      unit: "per set",
      imageUrl: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop",
      description: "Precision CNC turning lathe machine with Siemens controller for high torque metal machining.",
      specs: "Swing over bed: 400mm, Max turning length: 1000mm, Spindle speed: 3000 RPM"
    },
    {
      id: "prod-demo-3",
      name: "Automated Control Panel 3-Phase",
      price: "₹38,000",
      unit: "per panel",
      imageUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop",
      description: "Digital star-delta starter panel with over-voltage and phase failure protection.",
      specs: "Voltage: 415V AC, Rating: 50HP, Enclosure: IP65 Outdoor"
    }
  ];

  // Demo Buyer Inquiries illustrating Automated WhatsApp Business Template Replies
  const sampleInquiriesData = [
    {
      id: "im-lead-1",
      query_id: "IMQ123456789",
      timestamp: new Date().toISOString(),
      buyer: {
        name: "Rahul Sharma",
        company: "Sharma Enterprises",
        email: "rahul.sharma@example.com",
        phone: "+91-9876543210",
        location: { city: "Delhi", state: "Delhi", country: "India" }
      },
      product: {
        name: "Industrial Water Pump 5HP",
        category: "Pumps & Motors",
        quantity: "10 units",
        requirement_details: "Need heavy duty 3-phase pump for factory installation."
      },
      lead_source: "IndiaMART Push API",
      status: { is_new: true, is_verified: true },
      whatsappStatus: {
        sent: true,
        sentAt: new Date().toISOString(),
        templateName: "buyer_inquiry_reply",
        matchedProduct: "Industrial Water Pump 5HP",
        priceSent: "₹24,500",
        photoSent: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop",
        specsSent: "Flow rate: 500 LPM, Head max: 40m, Power: 5HP 415V"
      }
    },
    {
      id: "im-lead-2",
      query_id: "IMQ987654321",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      buyer: {
        name: "Vikram Mehta",
        company: "Mehta Auto Components",
        email: "vikram@mehtaauto.com",
        phone: "+91-9871122334",
        location: { city: "Pune", state: "Maharashtra", country: "India" }
      },
      product: {
        name: "High Speed Hydraulic Press 50 Ton",
        category: "Industrial Machinery",
        quantity: "2 units",
        requirement_details: "Looking for 50T hydraulic press machine with automatic feeder."
      },
      lead_source: "IndiaMART Push API",
      status: { is_new: true, is_verified: true },
      whatsappStatus: {
        sent: false,
        reason: "Product requested ('High Speed Hydraulic Press 50 Ton') is not listed in seller catalog. Auto-reply was automatically blocked to prevent sending wrong details."
      }
    }
  ];

  // Ingested Product Inquiries State
  const [inquiries, setInquiries] = useState(sampleInquiriesData);
  const [isLoading, setIsLoading] = useState(true);

  // Seller Products State
  const [products, setProducts] = useState(defaultSampleProducts);
  const [isProductsLoading, setIsProductsLoading] = useState(true);

  // Add New Product Form State
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [productFormNotice, setProductFormNotice] = useState(null);

  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    unit: 'per unit',
    imageUrl: '',
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

    setIndiamartKey(localStorage.getItem('indiamart_api_key') || '');
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
        if (settingsRes.data.indiamartKey !== undefined) setIndiamartKey(settingsRes.data.indiamartKey);
        if (settingsRes.data.whatsappToken !== undefined) setWhatsappToken(settingsRes.data.whatsappToken);
        if (settingsRes.data.whatsappPhoneId !== undefined) setWhatsappPhoneId(settingsRes.data.whatsappPhoneId);
        if (settingsRes.data.isAutoReplyEnabled !== undefined) {
          setIsAutoReplyEnabled(settingsRes.data.isAutoReplyEnabled);
          localStorage.setItem('is_auto_reply_enabled', String(settingsRes.data.isAutoReplyEnabled));
        }
      }

      // 2. Fetch Buyer Product Requests
      const leadsRes = await fetchLeadsFromFirestore(user.uid);
      if (leadsRes.success) {
        if (leadsRes.leads && leadsRes.leads.length > 0) {
          setInquiries(leadsRes.leads);
        } else {
          setInquiries(sampleInquiriesData);
        }
      }

      // 3. Fetch Seller Products Catalog
      const prodRes = await fetchProductsFromFirestore(user.uid);
      if (prodRes.success) {
        if (prodRes.products && prodRes.products.length > 0) {
          setProducts(prodRes.products);
          localStorage.setItem(storageInitKey, 'true');
        } else if (hasInitialized === 'true') {
          setProducts([]);
        } else {
          const seededProducts = [];
          for (const demoProd of defaultSampleProducts) {
            const { id, ...prodData } = demoProd;
            const seedRes = await saveProductToFirestore(user.uid, prodData);
            if (seedRes.success) {
              seededProducts.push({ id: seedRes.id, ...prodData });
            } else {
              seededProducts.push(demoProd);
            }
          }
          localStorage.setItem(storageInitKey, 'true');
          setProducts(seededProducts);
        }
      }
    } else {
      setInquiries(sampleInquiriesData);
      setProducts(defaultSampleProducts);
    }

    setIsLoading(false);
    setIsProductsLoading(false);
  };

  useEffect(() => {
    loadDashboardData();
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

  // Add Product Submit Handler
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
      price: newProduct.price.startsWith('₹') || newProduct.price.startsWith('$') ? newProduct.price.trim() : `₹${newProduct.price.trim()}`,
      unit: newProduct.unit.trim() || 'per unit',
      imageUrl: newProduct.imageUrl.trim() || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop',
      description: newProduct.description.trim() || 'No description provided.',
      specs: newProduct.specs.trim() || 'Standard Specifications',
      updatedAt: new Date().toISOString()
    };

    let result = { success: true, id: `local-prod-${Date.now()}` };
    if (user && user.uid) {
      result = await saveProductToFirestore(user.uid, productPayload);
      localStorage.setItem(`products_initialized_${user.uid}`, 'true');
    }

    if (result.success) {
      const addedProduct = { id: result.id, ...productPayload };
      setProducts(prev => [addedProduct, ...prev]);

      setProductFormNotice({ type: 'success', text: 'Product added successfully!' });
      setTimeout(() => {
        setIsAddProductModalOpen(false);
        setProductFormNotice(null);
        setNewProduct({
          name: '',
          price: '',
          unit: 'per unit',
          imageUrl: '',
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

  // Filter seller products
  const filteredProducts = products.filter((item) => {
    if (!productSearchQuery.trim()) return true;
    const q = productSearchQuery.toLowerCase().trim();
    const name = item.name?.toLowerCase() || '';
    const specs = item.specs?.toLowerCase() || '';
    const description = item.description?.toLowerCase() || '';

    return name.includes(q) || specs.includes(q) || description.includes(q);
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
                  className={`sidebar-nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => {
                    setIsSettingsOpen(true);
                    setIsMobileSidebarOpen(false);
                  }}
                >
                  <Settings size={18} />
                  <span>API Settings</span>
                  {(!indiamartKey || !whatsappToken) && (
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
                    Automated catalog matching and WhatsApp Business API responses for IndiaMart buyer requests.
                  </p>
                </div>

                {/* Master Auto-Reply Status Control Card */}
                <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Auto-Reply Engine</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '800', color: isAutoReplyEnabled ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                      {isAutoReplyEnabled ? "🟢 ACTIVE (RUNNING)" : "🔴 STOPPED (PAUSED)"}
                    </div>
                  </div>

                  <button
                    onClick={toggleAutoReplySystem}
                    className={isAutoReplyEnabled ? "btn-secondary" : "btn-primary"}
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.82rem',
                      width: 'auto',
                      borderColor: isAutoReplyEnabled ? 'var(--accent-rose)' : 'none',
                      color: isAutoReplyEnabled ? 'var(--accent-rose)' : '#fff',
                      background: isAutoReplyEnabled ? 'rgba(244, 63, 94, 0.12)' : 'linear-gradient(135deg, var(--accent-emerald), #059669)'
                    }}
                  >
                    {isAutoReplyEnabled ? (
                      <>
                        <Pause size={15} />
                        <span>STOP AUTO-REPLY</span>
                      </>
                    ) : (
                      <>
                        <Play size={15} />
                        <span>START AUTO-REPLY</span>
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
                    <div className="kpi-label">IndiaMart Requests</div>
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
                  <div className="kpi-icon-box" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)' }}>
                    <Cpu size={24} />
                  </div>
                  <div>
                    <div className="kpi-val" style={{ fontSize: '1.2rem', color: indiamartKey ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                      {indiamartKey ? 'Connected' : 'Missing Key'}
                    </div>
                    <div className="kpi-label">IndiaMart Push API</div>
                    <div className="kpi-trend neutral">
                      {indiamartKey ? '● Real-Time Sync' : '⚠ Action Required'}
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
                      <ShoppingBag size={20} style={{ color: 'var(--accent-cyan)' }} />
                      <span>Recent IndiaMart Buyer Inquiries</span>
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
                    {inquiries.slice(0, 3).map((inquiry) => {
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
                    })}
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
                    {products.slice(0, 3).map(prod => (
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
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* VIEW 2: PRODUCT REQUESTS (INDIAMART) TAB */}
          {activeTab === 'requests' && (
            <div className="section-panel">
              <div className="panel-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <div className="panel-title">
                  <ShoppingBag size={22} style={{ color: 'var(--accent-cyan)' }} />
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>IndiaMart Product Requests ({filteredInquiries.length})</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '400' }}>
                      Automated Catalog Matching &amp; WhatsApp Business Template Dispatch Status
                    </div>
                  </div>
                </div>

                {/* Search Input Bar */}
                <div className="input-container" style={{ width: '280px' }}>
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
              </div>

              {/* Notice if Auto-Reply System is Stopped */}
              {!isAutoReplyEnabled && (
                <div style={{ marginTop: '1.25rem', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.85rem 1.1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--accent-rose)', fontSize: '0.85rem', fontWeight: '700' }}>
                    <AlertTriangle size={18} />
                    <span>Auto-Reply System is currently STOPPED. Incoming IndiaMart leads will NOT receive automated WhatsApp replies.</span>
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
                      : "Incoming buyer inquiries from IndiaMart will automatically appear here."}
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
                      onClick={() => setIsAddProductModalOpen(true)}
                    >
                      <Plus size={18} />
                      <span>Add New Product</span>
                    </button>
                  </div>
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
                      {productSearchQuery.trim() ? "No matching products found" : "No Products Added Yet"}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.25rem auto' }}>
                      {productSearchQuery.trim()
                        ? `No products match "${productSearchQuery}". Try another keyword or clear the search.`
                        : "Click below to add your first product to your seller catalog."}
                    </p>
                    <button
                      className="btn-primary"
                      style={{ width: 'auto', margin: '0 auto', padding: '0.65rem 1.25rem', fontSize: '0.88rem' }}
                      onClick={() => setIsAddProductModalOpen(true)}
                    >
                      <Plus size={16} />
                      <span>Add New Product Now</span>
                    </button>
                  </div>
                ) : (
                  <div className="product-card-grid">
                    {filteredProducts.map((product) => (
                      <div key={product.id} className="product-card">
                        
                        <div>
                          {/* Product Image Thumbnail Preview */}
                          {product.imageUrl && (
                            <div style={{ width: '100%', height: '160px', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '0.85rem', position: 'relative', border: '1px solid var(--glass-border)' }}>
                              <img 
                                src={product.imageUrl} 
                                alt={product.name} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop'; }}
                              />
                            </div>
                          )}

                          {/* Card Header & Product Name */}
                          <div className="product-card-header">
                            <div>
                              <h3 className="product-title">{product.name}</h3>
                            </div>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
                              title="Delete Product"
                            >
                              <Trash2 size={16} style={{ color: 'var(--accent-rose)' }} />
                            </button>
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
                        </div>

                        {/* Footer */}
                        <div className="product-card-footer" style={{ marginTop: '1.25rem' }}>
                          <span className="score-badge score-high" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}>
                            <CheckCircle2 size={13} /> Active Catalog Item
                          </span>
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

      {/* ADD NEW PRODUCT FORM MODAL */}
      {isAddProductModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddProductModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Package className="text-emerald-400" size={24} style={{ color: 'var(--accent-emerald)' }} />
                <div>
                  <h3 className="modal-title" style={{ fontSize: '1.2rem' }}>Add New Product</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Enter product details and select a product image
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsAddProductModalOpen(false)}
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

              {/* 2 & 3. Price & Pricing Unit Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* 2. Price */}
                <div className="form-group">
                  <label className="form-label">2. Price (INR / Currency) *</label>
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

                {/* 3. Pricing Unit */}
                <div className="form-group">
                  <label className="form-label">3. Pricing Unit</label>
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
                <label className="form-label">4. Product Image URL / Photo Link</label>
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
                  onClick={() => setIsAddProductModalOpen(false)}
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
                      <span>Save Product to Catalog</span>
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
                    Query ID: <span style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>{activeInquiryModal.query_id}</span> • Source: {activeInquiryModal.lead_source || 'IndiaMART'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveInquiryModal(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
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

      {/* API Settings Modal */}
      <ApiSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        onDataCleared={() => setInquiries([])}
      />
    </div>
  );
};

export default CrmDashboard;
